import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { StorageData, Category, PromptItem, AppSettings } from '../../shared/types'

const DATA_DIR = join(app.getPath('userData'), 'data')
const PROMPTS_FILE = join(DATA_DIR, 'prompts.json')
const PROMPTS_BACKUP_FILE = join(DATA_DIR, 'prompts.backup.json')
const SETTINGS_FILE = join(DATA_DIR, 'settings.json')

const DEFAULT_SETTINGS: AppSettings = {
  displayMode: 'full',
  opacity: 1,
  topmost: true,
  width: 800,
  height: 600,
  theme: 'dark',
  sendMode: 'auto'
}

export const UNCATEGORIZED_ID = 'cat-uncategorized'

const DEFAULT_CATEGORIES: Category[] = [
  { id: UNCATEGORIZED_ID, name: '未分类', color: '#6b7280', sortOrder: 0 },
  { id: 'cat-claude', name: 'Claude 命令', color: '#8b5cf6', sortOrder: 1 },
  { id: 'cat-review', name: '代码审查', color: '#ef4444', sortOrder: 2 },
  { id: 'cat-arch', name: '架构设计', color: '#3b82f6', sortOrder: 3 },
  { id: 'cat-debug', name: '调试修复', color: '#f97316', sortOrder: 4 },
  { id: 'cat-perf', name: '性能优化', color: '#22c55e', sortOrder: 5 },
  { id: 'cat-test', name: '测试', color: '#06b6d4', sortOrder: 6 },
  { id: 'cat-learn', name: '学习', color: '#eab308', sortOrder: 7 },
  { id: 'cat-custom', name: '自定义', color: '#ec4899', sortOrder: 8 }
]

const DEFAULT_PROMPTS: PromptItem[] = [
  {
    id: 'pm-compact', title: '紧凑模式', content: '/compact',
    categoryId: 'cat-claude', tags: ['命令'], color: '#8b5cf6',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), usageCount: 0, sortOrder: 0
  },
  {
    id: 'pm-clear', title: '清空对话', content: '/clear',
    categoryId: 'cat-claude', tags: ['命令'], color: '#8b5cf6',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), usageCount: 0, sortOrder: 1
  },
  {
    id: 'pm-security', title: '安全审查', content: 'Review the following code for security vulnerabilities, focusing on injection, XSS, authentication, and authorization issues.\n\n```\n[在此粘贴代码]\n```',
    categoryId: 'cat-review', tags: ['安全', '审查'], color: '#ef4444',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), usageCount: 0, sortOrder: 2
  },
  {
    id: 'pm-arch-review', title: '架构审查', content: 'Analyze the architectural design of this codebase. Evaluate separation of concerns, coupling, cohesion, and adherence to SOLID principles.',
    categoryId: 'cat-review', tags: ['架构'], color: '#f97316',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), usageCount: 0, sortOrder: 3
  },
  {
    id: 'pm-debug', title: 'Bug 分析', content: 'I\'m encountering the following error. Help me identify the root cause and propose a fix.\n\nError: [在此粘贴错误信息]',
    categoryId: 'cat-debug', tags: ['调试'], color: '#eab308',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), usageCount: 0, sortOrder: 4
  },
  {
    id: 'pm-perf', title: '性能分析', content: 'Profile this code and identify performance bottlenecks. Suggest specific optimizations with code examples.',
    categoryId: 'cat-perf', tags: ['性能'], color: '#22c55e',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), usageCount: 0, sortOrder: 5
  },
  {
    id: 'pm-ut-gen', title: '单元测试生成', content: 'Generate comprehensive unit tests for the following code. Include edge cases and mock external dependencies.',
    categoryId: 'cat-test', tags: ['测试', '单元测试'], color: '#06b6d4',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), usageCount: 0, sortOrder: 6
  },
  {
    id: 'pm-sys-design', title: '系统设计', content: 'Design a system architecture for the following requirements. Consider scalability, reliability, and maintainability.',
    categoryId: 'cat-arch', tags: ['设计'], color: '#3b82f6',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), usageCount: 0, sortOrder: 7
  }
]

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch {
    // dir exists
  }
}

async function atomicWrite(filePath: string, data: unknown): Promise<void> {
  const tmpPath = filePath + '.tmp'
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
  try {
    await fs.rename(tmpPath, filePath)
  } catch {
    // rename can fail on Windows if target doesn't exist or across devices
    await fs.copyFile(tmpPath, filePath)
    await fs.unlink(tmpPath).catch(() => {})
  }
}

