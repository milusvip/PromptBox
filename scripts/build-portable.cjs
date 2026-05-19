const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const DIST = path.join(ROOT, 'dist', 'PromptBox-portable')
const ELECTRON_DIST = path.join(ROOT, 'node_modules', 'electron', 'dist')

// Clean
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true })
}

// Create structure
fs.mkdirSync(path.join(DIST, 'resources'), { recursive: true })

// Copy electron exe and dlls
console.log('Copying Electron...')
fs.readdirSync(ELECTRON_DIST).forEach((file) => {
  if (file.endsWith('.exe') || file.endsWith('.dll') || file.endsWith('.pak') || file === 'LICENSE' || file.endsWith('.dat') || file.endsWith('.bin')) {
    const src = path.join(ELECTRON_DIST, file)
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, path.join(DIST, file))
    }
  }
})

// Rename electron.exe to PromptBox.exe
fs.renameSync(path.join(DIST, 'electron.exe'), path.join(DIST, 'PromptBox.exe'))

// Copy app resources (the built output)
console.log('Copying app bundle...')
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  fs.readdirSync(src).forEach((item) => {
    const s = path.join(src, item)
    const d = path.join(dest, item)
    if (fs.statSync(s).isDirectory()) {
      copyDir(s, d)
    } else {
      fs.copyFileSync(s, d)
    }
  })
}

copyDir(path.join(ROOT, 'out'), path.join(DIST, 'resources', 'app', 'out'))

// Copy package.json
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'))
const appPkg = {
  name: pkg.name,
  version: pkg.version,
  main: './out/main/index.js',
  dependencies: {}
}
fs.writeFileSync(path.join(DIST, 'resources', 'app', 'package.json'), JSON.stringify(appPkg, null, 2))

// Copy node_modules needed for runtime
console.log('Copying node_modules...')
const neededModules = [
  'uuid', 'react', 'react-dom', 'zustand', 'scheduler'
]
const nmSrc = path.join(ROOT, 'node_modules')
const nmDest = path.join(DIST, 'resources', 'app', 'node_modules')
neededModules.forEach((mod) => {
  const src = path.join(nmSrc, mod)
  if (fs.existsSync(src)) {
    copyDir(src, path.join(nmDest, mod))
  }
})

// Create launcher
console.log('Creating launcher...')
// Create a simple batch file that sets the right paths
const batchContent = `@echo off
start "" "%~dp0PromptBox.exe"
`
fs.writeFileSync(path.join(DIST, '启动PromptBox.bat'), batchContent)

console.log('Portable build complete at:', DIST)
console.log(`Total size: ${(getDirSize(DIST) / 1024 / 1024).toFixed(1)} MB`)

function getDirSize(dir) {
  let size = 0
  fs.readdirSync(dir).forEach((item) => {
    const p = path.join(dir, item)
    try {
      if (fs.statSync(p).isDirectory()) size += getDirSize(p)
      else size += fs.statSync(p).size
    } catch {}
  })
  return size
}
