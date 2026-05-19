import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface SettingsData {
  opacity: number
  topmost: boolean
  width: number
  height: number
  sendMode: 'auto' | 'clipboard'
}

interface SettingsPanelProps {
  onClose: () => void
  onDataChange?: () => void
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [activeTab, setActiveTab] = useState<'display' | 'data'>('display')
  const [exportMsg, setExportMsg] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [updateResult, setUpdateResult] = useState<{ hasUpdate: boolean; version?: string; error?: string } | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true)
    setUpdateResult(null)
    const result = await window.api.checkUpdate()
    setUpdateResult(result)
    setCheckingUpdate(false)
  }
  const [clearCountdown, setClearCountdown] = useState(0)
  const clearTimerRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    window.api.settings.get().then(setSettings)
  }, [])

  useEffect(() => {
    if (clearConfirmOpen) {
      setClearCountdown(3)
      clearTimerRef.current = setInterval(() => {
        setClearCountdown((c) => {
          if (c <= 1) {
            clearInterval(clearTimerRef.current)
            return 0
          }
          return c - 1
        })
      }, 1000)
    }
    return () => clearInterval(clearTimerRef.current)
  }, [clearConfirmOpen])

  const handleClearConfirm = async () => {
    clearInterval(clearTimerRef.current)
    setClearConfirmOpen(false)
    await window.api.data.clearAll()
    onDataChange?.()
    setImportMsg('所有数据已清除！')
    setTimeout(() => setImportMsg(''), 3000)
  }

  if (!settings) return null

  const update = async (partial: Partial<SettingsData>) => {
    const updated = { ...settings, ...partial }
    setSettings(updated)
    await window.api.settings.update(partial)

    // Apply live
    if ('topmost' in partial) {
      window.api.window.setTopmost(partial.topmost!)
    }
    if ('opacity' in partial) {
      window.api.window.setOpacity(partial.opacity!)
    }
  }

  const handleExport = async (format: string) => {
    setExportMsg('')
    const result = await window.api.data.export(format)
    if (result?.success) {
      setExportMsg(`导出成功: ${result.path}`)
      setTimeout(() => setExportMsg(''), 3000)
    }
  }

  const handleImport = async () => {
    setImportMsg('')
    const result = await window.api.data.import()
    if (!result) return
    if (result.error) {
      setImportMsg(result.error)
      setTimeout(() => setImportMsg(''), 3000)
      return
    }
    setImportMsg('导入成功！请刷新词条列表。')
    setTimeout(() => setImportMsg(''), 3000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-accent-30)] backdrop-blur-sm">
      <div
        className="w-[480px] max-h-[80vh] glass rounded-2xl p-6 flex flex-col animate-scale-in shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold">设置</h2>
          <button
            className="no-drag w-7 h-7 flex items-center justify-center rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)]"
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 scrollbar-gutter">
          {/* Tabs */}
          <div className="flex gap-1 bg-black/20 rounded-xl p-1 shrink-0">
          <button
            className={`no-drag flex-1 py-1.5 text-sm rounded-lg transition-all ${
              activeTab === 'display' ? 'bg-[var(--color-accent-30)] text-[var(--color-accent-light)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
            onClick={() => setActiveTab('display')}
          >
            显示
          </button>
          <button
            className={`no-drag flex-1 py-1.5 text-sm rounded-lg transition-all ${
              activeTab === 'data' ? 'bg-[var(--color-accent-30)] text-[var(--color-accent-light)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
            onClick={() => setActiveTab('data')}
          >
            数据
          </button>
        </div>

        {activeTab === 'display' && (
          <div className="flex flex-col gap-4">

            {/* Opacity */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">透明度</span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {Math.round(settings.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={Math.round(settings.opacity * 100)}
                onChange={(e) => update({ opacity: parseInt(e.target.value) / 100 })}
                className="no-drag w-full accent-[var(--color-accent)]"
              />
              <div className="flex justify-between text-[10px] text-[var(--color-text-secondary)]">
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Send mode */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm">发送模式</span>
              <div className="flex gap-2">
                <button
                  className={`no-drag flex-1 py-2 text-sm rounded-xl transition-all ${
                    settings.sendMode === 'auto'
                      ? 'bg-[var(--color-accent-30)] text-[var(--color-accent-light)]'
                      : 'bg-black/20 text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)]'
                  }`}
                  onClick={() => update({ sendMode: 'auto' })}
                >
                  自动发送
                </button>
                <button
                  className={`no-drag flex-1 py-2 text-sm rounded-xl transition-all ${
                    settings.sendMode === 'clipboard'
                      ? 'bg-[var(--color-accent-30)] text-[var(--color-accent-light)]'
                      : 'bg-black/20 text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)]'
                  }`}
                  onClick={() => update({ sendMode: 'clipboard' })}
                >
                  复制到输入框
                </button>
              </div>
              <span className="text-[10px] text-[var(--color-text-secondary)]">
                {settings.sendMode === 'auto'
                  ? '点击「发送」直接发送到 Claude Code'
                  : '点击「发送」仅复制内容到剪贴板'}
              </span>
            </div>

          </div>
        )}

        {activeTab === 'data' && (
          <div className="flex flex-col gap-3">
            {/* Export */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">导出数据</span>
              <div className="flex gap-2">
                <button
                  className="no-drag flex-1 px-3 py-2 text-sm rounded-xl bg-[var(--color-accent-20)] text-[var(--color-accent-light)] hover:bg-[var(--color-accent-30)] transition-all"
                  onClick={() => handleExport('json')}
                >
                  导出 JSON
                </button>
                <button
                  className="no-drag flex-1 px-3 py-2 text-sm rounded-xl bg-[var(--color-accent-20)] text-[var(--color-accent-light)] hover:bg-[var(--color-accent-30)] transition-all"
                  onClick={() => handleExport('csv')}
                >
                  导出 CSV
                </button>
                <button
                  className="no-drag flex-1 px-3 py-2 text-sm rounded-xl bg-[var(--color-accent-20)] text-[var(--color-accent-light)] hover:bg-[var(--color-accent-30)] transition-all"
                  onClick={() => handleExport('md')}
                >
                  导出 Markdown
                </button>
              </div>
              {exportMsg && (
                <span className="text-xs text-[var(--color-accent-light)]">{exportMsg}</span>
              )}
            </div>

            {/* Import */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">导入数据</span>
              <button
                className="no-drag px-3 py-2 text-sm rounded-xl bg-[var(--color-accent-20)] text-[var(--color-accent-light)] hover:bg-[var(--color-accent-30)] transition-all"
                onClick={handleImport}
              >
                选择 JSON 文件导入
              </button>
            </div>

            <div className="border-t border-[var(--color-glass-border)] pt-3">
              <button
                className="no-drag w-full px-3 py-2 text-sm rounded-xl border border-[var(--color-accent-30)] text-[var(--color-accent-light)] hover:bg-[var(--color-accent-20)] transition-all"
                onClick={() => setClearConfirmOpen(true)}
              >
                清除所有数据
              </button>
            </div>

            <div className="text-xs text-[var(--color-text-secondary)] bg-white/5 rounded-xl p-3">
              数据存储在 <code className="text-[var(--color-accent-light)]">%APPDATA%/PromptBox/data/</code>
              ，完全本地，不会丢失。
            </div>
          </div>
        )}

        </div>

        {/* Notification */}
        {(exportMsg || importMsg) && (
          <div className="text-xs text-[var(--color-accent-light)] text-center shrink-0">
            {exportMsg || importMsg}
          </div>
        )}

        {/* Version & updates — fixed bottom */}
        <div className="flex items-center justify-between border-t border-[var(--color-glass-border)] pt-3">
          <span className="text-[10px] text-[var(--color-text-secondary)]/50">
            v{__APP_VERSION__}
          </span>
          <button
            className="no-drag text-[10px] text-[var(--color-accent-light)] hover:underline"
            onClick={handleCheckUpdate}
            disabled={checkingUpdate}
          >
            {checkingUpdate ? '检查中...' : '检查更新'}
          </button>
        </div>

      </div>

      {/* Update result modal */}
      {updateResult && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-accent-30)] backdrop-blur-sm"
          onClick={() => setUpdateResult(null)}
        >
          <div
            className="w-72 glass rounded-2xl p-5 flex flex-col gap-4 animate-scale-in shadow-glow"
            onClick={(e) => e.stopPropagation()}
          >
            {updateResult.error ? (
              <>
                <div className="text-center">
                  <h3 className="text-sm font-semibold mb-1">检查更新失败</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">{updateResult.error}</p>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] text-center">
                  请确保已配置 GitHub 发布仓库，或前往项目页面手动检查。
                </p>
              </>
            ) : updateResult.hasUpdate ? (
              <div className="text-center">
                <h3 className="text-sm font-semibold mb-1">发现新版本</h3>
                <p className="text-xs text-[var(--color-accent-light)] font-medium">
                  v{updateResult.version} 可用
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                  当前版本 v{__APP_VERSION__}
                </p>
              </div>
            ) : (
              <div className="text-center">
                <h3 className="text-sm font-semibold mb-1">已是最新版本</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  v{__APP_VERSION__} 已是最新版
                </p>
              </div>
            )}
            <button
              className="no-drag w-full py-2 rounded-xl text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] transition-all"
              onClick={() => setUpdateResult(null)}
            >
              关闭
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Clear data confirm modal */}
      {clearConfirmOpen && createPortal(
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-accent-30)] backdrop-blur-sm"
          onClick={() => { clearInterval(clearTimerRef.current); setClearConfirmOpen(false) }}
        >
          <div
            className="w-72 glass rounded-2xl p-5 flex flex-col gap-4 animate-scale-in shadow-glow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <h3 className="text-sm font-semibold mb-1">清除所有数据</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">
                将删除所有词条和分类，此操作不可撤销！
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="no-drag w-full py-2.5 rounded-xl text-sm text-[var(--color-accent-light)] border border-[var(--color-accent-30)] hover:bg-[var(--color-accent-20)] transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={clearCountdown > 0}
                onClick={handleClearConfirm}
              >
                {clearCountdown > 0 ? `确认 (${clearCountdown}s)` : '确认清除'}
              </button>
              <button
                className="no-drag w-full py-2 rounded-xl text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] transition-all"
                onClick={() => { clearInterval(clearTimerRef.current); setClearConfirmOpen(false) }}
              >
                取消
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default SettingsPanel
