import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import ContextMenu from '../common/ContextMenu'

interface Category {
  id: string
  name: string
  color: string
  sortOrder: number
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
const UNCATEGORIZED_ID = 'cat-uncategorized'

interface SidebarProps {
  categories: Category[]
  selectedCategory: string | null
  onSelectCategory: (id: string | null) => void
  onCategoriesChange: () => void
}

const Sidebar: React.FC<SidebarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  onCategoriesChange
}) => {
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('#8b5cf6')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#8b5cf6')
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; cat: Category } | null>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showAddModal) {
      // Focus input after modal renders
      setTimeout(() => addInputRef.current?.focus(), 50)
    }
  }, [showAddModal])

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)

  const handleEdit = async () => {
    if (!editTarget || !editName.trim()) return
    await window.api.categories.update(editTarget.id, { name: editName.trim(), color: editColor })
    setEditTarget(null)
    onCategoriesChange()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await window.api.categories.delete(deleteTarget.id)
    if (selectedCategory === deleteTarget.id) onSelectCategory(null)
    setDeleteTarget(null)
    onCategoriesChange()
  }

  const handleAdd = async () => {
    if (newName.trim()) {
      const maxOrder = categories.reduce((max, c) => Math.max(max, c.sortOrder), -1)
      await window.api.categories.create({
        name: newName.trim(),
        color: newColor,
        sortOrder: maxOrder + 1
      })
      setNewName('')
      setNewColor('#8b5cf6')
      setShowAddModal(false)
      onCategoriesChange()
    }
  }

  return (
    <div className="w-48 shrink-0 flex flex-col glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 text-xs font-medium text-[var(--color-text-secondary)] tracking-wider uppercase flex items-center justify-between shrink-0">
        <span>分类</span>
      </div>

      {/* Category list */}
      <div className="flex-1 overflow-y-auto scrollbar-gutter px-1.5 py-1 space-y-0.5">
        {/* "All" item */}
        <div
          className={`no-drag flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-sm transition-all duration-150 ${
            selectedCategory === null
              ? 'bg-[var(--color-accent-20)] text-[var(--color-accent-light)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-text)]'
          }`}
          onClick={() => onSelectCategory(null)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
          </svg>
          <span>全部</span>
        </div>

        {sorted.map((cat) => (
          <div
            key={cat.id}
            className={`no-drag flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-sm transition-all duration-150 ${
              selectedCategory === cat.id
                ? 'bg-[var(--color-accent-20)] text-[var(--color-accent-light)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] hover:text-[var(--color-text)]'
            }`}
            onClick={() => onSelectCategory(cat.id)}
            onContextMenu={(e) => {
              if (cat.id !== UNCATEGORIZED_ID) {
                e.preventDefault()
                setContextMenu({ x: e.clientX, y: e.clientY, cat })
              }
            }}
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: cat.color }}
            />
            <span className="flex-1 text-truncate">{cat.name}</span>
          </div>
        ))}
      </div>

      {/* New category button at bottom */}
      <div className="px-2 pb-2 pt-1">
        <button
          className="no-drag w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border border-dashed border-[var(--color-glass-border)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all active:scale-[0.98]"
          onClick={() => setShowAddModal(true)}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>新建分类</span>
        </button>
      </div>

      {/* Add category modal */}
      {showAddModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-accent-30)] backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="glass rounded-xl p-5 w-72 shadow-glow animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium mb-3">新建分类</p>

            <input
              ref={addInputRef}
              className="no-drag w-full px-3 py-2 text-sm rounded-lg bg-black/20 border border-[var(--color-glass-border)] outline-none focus:border-[var(--color-accent)] mb-3"
              placeholder="分类名称"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />

            <div className="flex items-center gap-2 mb-4">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`no-drag w-5 h-5 rounded-full transition-all ${
                    newColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[var(--color-bg)] scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="no-drag px-4 py-1.5 text-xs rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] transition-all"
                onClick={() => setShowAddModal(false)}
              >
                取消
              </button>
              <button
                className="no-drag px-4 py-1.5 text-xs rounded-lg bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-light)] transition-all active:scale-95"
                onClick={handleAdd}
              >
                添加
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: '编辑',
              onClick: () => {
                setEditTarget(contextMenu.cat)
                setEditName(contextMenu.cat.name)
                setEditColor(contextMenu.cat.color)
              }
            },
            {
              label: '删除',
              danger: true,
              onClick: () => setDeleteTarget(contextMenu.cat)
            }
          ]}
        />
      )}

      {/* Edit category modal */}
      {editTarget && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-accent-30)] backdrop-blur-sm"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="glass rounded-xl p-5 w-72 shadow-glow animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium mb-3">编辑分类</p>

            <input
              className="no-drag w-full px-3 py-2 text-sm rounded-lg bg-black/20 border border-[var(--color-glass-border)] outline-none focus:border-[var(--color-accent)] mb-3"
              placeholder="分类名称"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
              autoFocus
            />

            <div className="flex items-center gap-2 mb-4">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`no-drag w-5 h-5 rounded-full transition-all ${
                    editColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[var(--color-bg)] scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setEditColor(c)}
                />
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="no-drag px-4 py-1.5 text-xs rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] transition-all"
                onClick={() => setEditTarget(null)}
              >
                取消
              </button>
              <button
                className="no-drag px-4 py-1.5 text-xs rounded-lg bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-light)] transition-all active:scale-95"
                onClick={handleEdit}
              >
                保存
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-accent-30)] backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="glass rounded-xl p-4 mx-3 shadow-glow animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium mb-2">删除分类</p>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              删除「{deleteTarget.name}」后，其下的词条将移至「未分类」。确定删除？
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="no-drag px-3 py-1.5 text-xs rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] transition-all"
                onClick={() => setDeleteTarget(null)}
              >
                取消
              </button>
              <button
                className="no-drag px-3 py-1.5 text-xs rounded-lg bg-[var(--color-accent-80)] text-white hover:bg-[var(--color-accent)] transition-all active:scale-95"
                onClick={handleDelete}
              >
                删除
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Sidebar
