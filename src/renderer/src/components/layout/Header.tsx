import React, { useState } from 'react'

interface HeaderProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  onCreateClick: () => void
  onRefresh: () => void
  selectMode: boolean
  onToggleSelectMode: () => void
  selectedCount: number
  onBatchDelete: () => void
}

const base: React.CSSProperties = {
  height: 36,
  boxSizing: 'border-box',
  lineHeight: 'normal',
  fontSize: 12,
  fontFamily: 'inherit',
  margin: 0,
}

const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onCreateClick,
  onRefresh,
  selectMode,
  onToggleSelectMode,
  selectedCount,
  onBatchDelete
}) => {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setTimeout(() => setRefreshing(false), 600)
  }

  return (
    <div className="flex flex-col shrink-0">
      {/* Top row: search + actions */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-glass-border)]">
        {/* Search */}
        <div className="flex-1 relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none leading-none flex items-center" style={{ margin: 0, padding: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            className="no-drag w-full rounded-md bg-black/20 text-[var(--color-text)] placeholder-[var(--color-text-secondary)] focus:border-[var(--color-accent)]"
            style={{
              ...base,
              padding: '0 28px',
              border: '1px solid var(--color-glass-border)',
              borderRadius: 6,
              outline: 'none',
              background: 'rgba(0,0,0,0.2)',
              color: 'var(--color-text)',
              display: 'block',
            }}
            placeholder="搜索词条..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              className="no-drag absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-glass-hover)]"
              style={{ ...base, width: 22, height: 22, minHeight: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => onSearchChange('')}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Select mode toggle */}
        <button
          className={`no-drag rounded-md transition-all font-medium ${
            selectMode
              ? 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-light)]'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)]'
          } active:scale-95`}
          style={{ ...base, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 10px', border: 'none', borderRadius: 6, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
          onClick={onToggleSelectMode}
          title="多选"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/>
          </svg>
          <span>选择</span>
        </button>

        {/* New */}
        <button
          className="no-drag rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-hover)] font-medium active:scale-95"
          style={{ ...base, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 10px', border: 'none', borderRadius: 6, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}
          onClick={onCreateClick}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>新增</span>
        </button>

        {/* Refresh */}
        <button
          className="no-drag rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] active:scale-95"
          style={{ ...base, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, padding: 0, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none', color: 'var(--color-text-secondary)', flexShrink: 0 }}
          onClick={handleRefresh}
          title="刷新"
          disabled={refreshing}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: refreshing ? 'spin 0.6s linear' : 'none', display: 'block' }}>
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>

      {/* Selection toolbar */}
      {selectMode && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--color-glass-border)] bg-[var(--color-accent-05)]">
          <span className="text-xs text-[var(--color-text-secondary)]">
            已选择 {selectedCount} 项
          </span>
          <button
            className="no-drag px-2.5 py-1 text-xs rounded-md bg-[var(--color-accent-80)] text-white hover:bg-[var(--color-accent)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={selectedCount === 0}
            onClick={onBatchDelete}
          >
            删除选中
          </button>
          <button
            className="no-drag px-2.5 py-1 text-xs rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-glass-hover)] transition-all"
            onClick={onToggleSelectMode}
          >
            取消选择
          </button>
        </div>
      )}
    </div>
  )
}

export default Header
