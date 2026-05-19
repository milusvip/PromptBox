// Shared type definitions for PromptBox

export interface PromptItem {
  id: string
  title: string
  content: string
  categoryId: string
  tags: string[]
  color?: string
  createdAt: string
  updatedAt: string
  usageCount: number
  sortOrder: number
}

export interface Category {
  id: string
  name: string
  color: string
  sortOrder: number
}

export interface AppSettings {
  displayMode: 'full'
  opacity: number
  topmost: boolean
  width: number
  height: number
  position?: { x: number; y: number }
  theme: 'dark' | 'light' | 'purple' | 'ocean' | 'forest' | 'sunset' | 'rose' | 'midnight' | 'cyber' | 'mocha'
  sendMode: 'auto' | 'clipboard'
}

export interface StorageData {
  version: number
  categories: Category[]
  prompts: PromptItem[]
}

export interface ExportData extends StorageData {
  exportedAt: string
}

// IPC channel names
export const IPC_CHANNELS = {
  // Prompts
  PROMPTS_GET_ALL: 'prompts:get-all',
  PROMPTS_CREATE: 'prompts:create',
  PROMPTS_UPDATE: 'prompts:update',
  PROMPTS_DELETE: 'prompts:delete',
  PROMPTS_REORDER: 'prompts:reorder',
  PROMPTS_DELETE_BATCH: 'prompts:delete-batch',
  PROMPTS_SEARCH: 'prompts:search',

  // Categories
  CATEGORIES_GET_ALL: 'categories:get-all',
  CATEGORIES_CREATE: 'categories:create',
  CATEGORIES_UPDATE: 'categories:update',
  CATEGORIES_DELETE: 'categories:delete',
  CATEGORIES_REORDER: 'categories:reorder',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // Window
  WINDOW_SET_TOPMOST: 'window:set-topmost',
  WINDOW_SET_OPACITY: 'window:set-opacity',
  WINDOW_SWITCH_MODE: 'window:switch-mode',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_HIDE: 'window:hide',

  // Claude Code
  CLAUDE_SEND: 'claude:send',
  CLAUDE_PASTE: 'claude:paste',
  CLAUDE_SEND_RESULT: 'claude:send-result',

  // Import/Export
  DATA_EXPORT: 'data:export',
  DATA_IMPORT: 'data:import',
  DATA_EXPORT_PATH: 'data:export-path',
  DATA_CLEAR: 'data:clear',

  // Updates
  CHECK_UPDATE: 'check-update',

  // Notifications
  NOTIFY: 'notify'
} as const
