import type { File, Task, TaskEventPack, TaskResultPack, TestAnnotation } from '@vitest/runner'
import type { SerializedError } from '@vitest/utils'
import type { IncomingMessage } from 'node:http'
import type { ViteDevServer } from 'vite'
import type { WebSocket } from 'ws'
import type { Vitest } from '../node/core'
import type { TestCase, TestModule } from '../node/reporters/reported-tasks'
import type { TestSpecification } from '../node/spec'
import type { Reporter } from '../node/types/reporter'
import type { LabelColor, ModuleGraphData, UserConsoleLog } from '../types/general'
import type {
  TransformResultWithSource,
  WebSocketEvents,
  WebSocketHandlers,
  WebSocketRPC,
} from './types'
import { existsSync, promises as fs } from 'node:fs'
import { noop } from '@vitest/utils'
import { createBirpc } from 'birpc'
import { parse, stringify } from 'flatted'
import { WebSocketServer } from 'ws'
import { API_PATH } from '../constants'
import { SnapshotContentStore } from '../snapshot/SnapshotContentStore'
import { getModuleGraph } from '../utils/graph'
import { stringifyReplace } from '../utils/serialization'
import { isValidApiRequest } from './check'

export function setup(ctx: Vitest, _server?: ViteDevServer): void {
  const wss = new WebSocketServer({ noServer: true })

  const clients = new Map<WebSocket, WebSocketRPC>()

  // In-memory storage for snapshot content
  const snapshotContentStore = new SnapshotContentStore()

  const server = _server || ctx.vite

  server.httpServer?.on('upgrade', (request: IncomingMessage, socket, head) => {
    if (!request.url) {
      return
    }

    const { pathname } = new URL(request.url, 'http://localhost')
    if (pathname !== API_PATH) {
      return
    }

    if (!isValidApiRequest(ctx.config, request)) {
      socket.destroy()
      return
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
      setupClient(ws)
    })
  })

  // Expose the snapshot content storage to the context for use by snapshot recording
  if (!ctx.snapshotContentStore) {
    ctx.snapshotContentStore = {
      store: (filepath: string, testName: string, snapshotKey: string, content: { expected: string; actual: string; count: number }) => {
        snapshotContentStore.store(filepath, testName, snapshotKey, content)
      },
      get: (filepath: string, testName: string, snapshotKey: string) => {
        return snapshotContentStore.get(filepath, testName, snapshotKey)
      },
      clear: (filepath: string) => {
        snapshotContentStore.clearForFile(filepath)
      },
    }
  }

  function setupClient(ws: WebSocket) {
    const rpc = createBirpc<WebSocketEvents, WebSocketHandlers>(
      {
        async onTaskUpdate(packs, events) {
          await ctx._testRun.updated(packs, events)
        },
        getFiles() {
          return ctx.state.getFiles()
        },
        getPaths() {
          return ctx.state.getPaths()
        },
        async readTestFile(id) {
          if (!ctx.state.filesMap.has(id) || !existsSync(id)) {
            return null
          }
          return fs.readFile(id, 'utf-8')
        },
        async saveTestFile(id, content) {
          if (!ctx.state.filesMap.has(id) || !existsSync(id)) {
            throw new Error(
              `Test file "${id}" was not registered, so it cannot be updated using the API.`,
            )
          }
          return fs.writeFile(id, content, 'utf-8')
        },
        async rerun(files, resetTestNamePattern) {
          await ctx.rerunFiles(files, undefined, true, resetTestNamePattern)
        },
        async rerunTask(id) {
          await ctx.rerunTask(id)
        },
        getConfig() {
          return ctx.getRootProject().serializedConfig
        },
        getResolvedProjectLabels(): { name: string; color?: LabelColor }[] {
          return ctx.projects.map(p => ({ name: p.name, color: p.color }))
        },
        async getTransformResult(projectName: string, id, browser = false) {
          const project = ctx.getProjectByName(projectName)
          const result: TransformResultWithSource | null | undefined = browser
            ? await project.browser!.vite.transformRequest(id)
            : await project.vite.transformRequest(id)
          if (result) {
            try {
              result.source = result.source || (await fs.readFile(id, 'utf-8'))
            }
            catch {}
            return result
          }
        },
        async getModuleGraph(project, id, browser): Promise<ModuleGraphData> {
          return getModuleGraph(ctx, project, id, browser)
        },
        async updateSnapshot(file?: File) {
          if (!file) {
            await ctx.updateSnapshot()
          }
          else {
            await ctx.updateSnapshot([file.filepath])
          }
        },
        async getSnapshotContent(filepath, testName) {
          try {
            // Find the test files in the state (can be multiple for different projects)
            const files = ctx.state.filesMap.get(filepath)
            if (!files || files.length === 0) {
              return null
            }

            // Search through all files and their tasks to find snapshot invocations
            for (const file of files) {
              const allTasks: Task[] = []
              const collectTasks = (task: Task) => {
                allTasks.push(task)
                if (task.type === 'suite' && task.tasks) {
                  task.tasks.forEach(collectTasks)
                }
              }
              file.tasks?.forEach(collectTasks)

              // Find the test with matching name and look for snapshot invocations
              for (const task of allTasks) {
                if (task.name === testName && task.result?.snapshotMatchers) {
                  const snapshots = task.result.snapshotMatchers
                  if (snapshots.length > 0) {
                    // Use the snapshot metadata to fetch content from in-memory storage only
                    const snapshot = snapshots[0]
                    const key = snapshot.snapshot?.key || `${testName} 1`
                    const count = snapshot.snapshot?.count || 1

                    // Get the snapshot content from in-memory storage
                    if (ctx.snapshotContentStore) {
                      const storedContent = ctx.snapshotContentStore.get(filepath, testName, key)
                      if (storedContent) {
                        return {
                          key,
                          expected: storedContent.expected,
                          actual: storedContent.actual,
                          count: storedContent.count,
                        }
                      }
                    }

                    // Return basic metadata if content not found in memory
                    return {
                      key,
                      expected: '',
                      actual: '',
                      count,
                    }
                  }
                }
              }

              // Fallback: search for any snapshot invocation in any test in the file
              for (const task of allTasks) {
                if (task.result?.snapshotMatchers && task.result.snapshotMatchers.length > 0) {
                  const snapshot = task.result.snapshotMatchers[0]
                  const key = snapshot.snapshot?.key || `${task.name} 1`
                  const count = snapshot.snapshot?.count || 1

                  // Get the snapshot content from in-memory storage
                  if (ctx.snapshotContentStore) {
                    const storedContent = ctx.snapshotContentStore.get(filepath, task.name, key)
                    if (storedContent) {
                      return {
                        key,
                        expected: storedContent.expected,
                        actual: storedContent.actual,
                        count: storedContent.count,
                      }
                    }
                  }

                  // Return basic metadata if content not found in memory
                  return {
                    key,
                    expected: '',
                    actual: '',
                    count,
                  }
                }
              }
            }

            return null
          }
          catch (error) {
            console.error('Error fetching snapshot content from memory:', error)
            return null
          }
        },
        getUnhandledErrors() {
          return ctx.state.getUnhandledErrors()
        },
        async getTestFiles() {
          const spec = await ctx.globTestSpecifications()
          return spec.map(spec => [
            {
              name: spec.project.config.name,
              root: spec.project.config.root,
            },
            spec.moduleId,
            { pool: spec.pool },
          ])
        },
      },
      {
        post: msg => ws.send(msg),
        on: fn => ws.on('message', fn),
        eventNames: [
          'onUserConsoleLog',
          'onFinished',
          'onFinishedReportCoverage',
          'onCollected',
          'onTaskUpdate',
        ],
        serialize: (data: any) => stringify(data, stringifyReplace),
        deserialize: parse,
        timeout: -1,
      },
    )

    clients.set(ws, rpc)

    ws.on('close', () => {
      clients.delete(ws)
      rpc.$close(new Error('[vitest-api]: Pending methods while closing rpc'))
    })
  }

  ctx.reporters.push(new WebSocketReporter(ctx, wss, clients))
}

