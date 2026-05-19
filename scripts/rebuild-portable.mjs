import { cpSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, renameSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Step 1: Build
console.log('Building...')
execSync('npx electron-vite build', { cwd: ROOT, stdio: 'inherit' })

// Step 2: Create direct portable package
const DIST = join(ROOT, 'dist', 'PromptBox-portable')
if (existsSync(DIST)) rmSync(DIST, { recursive: true })

console.log('\nCreating portable package...')
const appDir = join(DIST, 'resources', 'app')
mkdirSync(join(appDir, 'out'), { recursive: true })

// Copy built output
cpSync(join(ROOT, 'out'), join(appDir, 'out'), { recursive: true })

// Copy resources (icons)
cpSync(join(ROOT, 'resources'), join(DIST, 'resources'), { recursive: true })
// But don't nest resources inside resources
if (existsSync(join(DIST, 'resources', 'resources'))) {
  const nested = readdirSync(join(DIST, 'resources', 'resources'))
  for (const f of nested) {
    try { cpSync(join(DIST, 'resources', 'resources', f), join(DIST, 'resources', f)) } catch {}
  }
  rmSync(join(DIST, 'resources', 'resources'), { recursive: true })
}

// Write app package.json
writeFileSync(join(appDir, 'package.json'), JSON.stringify({
  name: 'promptbox',
  version: '1.0.0',
  main: './out/main/index.js',
  type: 'module'
}), 'utf-8')

// Copy Electron binaries
const electronDist = join(ROOT, 'node_modules', 'electron', 'dist')
const electronFiles = readdirSync(electronDist).filter(f => f !== 'resources')
for (const f of electronFiles) {
  try { cpSync(join(electronDist, f), join(DIST, f)) } catch {}
}

// Rename electron.exe
if (existsSync(join(DIST, 'electron.exe'))) {
  renameSync(join(DIST, 'electron.exe'), join(DIST, 'PromptBox.exe'))
}

// Also copy the asar package for win-unpacked
const asarOut = join(ROOT, 'dist', 'win-unpacked')
if (existsSync(asarOut)) {
  cpSync(join(DIST, 'resources', 'app', 'out'), join(asarOut, 'resources', 'app', 'out'), { recursive: true })
  mkdirSync(join(asarOut, 'resources'), { recursive: true })
  cpSync(join(ROOT, 'resources', 'tray-icon.png'), join(asarOut, 'resources', 'tray-icon.png'))
  writeFileSync(join(asarOut, 'resources', 'app', 'package.json'), JSON.stringify({
    name: 'promptbox',
    main: './out/main/index.js',
    type: 'module'
  }), 'utf-8')
  console.log('  win-unpacked updated')
}

console.log(`\nDone! Package at: ${DIST}`)
console.log(`Size: ${(readdirSync(DIST).reduce((s, f) => {
  try { return s + (join(DIST, f)).length } catch { return s }
}, 0) / 1024 / 1024).toFixed(0)}MB+`)