async function safeRead<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// ── Storage API ──

let storageCache: StorageData | null = null

function invalidateCache() {
  storageCache = null
}

export async function loadStorage(): Promise<StorageData> {
  if (storageCache) return storageCache
  await ensureDataDir()

  // Check if file exists to distinguish first run from cleared data
  let fileExists = false
  try {
    await fs.access(PROMPTS_FILE)
    fileExists = true
  } catch { /* file doesn't exist */ }

  const data = await safeRead<StorageData>(PROMPTS_FILE, { version: 1, categories: [], prompts: [] })

  // First run: seed defaults only if file didn't exist
  if (!fileExists && data.categories.length === 0 && data.prompts.length === 0) {
    data.categories = DEFAULT_CATEGORIES
    data.prompts = DEFAULT_PROMPTS
    await saveStorage(data)
  }

  // Migrate old categories (icon -> color)
  for (const cat of data.categories) {
    if ('icon' in cat && !('color' in cat)) {
      const oldIcon = (cat as any).icon
      const colorMap: Record<string, string> = {
        '⚡': '#8b5cf6', '🔍': '#ef4444', '🏛️': '#3b82f6', '🔧': '#f97316',
        '🚀': '#22c55e', '🧪': '#06b6d4', '📚': '#eab308', '📁': '#ec4899'
      }
      ;(cat as any).color = colorMap[oldIcon] || '#8b5cf6'
      delete (cat as any).icon
    }
  }

  // Migrate old prompts missing sortOrder
  let migrated = false
  for (let i = 0; i < data.prompts.length; i++) {
    if (data.prompts[i].sortOrder === undefined) {
      data.prompts[i].sortOrder = data.prompts.length - i
      migrated = true
    }
  }
  if (migrated) await saveStorage(data)

  storageCache = data
  return data
}

async function saveStorage(data: StorageData): Promise<void> {
  invalidateCache()
  await ensureDataDir()
  // Backup before overwrite
  try {
    const existing = await fs.readFile(PROMPTS_FILE, 'utf-8')
    await fs.writeFile(PROMPTS_BACKUP_FILE, existing, 'utf-8')
  } catch {
    // No existing file to backup
  }
  await atomicWrite(PROMPTS_FILE, data)
}

// ── CRUD: Prompts ──

export async function getAllPrompts(): Promise<PromptItem[]> {
  const data = await loadStorage()
  return [...data.prompts].sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function createPrompt(input: Partial<PromptItem>): Promise<PromptItem> {
  const data = await loadStorage()
  const now = new Date().toISOString()
  const minOrder = data.prompts.length > 0
    ? Math.min(...data.prompts.map((p) => p.sortOrder))
    : 0
  const prompt: PromptItem = {
    id: input.id || crypto.randomUUID(),
    title: input.title || '',
    content: input.content || '',
    categoryId: input.categoryId || UNCATEGORIZED_ID,
    tags: input.tags || [],
    color: input.color,
    createdAt: input.createdAt || now,
    updatedAt: now,
    usageCount: input.usageCount || 0,
    sortOrder: minOrder - 1
  }
  data.prompts.push(prompt)
  await saveStorage(data)
  return prompt
}

export async function updatePrompt(id: string, input: Partial<PromptItem>): Promise<PromptItem | null> {
  const data = await loadStorage()
  const idx = data.prompts.findIndex((p) => p.id === id)
  if (idx === -1) return null
  data.prompts[idx] = { ...data.prompts[idx], ...input, id, updatedAt: new Date().toISOString() }
  await saveStorage(data)
  return data.prompts[idx]
}

export async function deletePrompt(id: string): Promise<boolean> {
  const data = await loadStorage()
  const len = data.prompts.length
  data.prompts = data.prompts.filter((p) => p.id !== id)
  if (data.prompts.length === len) return false
  await saveStorage(data)
  return true
}

export async function reorderPrompts(ids: string[]): Promise<PromptItem[]> {
  const data = await loadStorage()
  const promptMap = new Map(data.prompts.map((p) => [p.id, p]))
  data.prompts = ids.map((id, i) => {
    const prompt = promptMap.get(id)
    if (prompt) prompt.sortOrder = i
    return prompt || promptMap.get(id)!
  }).filter(Boolean)
  await saveStorage(data)
  return data.prompts
}

export async function deletePrompts(ids: string[]): Promise<number> {
  const data = await loadStorage()
  const before = data.prompts.length
  data.prompts = data.prompts.filter((p) => !ids.includes(p.id))
  const deleted = before - data.prompts.length
  if (deleted > 0) await saveStorage(data)
  return deleted
}

export async function searchPrompts(query: string): Promise<PromptItem[]> {
  const data = await loadStorage()
  const q = query.toLowerCase()
  return data.prompts.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  )
}

