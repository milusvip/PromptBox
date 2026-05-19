import React, { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '../components/layout/Sidebar'
import PromptList from '../components/prompt/PromptList'
import PromptEditor from '../components/prompt/PromptEditor'
import Header from '../components/layout/Header'
import SettingsPanel from '../components/settings/SettingsPanel'

const THEMES: { key: string; name: string; color: string; bg: string }[] = [
  { key: 'dark', name: '深色', color: '#7c3aed', bg: '#0f0f1a' },
  { key: 'light', name: '亮色', color: '#3b82f6', bg: '#f1f5f9' },
  { key: 'purple', name: '紫色', color: '#a855f7', bg: '#1a0a2e' },
  { key: 'ocean', name: '海洋', color: '#06b6d4', bg: '#0a1628' },
  { key: 'forest', name: '森林', color: '#22c55e', bg: '#0a1a0f' },
  { key: 'sunset', name: '日落', color: '#f97316', bg: '#1a0f0a' },
  { key: 'rose', name: '玫瑰', color: '#ec4899', bg: '#1a0a14' },
  { key: 'midnight', name: '午夜', color: '#3b82f6', bg: '#050a1a' },
  { key: 'cyber', name: '赛博', color: '#22d3ee', bg: '#0a0618' },
  { key: 'mocha', name: '摩卡', color: '#d4a574', bg: '#12100e' },
]

const FullMode: React.FC = () => {
  const [prompts, setPrompts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<any>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [isTopmost, setIsTopmost] = useState(true)
  const [currentTheme, setCurrentTheme] = useState('dark')
  const [themeOpen, setThemeOpen] = useState(false)
  const [sendMode, setSendMode] = useState<'auto' | 'clipboard'>('auto')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedPromptIds, setSelectedPromptIds] = useState<Set<string>>(new Set())
  const themeRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    const [promptsData, categoriesData] = await Promise.all([
      window.api.prompts.getAll(),
      window.api.categories.getAll()
    ])
    setPrompts(promptsData ?? [])
    setCategories(categoriesData ?? [])
  }, [])

  useEffect(() => {
    loadData()
    window.api.settings.get().then((s: any) => {
      if (s) {
        setIsTopmost(s.topmost ?? true)
        if (s.theme) applyTheme(s.theme)
        if (s.sendMode) setSendMode(s.sendMode)
      }
    })
  }, [loadData])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeOpen(false)
      }
    }
    if (themeOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [themeOpen])

  const applyTheme = (theme: string) => {
    setCurrentTheme(theme)
    document.documentElement.className = theme === 'dark' ? '' : `theme-${theme}`
  }

  const handleThemeChange = async (theme: string) => {
    applyTheme(theme)
    setThemeOpen(false)
    await window.api.settings.update({ theme } as any)
  }

  const toggleTopmost = async () => {
    const next = !isTopmost
    setIsTopmost(next)
    window.api.window.setTopmost(next)
  }

  const filteredPrompts = prompts.filter((p: any) => {
    const matchCategory = !selectedCategory || p.categoryId === selectedCategory
    const query = searchQuery.toLowerCase()
    const matchSearch = !query ||
      p.title.toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query) ||
      (p.tags || []).some((t: string) => t.toLowerCase().includes(query))
    return matchCategory && matchSearch
  })

  const handleCreate = () => {
    setEditingPrompt(null)
    setEditorOpen(true)
  }

  const handleEdit = (prompt: any) => {
    setEditingPrompt(prompt)
    setEditorOpen(true)
  }

  const handleDelete = async (id: string) => {
    await window.api.prompts.delete(id)
    loadData()
  }

  const handleSave = async (data: any) => {
    if (editingPrompt) {
      await window.api.prompts.update(editingPrompt.id, data)
    } else {
      await window.api.prompts.create(data)
    }
    setEditorOpen(false)
    setEditingPrompt(null)
    loadData()
  }

  const handleSend = async (content: string): Promise<boolean> => {
    if (sendMode === 'clipboard') {
      const result = await window.api.claude.paste(content)
      return result?.success === true
    }
    const result = await window.api.claude.send(content)
    return result?.sent === true
  }

  const handleReorder = async (ids: string[]) => {
    await window.api.prompts.reorder(ids)
    loadData()
  }

  const handleBatchDelete = async () => {
    const count = selectedPromptIds.size
    if (count === 0) return
    if (!window.confirm(`确定删除选中的 ${count} 个词条？此操作不可撤销。`)) return
    await window.api.prompts.deleteBatch(Array.from(selectedPromptIds))
    setSelectedPromptIds(new Set())
    setSelectMode(false)
    loadData()
  }

  const handleToggleSelectMode = () => {
    if (selectMode) setSelectedPromptIds(new Set())
    setSelectMode(!selectMode)
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Title bar drag region */}
      <div className="drag-region h-10 flex items-center justify-between px-3 shrink-0 select-none">
        <span className="text-sm font-medium text-[var(--color-text-secondary)] tracking-wide pl-1">
          PromptBox
        </span>

        {/* Window controls */}
        <div className="flex items-center gap-1 no-drag">
          {/* Pin / Topmost */}
          <button
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
              isTopmost
                ? 'text-[var(--color-accent-light)] bg-[var(--color-accent-20)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)]'
            }`}
            onClick={toggleTopmost}
            title={isTopmost ? '置顶中' : '取消置顶'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </button>

          {/* Theme */}
          <div className="relative" ref={themeRef}>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] transition-all"
              onClick={() => setThemeOpen(!themeOpen)}
              title="主题"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </button>
            {themeOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 glass rounded-xl py-1 shadow-glow animate-scale-in" style={{ minWidth: 140 }}>
                {THEMES.map((t) => (
                  <button
                    key={t.key}
                    className={`no-drag w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      currentTheme === t.key
                        ? 'text-[var(--color-accent-light)]'
                        : 'text-[var(--color-text)] hover:bg-[var(--color-glass-hover)]'
                    }`}
                    onClick={() => handleThemeChange(t.key)}
                  >
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span>{t.name}</span>
                    {currentTheme === t.key && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto shrink-0">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] transition-all"
            onClick={() => setSettingsOpen(true)}
            title="设置"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
              <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
              <line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
          </button>

          {/* Minimize */}
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] transition-all"
            onClick={() => window.api.window.minimize()}
            title="最小化"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {/* Maximize */}
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] transition-all"
            onClick={() => window.api.window.maximize()}
            title="最大化"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="1"/>
            </svg>
          </button>


          {/* Close */}
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-20)] hover:text-[var(--color-accent-light)] transition-all"
            onClick={() => setCloseOpen(true)}
            title="关闭"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden px-2 pb-2 gap-2">
        {/* Sidebar */}
        <Sidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onCategoriesChange={loadData}
        />

        {/* Main area */}
        <div className="flex-1 flex flex-col glass rounded-xl overflow-hidden">
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCreateClick={handleCreate}
            onRefresh={loadData}
            selectMode={selectMode}
            onToggleSelectMode={handleToggleSelectMode}
            selectedCount={selectedPromptIds.size}
            onBatchDelete={handleBatchDelete}
          />
          <PromptList
            prompts={filteredPrompts}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSend={handleSend}
            sendMode={sendMode}
            onReorder={handleReorder}
            selectMode={selectMode}
            selectedIds={selectedPromptIds}
            onSelectionChange={setSelectedPromptIds}
          />
        </div>
      </div>

      {/* Editor modal */}
      {editorOpen && (
        <PromptEditor
          prompt={editingPrompt}
          categories={categories}
          onSave={handleSave}
          onClose={() => {
            setEditorOpen(false)
            setEditingPrompt(null)
          }}
        />
      )}

      {/* Settings panel */}
      {settingsOpen && (
        <SettingsPanel
          onDataChange={loadData}
          onClose={() => {
            setSettingsOpen(false)
            window.api.settings.get().then((s: any) => {
              if (s?.sendMode) setSendMode(s.sendMode)
            })
          }}
        />
      )}

      {/* Close confirm dialog */}
      {closeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-accent-30)] backdrop-blur-sm">
          <div className="w-72 glass rounded-2xl p-5 flex flex-col gap-4 animate-scale-in shadow-glow">
            <div className="text-center">
              <h3 className="text-sm font-semibold mb-1">关闭 PromptBox</h3>
              <p className="text-xs text-[var(--color-text-secondary)]">选择操作</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="no-drag w-full py-2.5 rounded-xl text-sm bg-[var(--color-accent-20)] text-[var(--color-accent-light)] hover:bg-[var(--color-accent-30)] transition-all active:scale-95"
                onClick={() => {
                  setCloseOpen(false)
                  window.api.window.hide()
                }}
              >
                隐藏到托盘
              </button>
              <button
                className="no-drag w-full py-2.5 rounded-xl text-sm text-[var(--color-accent-light)] hover:bg-[var(--color-accent-20)] transition-all active:scale-95"
                onClick={() => {
                  setCloseOpen(false)
                  window.api.window.quit()
                }}
              >
                退出软件
              </button>
              <button
                className="no-drag w-full py-2 rounded-xl text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] transition-all"
                onClick={() => setCloseOpen(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FullMode
