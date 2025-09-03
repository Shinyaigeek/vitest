export interface SnapshotContent {
  expected: string
  actual: string
  count: number
}

export interface SnapshotContentItem {
  testName: string
  snapshotKey: string
  content: SnapshotContent
}

export interface ParsedStoreKey {
  filepath: string
  testName: string
  snapshotKey: string
}

export class SnapshotContentStore {
  private contentMap = new Map<string, SnapshotContent>()

  // Generate a store key from components
  private generateKey(filepath: string, testName: string, snapshotKey: string): string {
    return `${filepath}:${testName}:${snapshotKey}`
  }

  // Parse a store key back into components
  private parseKey(storeKey: string): ParsedStoreKey | null {
    const parts = storeKey.split(':')
    if (parts.length < 3) {
      return null
    }

    // Handle case where filepath might contain colons (e.g., Windows paths)
    const snapshotKey = parts.pop()!
    const testName = parts.pop()!
    const filepath = parts.join(':')
    return { filepath, testName, snapshotKey }
  }

  // Check if a store key belongs to a specific file
  private isForFile(storeKey: string, filepath: string): boolean {
    return storeKey.startsWith(`${filepath}:`)
  }

  // Store snapshot content
  store(filepath: string, testName: string, snapshotKey: string, content: SnapshotContent): void {
    const storeKey = this.generateKey(filepath, testName, snapshotKey)
    this.contentMap.set(storeKey, content)
  }

  // Get snapshot content
  get(filepath: string, testName: string, snapshotKey: string): SnapshotContent | undefined {
    const storeKey = this.generateKey(filepath, testName, snapshotKey)
    return this.contentMap.get(storeKey)
  }

  // Clear all stored content
  clear(): void {
    this.contentMap.clear()
  }

  // Clear content for a specific file
  clearForFile(filepath: string): void {
    const keysToDelete = this.getKeysForFile(filepath)
    keysToDelete.forEach(key => this.contentMap.delete(key))
  }

  // Get all store keys for a specific file
  getKeysForFile(filepath: string): string[] {
    return Array.from(this.contentMap.keys()).filter(key =>
      this.isForFile(key, filepath),
    )
  }

  // Get all snapshot content for a specific file
  getContentForFile(filepath: string): SnapshotContentItem[] {
    return this.getKeysForFile(filepath)
      .map((key) => {
        const parsed = this.parseKey(key)
        const content = this.contentMap.get(key)
        if (parsed && content) {
          return {
            testName: parsed.testName,
            snapshotKey: parsed.snapshotKey,
            content,
          }
        }
        return null
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }
}
