<script setup lang="ts">
import type { File, SnapshotMatcherInvocation } from '@vitest/runner'
import { client } from '~/composables/client'

interface Props {
  matcher: SnapshotMatcherInvocation & { taskName: string }
  file: File
}

const props = defineProps<Props>()

const snapshotContent = ref<{ key: string; expected: string; actual?: string; count: number } | null>(null)
const isLoading = ref(false)
const isOpen = ref(false)

async function loadSnapshotContent() {
  if (snapshotContent.value || isLoading.value) {
    return
  }

  isLoading.value = true
  try {
    const snapshotData = await client.rpc.getSnapshotContent(
      props.file.filepath,
      props.matcher.name,
      props.matcher.matcher,
    )

    if (snapshotData) {
      const displayKey = props.matcher.snapshot?.key || snapshotData.key
      const displayCount = props.matcher.snapshot?.count || snapshotData.count || 1
      snapshotContent.value = {
        key: displayKey,
        expected: snapshotData.expected,
        actual: snapshotData.actual,
        count: displayCount,
      }
    }
  }
  catch (error) {
    console.error('Error loading snapshot content:', error)
  }
  finally {
    isLoading.value = false
  }
}

function onToggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    loadSnapshotContent()
  }
}
</script>

<template>
  <div class="wrap bg-green-500/10 py-2 px-4 my-1 border-l-4 border-green-500">
    <details class="cursor-pointer" @toggle="onToggle">
      <summary class="font-mono text-sm text-green-700 dark:text-green-400 select-none">
        ✅ {{ matcher.matcher }} - {{ matcher.taskName }}
      </summary>

      <div class="mt-2 text-sm text-gray-700 dark:text-gray-300">
        <div class="mb-2">
          <span class="font-semibold">Test:</span> {{ matcher.name }}
        </div>
        <div class="mb-2">
          <span class="font-semibold">Matcher:</span> {{ matcher.matcher }}
        </div>
        <div class="mb-2">
          <span class="font-semibold">Location:</span> Line {{ matcher.location.line }}, Column {{ matcher.location.column }}
        </div>
        <div class="mb-2">
          <span class="font-semibold text-green-600">Status:</span> <span class="text-green-600">✅ PASSED</span>
        </div>

        <div class="snapshot-content">
          <div v-if="!isOpen" class="italic text-xs text-gray-500">
            Click to load snapshot content...
          </div>
          <div v-else-if="isLoading" class="italic text-xs text-blue-500">
            Loading snapshot content...
          </div>
          <div v-else-if="snapshotContent" class="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
            <div class="font-semibold mb-1">
              Snapshot Key: <span class="font-mono">{{ snapshotContent.key }}</span>
            </div>
            <div class="font-semibold mb-1">
              Count: <span class="font-mono">{{ snapshotContent.count }}</span>
            </div>
            <div class="font-semibold mb-1">
              Expected:
            </div>
            <pre class="whitespace-pre-wrap overflow-x-auto max-h-60 bg-white dark:bg-gray-900 p-2 rounded border">{{ snapshotContent.expected }}</pre>
            <div v-if="snapshotContent.actual" class="font-semibold mb-1 mt-2">
              Actual:
            </div>
            <pre v-if="snapshotContent.actual" class="whitespace-pre-wrap overflow-x-auto max-h-60 bg-white dark:bg-gray-900 p-2 rounded border">{{ snapshotContent.actual }}</pre>
          </div>
          <div v-else class="italic text-xs text-red-500">
            Snapshot content not found for test: "{{ matcher.name }}"
          </div>
        </div>
      </div>
    </details>
  </div>
</template>
