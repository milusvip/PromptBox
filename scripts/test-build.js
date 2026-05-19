import { writeFileSync, mkdirSync, cpSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DIST = join(ROOT, 'dist', 'PromptBox-test')

// Clean
try { mkdirSync(DIST, { recursive: true }) } catch {}

// Minimal main process
const mainCode = `
import { app, BrowserWindow } from 'electron'
import { join } from 'path'

try {
  const logPath = join(app.getPath('userData'), 'test-error.log')
  const log = (msg) => {
    try { require('fs').appendFileSync(logPath, msg + '\\n') } catch {}
  }

  log('App starting...')

  app.whenReady().then(() => {
    log('App ready, creating window...')

    const win = new BrowserWindow({
      width: 400,
      height: 300,
      show: true,
      backgroundColor: '#1a1a2e',
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    // Try loading our renderer first, fallback to simple HTML
    try {
      win.loadFile(join(__dirname, '../renderer/index.html'))
    } catch {
      win.loadURL('data:text/html,<html><body style="background:#1a1a2e;color:white"><h1>PromptBox Test</h1></body></html>')
    }

    log('Window created')

    win.on('close', () => {
      log('Window closed')
    })

    win.webContents.on('console-message', (e, level, msg) => {
      log(\`[Renderer] \${['v','i','w','e'][level]||'?'}: \${msg}\`)
    })
  })

  app.on('window-all-closed', () => {
    app.quit()
  })

  log('Setup complete')
} catch (e) {
  try { require('fs').appendFileSync(join(app.getPath('userData'), 'test-error.log'), 'FATAL: ' + e.stack + '\\n') } catch {}
}
`

// Simple preload
const preloadCode = `
const { contextBridge } = require('electron')
contextBridge.exposeInMainWorld('api', {
  test: () => 'hello'
})
`

// Write files
const appDir = join(DIST, 'resources', 'app')
mkdirSync(join(appDir, 'out', 'main'), { recursive: true })
mkdirSync(join(appDir, 'out', 'preload'), { recursive: true })

writeFileSync(join(appDir, 'out', 'main', 'index.js'), mainCode.trim(), 'utf-8')
writeFileSync(join(appDir, 'out', 'preload', 'preload.js'), preloadCode.trim(), 'utf-8')
writeFileSync(join(appDir, 'package.json'), JSON.stringify({ name: 'promptbox-test', main: './out/main/index.js', type: 'commonjs' }), 'utf-8')

// Copy electron
const electronDist = join(ROOT, 'node_modules', 'electron', 'dist')
cpSync(electronDist, DIST, { recursive: true, filter: (src) => {
  const name = src.split(/[/\\]/).pop()
  return !name || name === 'dist' || existsSync(src)
}})
try {
  const items = ['electron.exe', '*.dll', '*.pak', '*.dat', '*.bin', 'chrome_*', 'LICENSE', 'icudtl.dat', 'v8_context_snapshot*']
  for (const f of ['electron.exe', 'ffmpeg.dll', 'vk_swiftshader.dll', 'vulkan-1.dll']) {
    try {
      const src = join(electronDist, f)
      if (existsSync(src)) cpSync(src, join(DIST, f))
    } catch {}
  }
  // Copy all from electron dist
  cpSync(electronDist, DIST, { recursive: true, filter: (src) => {
    const basename = src.split(/[/\\]/).pop()
    return basename !== 'resources'
  }})
} catch {}

// Rename exe
if (existsSync(join(DIST, 'electron.exe'))) {
  try { cpSync(join(DIST, 'electron.exe'), join(DIST, 'PromptBoxTest.exe')) } catch {}
}

console.log('Test build at:', DIST)
