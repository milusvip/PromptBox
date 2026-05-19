import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  danger?: boolean
  onClick: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('keydown', handleKeyDown)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const adjustedX = Math.min(x, window.innerWidth - 160)
  const adjustedY = Math.min(y, window.innerHeight - items.length * 36 - 16)

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[100] glass rounded-xl py-1 shadow-glow animate-scale-in overflow-hidden"
      style={{ left: adjustedX, top: adjustedY, minWidth: 150 }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          className={`no-drag w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-left transition-colors ${
            item.danger
              ? 'text-[var(--color-accent-light)] hover:bg-[var(--color-accent-20)]'
              : 'text-[var(--color-text)] hover:bg-[var(--color-glass-hover)]'
          }`}
          onClick={() => { item.onClick(); onClose() }}
        >
          {item.icon && <span className="w-4 h-4 flex items-center justify-center shrink-0">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>,
    document.body
  )
}

export default ContextMenu
