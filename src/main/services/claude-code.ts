import { clipboard } from 'electron'
import { spawn } from 'child_process'

function runPS(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    const child = spawn(
      'powershell',
      [
        '-NoProfile', '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-EncodedCommand', encoded
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )
    let stdout = '', stderr = ''
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    child.on('error', (e) => reject(e))
    child.on('close', (code) => {
      if (code === 0) resolve(stdout)
      else reject(new Error(`exit ${code}: ${stderr.slice(0, 300)}`))
    })
  })
}

export async function sendToClaudeCode(content: string): Promise<{ success: boolean; copied: boolean; sent: boolean }> {
  clipboard.writeText(content)

  // PowerShell script: find terminal window and send Ctrl+V + Enter
  // Uses keybd_event Win32 API directly (more reliable than SendKeys)
  const script =
    `$h = $null;` +
    `foreach ($n in @('windowsterminal','pwsh','powershell','cmd','claude')) {` +
    `$p = Get-Process -Name $n -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1;` +
    `if ($p) { $h = $p.MainWindowHandle; break } };` +
    `if (-not $h) { exit 1 };` +
    `Add-Type -Name W -MemberDefinition '[DllImport(\"user32.dll\")] public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);' -Namespace U;` +
    `[U.W]::SwitchToThisWindow($h, $true);` +
    `Start-Sleep -Milliseconds 500;` +
    `Add-Type -AssemblyName System.Windows.Forms;` +
    `[System.Windows.Forms.SendKeys]::SendWait('^v');` +
    `Start-Sleep -Milliseconds 300;` +
    `[System.Windows.Forms.SendKeys]::SendWait('{ENTER}')`

  try {
    await runPS(script)
    return { success: true, copied: true, sent: true }
  } catch (err) {
    console.error('[PromptBox] send failed:', err)
  }

  return { success: true, copied: true, sent: false }
}

export async function pasteToClaudeCode(content: string): Promise<{ success: boolean }> {
  clipboard.writeText(content)

  const script =
    `$h = $null;` +
    `foreach ($n in @('windowsterminal','pwsh','powershell','cmd','claude')) {` +
    `$p = Get-Process -Name $n -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1;` +
    `if ($p) { $h = $p.MainWindowHandle; break } };` +
    `if (-not $h) { exit 1 };` +
    `Add-Type -Name W -MemberDefinition '[DllImport(\"user32.dll\")] public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);' -Namespace U;` +
    `[U.W]::SwitchToThisWindow($h, $true);` +
    `Start-Sleep -Milliseconds 500;` +
    `Add-Type -AssemblyName System.Windows.Forms;` +
    `[System.Windows.Forms.SendKeys]::SendWait('^v')`

  try {
    await runPS(script)
    return { success: true }
  } catch (err) {
    console.error('[PromptBox] paste failed:', err)
    return { success: false }
  }
}
