import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, dialog } from 'electron'
import { join } from 'path'
import { IPC_CHANNELS, type AppSettings } from '../shared/types'
import {
  getAllPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
  reorderPrompts,
  deletePrompts,
  searchPrompts,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  getSettings,
  updateSettings,
  exportData,
  importData,
  clearAllData
} from './services/storage'
import { sendToClaudeCode, pasteToClaudeCode } from './services/claude-code'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

declare module 'electron' {
  interface App {
    isQuitting?: boolean
  }
}

async function createWindow(): Promise<void> {
  const settings = await getSettings()
  const { width, height } = settings

  mainWindow = new BrowserWindow({
    width,
    height,
    frame: false,
    resizable: true,
    alwaysOnTop: settings.topmost,
    skipTaskbar: false,
    hasShadow: true,
    show: true,
    backgroundColor: '#0f0f1a',
    icon: join(app.getAppPath(), 'resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.setOpacity(settings.opacity)
  mainWindow.show()
  mainWindow.focus()

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Open DevTools in debug mode
  // mainWindow.webContents.openDevTools()

  // Log renderer console messages
  mainWindow.webContents.on('console-message', (_e) => {
    const { level, message, sourceId, lineNumber } = _e as unknown as { level: number; message: string; sourceId: string; lineNumber: number }
    logError(`[Renderer ${['verbose','info','warning','error'][level]||'log'}] ${message} (${sourceId}:${lineNumber})`)
  })

  // Handle renderer crashes
  mainWindow.webContents.on('crashed', () => {
    logError('Renderer process crashed')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Hide window instead of closing
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
      // Notify user only once
      if (tray) {
        tray.displayBalloon({
          title: 'PromptBox',
          content: '已最小化到系统托盘，点击托盘图标重新显示。'
        })
      }
    }
  })
}

function createTray(): void {
  // Embedded 16x16 tray icon from logo (no external file needed)
  const TRAY_ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAPoAAAD6AG1e1JrAAABwUlEQVR4nGNgGD7g////jCCMJATm19fXM4HYMEEQHypGVdvrmbZsWGO3asl6g5kzN3GtWrWKedu2VaKbNq2zWbtxo8WinTu5QequrFrFtmXLOs1Na9eaorji//56lvVrl1atWrGmZtWq9cab9i8VWbN+RfCKFSs6Vq1a1bJ8+Wqf3et2C2/cusZ6xZpVTesWL63eX1/PguKCtasWey9fvk0ZJrb//n6OVWuXOS1dusp+E9RV+/fv59i0ba3pmhVrvDC8MGFSV8zimdslT5w4wVcPNb17crdDX98kWxD7zMyZLCB6+fqpsr1dE0JRDKj/X8/UP6knYcH0zdL792+ROHPmjAhIvGdCj2t3d7/d9devebes2iIBEluyplu+u3NiLIYLJvZ1pvS2T9Lfv38/y+4zZ/h3717FP3FKd1hn5wSv/6v+M1+5ckXo/v37AlNnd+n1d/Wnohnwn3HRtGliHR0dmp2dnSZlNTXaLVX1ZlOmzJHv6elR62prs5zUPUmxqqrUpKe9x3DhzAlyaGmGAeGd+nqe4uJisfr7/fBQ7u7u5q6srBSvz68XYGDAoRFLSsQqBkuhWA2BKUBOukSIUwYAnS/gD+p+H8kAAAAASUVORK5CYII='
  const trayIcon = nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_BASE64}`)

  tray = new Tray(trayIcon)
  tray.setToolTip('PromptBox')
  tray.setIgnoreDoubleClickEvents(true)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示 PromptBox',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
}

// ── IPC: Window ──

ipcMain.on(IPC_CHANNELS.WINDOW_SET_TOPMOST, async (_e, topmost: boolean) => {
  mainWindow?.setAlwaysOnTop(topmost)
  await updateSettings({ topmost })
})

ipcMain.on(IPC_CHANNELS.WINDOW_SET_OPACITY, async (_e, opacity: number) => {
  mainWindow?.setOpacity(opacity)
  await updateSettings({ opacity })
})

ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
  mainWindow?.minimize()
})

ipcMain.on('window:quit', () => {
  app.isQuitting = true
  app.quit()
})

ipcMain.on(IPC_CHANNELS.WINDOW_HIDE, () => {
  mainWindow?.hide()
})

ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

// ── IPC: Prompts ──

ipcMain.handle(IPC_CHANNELS.PROMPTS_GET_ALL, async () => {
  return await getAllPrompts()
})

ipcMain.handle(IPC_CHANNELS.PROMPTS_CREATE, async (_e, data) => {
  return await createPrompt(data)
})

ipcMain.handle(IPC_CHANNELS.PROMPTS_UPDATE, async (_e, id, data) => {
  return await updatePrompt(id, data)
})

ipcMain.handle(IPC_CHANNELS.PROMPTS_DELETE, async (_e, id) => {
  return await deletePrompt(id)
})

ipcMain.handle(IPC_CHANNELS.PROMPTS_REORDER, async (_e, ids: string[]) => {
  return await reorderPrompts(ids)
})

ipcMain.handle(IPC_CHANNELS.PROMPTS_DELETE_BATCH, async (_e, ids: string[]) => {
  return await deletePrompts(ids)
})

ipcMain.handle(IPC_CHANNELS.PROMPTS_SEARCH, async (_e, query) => {
  return await searchPrompts(query)
})

// ── IPC: Categories ──

ipcMain.handle(IPC_CHANNELS.CATEGORIES_GET_ALL, async () => {
  return await getAllCategories()
})

ipcMain.handle(IPC_CHANNELS.CATEGORIES_CREATE, async (_e, data) => {
  return await createCategory(data)
})

ipcMain.handle(IPC_CHANNELS.CATEGORIES_UPDATE, async (_e, id, data) => {
  return await updateCategory(id, data)
})

ipcMain.handle(IPC_CHANNELS.CATEGORIES_DELETE, async (_e, id) => {
  return await deleteCategory(id)
})

ipcMain.handle(IPC_CHANNELS.CATEGORIES_REORDER, async (_e, ids) => {
  return await reorderCategories(ids)
})

// ── IPC: Settings ──

ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => {
  return await getSettings()
})

ipcMain.handle(IPC_CHANNELS.SETTINGS_UPDATE, async (_e, data) => {
  return await updateSettings(data)
})

// ── IPC: Claude Code ──

ipcMain.handle(IPC_CHANNELS.CLAUDE_SEND, async (_e, content: string) => {
  return await sendToClaudeCode(content)
})

ipcMain.handle(IPC_CHANNELS.CLAUDE_PASTE, async (_e, content: string) => {
  return await pasteToClaudeCode(content)
})

// ── IPC: Import / Export ──

ipcMain.handle(IPC_CHANNELS.DATA_EXPORT, async (_e, format: string) => {
  const result = await exportData(format)

  const { filePath } = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: `promptbox-export.${result.ext}`,
    filters: [
      { name: format.toUpperCase(), extensions: [result.ext] }
    ]
  })

  if (filePath) {
    const { promises: fs } = await import('fs')
    await fs.writeFile(filePath, result.data, 'utf-8')
    return { success: true, path: filePath }
  }
  return { success: false }
})

ipcMain.handle(IPC_CHANNELS.DATA_IMPORT, async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow!, {
    filters: [{ name: 'JSON (PromptBox 导出)', extensions: ['json'] }],
    properties: ['openFile']
  })

  if (filePaths.length > 0) {
    try {
      const { promises: fs } = await import('fs')
      const content = await fs.readFile(filePaths[0], 'utf-8')
      return await importData(content)
    } catch {
      return { error: '文件格式错误，请选择有效的 PromptBox 导出 JSON 文件。' }
    }
  }
  return null
})

// ── IPC: Data ──

ipcMain.handle(IPC_CHANNELS.DATA_CLEAR, async () => {
  await clearAllData()
  return { success: true }
})

// ── IPC: Updates ──

import { checkForUpdate } from './services/updater'

ipcMain.handle(IPC_CHANNELS.CHECK_UPDATE, async () => {
  return await checkForUpdate()
})

// ── App Lifecycle ──

// Global error logging
const logError = (err: unknown) => {
  try {
    const { appendFileSync } = require2('fs')
    const logPath = join(app.getPath('userData'), 'error.log')
    const msg = `[${new Date().toISOString()}] ${err instanceof Error ? err.stack || err.message : String(err)}\n`
    try { appendFileSync(logPath, msg) } catch {}
  } catch {}
}

process.on('uncaughtException', (err) => {
  logError(err)
})

process.on('unhandledRejection', (err) => {
  logError(err)
})

app.whenReady().then(async () => {
  try {
    await createWindow()
    createTray()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      } else {
        mainWindow?.show()
      }
    })
  } catch (err) {
    logError(err)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
