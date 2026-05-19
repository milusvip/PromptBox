/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface Api {
  prompts: {
    getAll: () => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: string, data: any) => Promise<any>
    delete: (id: string) => Promise<any>
    reorder: (ids: string[]) => Promise<any>
    deleteBatch: (ids: string[]) => Promise<any>
    search: (query: string) => Promise<any>
  }
  categories: {
    getAll: () => Promise<any>
    create: (data: any) => Promise<any>
    update: (id: string, data: any) => Promise<any>
    delete: (id: string) => Promise<any>
    reorder: (ids: string[]) => Promise<any>
  }
  settings: {
    get: () => Promise<any>
    update: (data: any) => Promise<any>
  }
  window: {
    setTopmost: (flag: boolean) => void
    setOpacity: (val: number) => void
    switchMode: () => Promise<string>
    minimize: () => void
    maximize: () => void
    hide: () => void
    quit: () => void
  }
  claude: {
    send: (content: string) => Promise<any>
    paste: (content: string) => Promise<any>
  }
  checkUpdate: () => Promise<{ hasUpdate: boolean; version?: string; releaseNotes?: string; error?: string }>

  data: {
    export: (format: string) => Promise<{ success: boolean; path?: string } | null>
    import: () => Promise<{ error: string } | null | any>
    clearAll: () => Promise<{ success: boolean }>
  }
  on: (channel: string, callback: (...args: any[]) => void) => void
}

declare global {
  interface Window {
    api: Api
  }
}