export class WebSocketReporter implements Reporter {
  constructor(
    public ctx: Vitest,
    public wss: WebSocketServer,
    public clients: Map<WebSocket, WebSocketRPC>,
  ) {}

  onTestModuleCollected(testModule: TestModule): void {
    if (this.clients.size === 0) {
      return
    }

    this.clients.forEach((client) => {
      client.onCollected?.([testModule.task])?.catch?.(noop)
    })
  }

  onTestRunStart(specifications: ReadonlyArray<TestSpecification>): void {
    if (this.clients.size === 0) {
      return
    }

    const serializedSpecs = specifications.map(spec => spec.toJSON())

    this.clients.forEach((client) => {
      client.onSpecsCollected?.(serializedSpecs)?.catch?.(noop)
    })
  }

  async onTestCaseAnnotate(testCase: TestCase, annotation: TestAnnotation): Promise<void> {
    if (this.clients.size === 0) {
      return
    }

    this.clients.forEach((client) => {
      client.onTestAnnotate?.(testCase.id, annotation)?.catch?.(noop)
    })
  }

  async onTaskUpdate(packs: TaskResultPack[], events: TaskEventPack[]): Promise<void> {
    if (this.clients.size === 0) {
      return
    }

    this.clients.forEach((client) => {
      client.onTaskUpdate?.(packs, events)?.catch?.(noop)
    })
  }

  onTestRunEnd(testModules: ReadonlyArray<TestModule>, unhandledErrors: ReadonlyArray<SerializedError>): void {
    if (!this.clients.size) {
      return
    }

    const files = testModules.map(testModule => testModule.task)
    const errors = [...unhandledErrors]

    this.clients.forEach((client) => {
      client.onFinished?.(files, errors)?.catch?.(noop)
    })
  }

  onFinishedReportCoverage(): void {
    this.clients.forEach((client) => {
      client.onFinishedReportCoverage?.()?.catch?.(noop)
    })
  }

  onUserConsoleLog(log: UserConsoleLog): void {
    this.clients.forEach((client) => {
      client.onUserConsoleLog?.(log)?.catch?.(noop)
    })
  }
}
