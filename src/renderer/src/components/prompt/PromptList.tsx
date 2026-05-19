import React from 'react'
import { createPortal } from 'react-dom'
import ContextMenu from '../common/ContextMenu'

interface PromptItem {
  id: string
  title: string
  content: string
  categoryId: string
  tags: string[]
  color?: string
  usageCount: number
}

interface PromptListProps {
  prompts: PromptItem[]
  onEdit: (prompt: PromptItem) => void
  onDelete: (id: string) => void
  onSend: (content: string) => Promise<boolean>
  sendMode: 'auto' | 'clipboard'
  onReorder: (ids: string[]) => void
  selectMode: boolean
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
}

const PromptList: React.FC<PromptListProps> = ({
  prompts, onEdit, onDelete, onSend, sendMode,
  onReorder, selectMode, selectedIds, onSelectionChange
}) => {
  const [sentIds, setSentIds] = React.useState<Set<string>>(new Set())
  const [copiedIds, setCopiedIds] = React.useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = React.useState<PromptItem | null>(null)
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; prompt: PromptItem } | null>(null)
  const [dragOverId, setDragOverId] = React.useState<string | null>(null)
  const dragItemRef = React.useRef<string | null>(null)

  const handleSend = async (prompt: PromptItem) => {
    setSentIds((prev) => new Set(prev).add(prompt.id))
    const ok = await onSend(prompt.content)
    setTimeout(() => {
      setSentIds((prev) => {
        const next = new Set(prev)
        next.delete(prompt.id)
        return next
      })
    }, ok ? 500 : 300)
  }

  const handleCopy = async (prompt: PromptItem) => {
    try {
      await navigator.clipboard.writeText(prompt.content)
      setCopiedIds((prev) => new Set(prev).add(prompt.id))
      setTimeout(() => {
        setCopiedIds((prev) => {
          const next = new Set(prev)
          next.delete(prompt.id)
          return next
        })
      }, 1500)
    } catch {
      // clipboard write failed
    }
  }

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragItemRef.current = id
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const draggedId = dragItemRef.current
    if (!draggedId || draggedId === targetId) {
      setDragOverId(null)
      return
    }
    const ids = prompts.map((p) => p.id)
    const fromIdx = ids.indexOf(draggedId)
    const toIdx = ids.indexOf(targetId)
    ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, draggedId)
    onReorder(ids)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    dragItemRef.current = null
    setDragOverId(null)
  }

  if (prompts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[var(--color-text-secondary)]">
        暂无词条，点击右上角「+ 新增」创建
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-gutter px-3 py-3 space-y-2">
      {prompts.map((prompt) => {
        const isSelected = selectedIds.has(prompt.id)
        const isDragOver = dragOverId === prompt.id

        return (
          <div
            key={prompt.id}
            draggable={!selectMode}
            className={`group glass rounded-xl p-3.5 transition-all duration-150 ${
              selectMode ? '' : 'cursor-pointer'
            } ${
              isDragOver ? 'drag-over scale-[1.02]' : ''
            } ${
              isSelected ? 'ring-2 ring-[var(--color-accent)] bg-[var(--color-accent-10)]' : 'glass-hover'
            } ${!selectMode && dragItemRef.current ? 'dragging' : ''}`}
            onClick={() => {
              if (selectMode) {
                toggleSelection(prompt.id)
              } else {
                handleCopy(prompt)
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              if (!selectMode) {
                setContextMenu({ x: e.clientX, y: e.clientY, prompt })
              }
            }}
            onDragStart={(e) => handleDragStart(e, prompt.id)}
            onDragOver={(e) => handleDragOver(e, prompt.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, prompt.id)}
            onDragEnd={handleDragEnd}
            title={selectMode ? '' : '点击复制内容'}
          >
            <div className="flex items-start justify-between gap-3">
              {/* Title and tags */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(prompt.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-[var(--color-accent)] w-3.5 h-3.5 shrink-0"
                    />
                  )}
                  {prompt.color && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: prompt.color }}
                    />
                  )}
                  <h3 className="text-sm font-medium text-[var(--color-text)] text-truncate">
                    {prompt.title}
                  </h3>
                  {prompt.tags?.length > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      {prompt.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 text-[10px] rounded-md bg-white/5 text-[var(--color-text-secondary)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-1">
                  {prompt.content}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Copy indicator */}
                {copiedIds.has(prompt.id) && (
                  <span className="text-xs text-[var(--color-accent-light)] font-medium mr-1">已复制</span>
                )}

                {/* Send button */}
                <button
                  className={`no-drag flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    sentIds.has(prompt.id)
                      ? 'bg-[var(--color-accent-light)] text-white'
                      : 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-light)]'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSend(prompt)
                  }}
                >
                  {sentIds.has(prompt.id) ? '✓' : '发送'}
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: '编辑',
              onClick: () => onEdit(contextMenu.prompt)
            },
            {
              label: '复制内容',
              onClick: () => handleCopy(contextMenu.prompt)
            },
            {
              label: '发送',
              onClick: () => handleSend(contextMenu.prompt)
            },
            {
              label: '删除',
              danger: true,
              onClick: () => setDeleteTarget(contextMenu.prompt)
            }
          ]}
        />
      )}

      {/* Delete confirmation (single) */}
      {deleteTarget && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-accent-30)] backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="glass rounded-xl p-4 mx-3 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium mb-2">删除词条</p>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              确定删除「{deleteTarget.title}」？此操作不可撤销。
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
                onClick={() => { onDelete(deleteTarget.id); setDeleteTarget(null) }}
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

export default PromptList
