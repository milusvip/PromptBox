import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/types'

const api = {
  // Prompts
  prompts: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_GET_ALL),
    create: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_CREATE, data),
    update: (id: string, data: any) => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_DELETE, id),
    reorder: (ids: string[]) => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_REORDER, ids),
    deleteBatch: (ids: string[]) => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_DELETE_BATCH, ids),
    search: (query: string) => ipcRenderer.invoke(IPC_CHANNELS.PROMPTS_SEARCH, query)
  },

  // Categories
  categories: {
    getAll: () => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_GET_ALL),
    create: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_CREATE, data),
    update: (id: string, data: any) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_DELETE, id),
    reorder: (ids: string[]) => ipcRenderer.invoke(IPC_CHANNELS.CATEGORIES_REORDER, ids)
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    update: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_UPDATE, data)
  },

  // Window
  window: {
    setTopmost: (flag: boolean) => ipcRenderer.send(IPC_CHANNELS.WINDOW_SET_TOPMOST, flag),
    setOpacity: (val: number) => ipcRenderer.send(IPC_CHANNELS.WINDOW_SET_OPACITY, val),
    switchMode: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SWITCH_MODE),
    minimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    hide: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_HIDE),
    quit: () => ipcRenderer.send('window:quit'),
  },

  // Claude Code
  claude: {
    send: (content: string) => ipcRenderer.invoke(IPC_CHANNELS.CLAUDE_SEND, content),
    paste: (content: string) => ipcRenderer.invoke(IPC_CHANNELS.CLAUDE_PASTE, content)
  },

  // Updates
  checkUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.CHECK_UPDATE),

  // Import/Export
  data: {
    export: (format: string) => ipcRenderer.invoke(IPC_CHANNELS.DATA_EXPORT, format),
    import: () => ipcRenderer.invoke(IPC_CHANNELS.DATA_IMPORT),
    clearAll: () => ipcRenderer.invoke(IPC_CHANNELS.DATA_CLEAR)
  },

  // Events
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = [
      IPC_CHANNELS.WINDOW_SWITCH_MODE,
      IPC_CHANNELS.CLAUDE_SEND_RESULT,
      IPC_CHANNELS.NOTIFY
    ]
    if (validChannels.includes(channel as any)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    }
  }
}

contextBridge.exposeInMainWorld('api', api)