// ── CRUD: Categories ──

export async function getAllCategories(): Promise<Category[]> {
  const data = await loadStorage()
  return data.categories
}

export async function createCategory(input: Partial<Category>): Promise<Category> {
  const data = await loadStorage()
  const cat: Category = {
    id: crypto.randomUUID(),
    name: input.name || '',
    color: input.color || '#8b5cf6',
    sortOrder: input.sortOrder ?? data.categories.length
  }
  data.categories.push(cat)
  await saveStorage(data)
  return cat
}

export async function updateCategory(id: string, input: Partial<Category>): Promise<Category | null> {
  const data = await loadStorage()
  const idx = data.categories.findIndex((c) => c.id === id)
  if (idx === -1) return null
  data.categories[idx] = { ...data.categories[idx], ...input }
  await saveStorage(data)
  return data.categories[idx]
}

export async function deleteCategory(id: string): Promise<boolean> {
  if (id === UNCATEGORIZED_ID) return false
  const data = await loadStorage()
  const len = data.categories.length
  data.categories = data.categories.filter((c) => c.id !== id)
  // Move prompts in deleted category to uncategorized
  data.prompts.forEach((p) => {
    if (p.categoryId === id) p.categoryId = UNCATEGORIZED_ID
  })
  if (data.categories.length === len) return false
  await saveStorage(data)
  return true
}

export async function reorderCategories(ids: string[]): Promise<Category[]> {
  const data = await loadStorage()
  const catMap = new Map(data.categories.map((c) => [c.id, c]))
  data.categories = ids.map((id, i) => {
    const cat = catMap.get(id)
    if (cat) cat.sortOrder = i
    return cat || catMap.get(id)!
  }).filter(Boolean)
  await saveStorage(data)
  return data.categories
}

// ── Settings ──

export async function getSettings(): Promise<AppSettings> {
  await ensureDataDir()
  return await safeRead<AppSettings>(SETTINGS_FILE, DEFAULT_SETTINGS)
}

export async function updateSettings(input: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings()
  const updated = { ...current, ...input }
  await atomicWrite(SETTINGS_FILE, updated)
  return updated
}

// ── Import / Export ──

export async function exportData(format: string): Promise<{ data: string; ext: string }> {
  const storage = await loadStorage()
  const exportObj = { ...storage, exportedAt: new Date().toISOString() }

  switch (format) {
    case 'json':
      return { data: JSON.stringify(exportObj, null, 2), ext: 'json' }
    case 'csv': {
      const header = 'id,title,categoryId,tags,content,usageCount\n'
      const rows = storage.prompts.map((p) =>
        `"${p.id}","${p.title.replace(/"/g, '""')}","${p.categoryId}","${(p.tags || []).join(';')}","${p.content.replace(/"/g, '""')}",${p.usageCount}`
      ).join('\n')
      return { data: header + rows, ext: 'csv' }
    }
    case 'md': {
      const lines: string[] = ['# PromptBox 导出', '', '---', '']
      for (const cat of storage.categories) {
        lines.push(`## ${cat.name}`, '')
        const catPrompts = storage.prompts.filter((p) => p.categoryId === cat.id)
        for (const p of catPrompts) {
          lines.push(`### ${p.title}`, '', '```', p.content, '```', '')
        }
      }
      return { data: lines.join('\n'), ext: 'md' }
    }
    default:
      return { data: JSON.stringify(exportObj, null, 2), ext: 'json' }
  }
}

export async function importData(jsonStr: string): Promise<StorageData> {
  const incoming = JSON.parse(jsonStr) as StorageData
  await saveStorage(incoming)
  return incoming
}

export async function clearAllData(): Promise<void> {
  const data: StorageData = { version: 1, categories: [], prompts: [] }
  await saveStorage(data)
}
