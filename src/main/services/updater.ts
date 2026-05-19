export interface UpdateCheckResult {
  hasUpdate: boolean
  version?: string
  releaseNotes?: string
  error?: string
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  try {
    const updaterPkg = await import('electron-updater')
    const autoUpdater = (updaterPkg.autoUpdater || updaterPkg.default?.autoUpdater) as any
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false

    const result = await autoUpdater.checkForUpdates()
    const latest = result?.updateInfo
    if (!latest) return { hasUpdate: false }

    const current = autoUpdater.currentVersion
    if (latest.version === current.version) return { hasUpdate: false }

    return {
      hasUpdate: true,
      version: latest.version,
      releaseNotes: latest.releaseNotes
    }
  } catch (err: any) {
    return {
      hasUpdate: false,
      error: err?.message || '检查更新失败'
    }
  }
}
