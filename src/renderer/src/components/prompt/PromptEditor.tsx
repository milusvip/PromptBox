import React, { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'

interface Category {
  id: string
  name: string
  color: string
}

interface PromptItem {
  id: string
  title: string
  content: string
  categoryId: string
  tags: string[]
  color?: string
}

interface PromptEditorProps {
  prompt: PromptItem | null
  categories: Category[]
  onSave: (data: any) => void
  onClose: () => void
}

const PromptEditor: React.FC<PromptEditorProps> = ({ prompt, categories, onSave, onClose }) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [color, setColor] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title)
      setContent(prompt.content)
      setCategoryId(prompt.categoryId)
      setTagsStr((prompt.tags || []).join(', '))
      setColor(prompt.color || '')
    } else {
      setTitle('')
      setContent('')
      setCategoryId(categories.find((c) => c.id === 'cat-uncategorized')?.id || categories[0]?.id || '')
      setTagsStr('')
      setColor('')
    }
  }, [prompt, categories])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return
    onSave({
      id: prompt?.id || uuidv4(),
      title: title.trim(),
      content: content.trim(),
      categoryId,
      tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
      color: color || undefined,
      ...(prompt
        ? { updatedAt: new Date().toISOString() }
        : { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), usageCount: 0 }
      )
    })
  }

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-accent-30)] backdrop-blur-sm">
      <div
        className="w-[520px] max-h-[80vh] glass rounded-2xl animate-scale-in shadow-glow flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — fixed top */}
        <div className="flex items-center justify-between px-6 pt-6 pb-0 shrink-0">
          <h2 className="text-base font-semibold">
            {prompt ? '编辑词条' : '新建词条'}
          </h2>
          <button
            className="no-drag w-7 h-7 flex items-center justify-center rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)]"
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable form content */}
        <div className="flex-1 overflow-y-auto scrollbar-gutter px-6 py-4 space-y-4">
          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-secondary)]">标题</label>
            <input
              className="no-drag w-full h-10 px-3 text-sm rounded-xl bg-black/20 border border-[var(--color-glass-border)] outline-none focus:border-[var(--color-accent)] transition-colors"
              placeholder="词条标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-secondary)]">内容</label>
            <textarea
              className="no-drag w-full h-32 px-3 py-2 text-sm rounded-xl bg-black/20 border border-[var(--color-glass-border)] outline-none focus:border-[var(--color-accent)] transition-colors resize-none"
              placeholder="提示词内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1 relative" ref={dropdownRef}>
            <label className="text-xs text-[var(--color-text-secondary)]">分类</label>
            <button
              type="button"
              className="no-drag w-full h-10 px-3 text-sm rounded-xl bg-black/20 border border-[var(--color-glass-border)] outline-none focus:border-[var(--color-accent)] transition-colors flex items-center justify-between cursor-pointer"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span className="flex items-center gap-2">
                {(() => {
                  const cat = categories.find((c) => c.id === categoryId)
                  return cat ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span>{cat.name}</span>
                    </>
                  ) : (
                    <span className="text-[var(--color-text-secondary)]">选择分类</span>
                  )
                })()}
              </span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl py-1 shadow-glow animate-scale-in border border-[var(--color-glass-border)] backdrop-blur-xl" style={{ maxHeight: 200, overflowY: 'auto', background: 'rgba(0,0,0,0.75)' }}>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`no-drag w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors cursor-pointer ${
                      cat.id === categoryId
                        ? 'bg-[var(--color-accent-20)] text-[var(--color-accent-light)]'
                        : 'text-[var(--color-text)] hover:bg-[var(--color-glass-hover)]'
                    }`}
                    onClick={() => {
                      setCategoryId(cat.id)
                      setDropdownOpen(false)
                    }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span>{cat.name}</span>
                    {cat.id === categoryId && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto shrink-0">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-secondary)]">标签（逗号分隔）</label>
            <input
              className="no-drag w-full h-10 px-3 text-sm rounded-xl bg-black/20 border border-[var(--color-glass-border)] outline-none focus:border-[var(--color-accent)] transition-colors"
              placeholder="安全, 审查, 前端"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
            />
          </div>

          {/* Color */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-text-secondary)]">标记颜色（可选）</label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button
                  key={c}
                  className={`no-drag w-6 h-6 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[var(--color-bg)]' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(color === c ? '' : c)}
                />
              ))}
              {color && (
                <button
                  className="no-drag w-6 h-6 flex items-center justify-center rounded-full text-[10px] bg-white/10 text-[var(--color-text-secondary)] hover:bg-white/20"
                  onClick={() => setColor('')}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Actions — fixed bottom */}
        <div className="flex justify-end gap-2 px-6 pb-6 pt-0 shrink-0">
          <button
            className="no-drag px-4 py-2 text-sm rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] transition-all"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="no-drag px-5 py-2 text-sm rounded-xl bg-[var(--color-accent)] text-white font-medium hover:bg-[var(--color-accent-light)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={!title.trim() || !content.trim()}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

export default PromptEditor
