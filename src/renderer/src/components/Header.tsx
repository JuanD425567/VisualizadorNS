import React, { useState, useEffect } from 'react'

// ── Icons (inline SVG, no external deps) ────────────────────────────────────

const WifiIcon = (): React.JSX.Element => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <circle cx="12" cy="20" r="1" fill="currentColor" />
  </svg>
)

const BatteryIcon = (): React.JSX.Element => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
    <div
      style={{
        width: 26,
        height: 13,
        border: '1.5px solid rgba(255,255,255,0.55)',
        borderRadius: 3,
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
        position: 'relative'
      }}
    >
      <div
        style={{
          height: '100%',
          width: '75%',
          background: '#4ade80',
          borderRadius: 1
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -5,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 3,
          height: 7,
          background: 'rgba(255,255,255,0.55)',
          borderRadius: '0 1px 1px 0'
        }}
      />
    </div>
    <span
      style={{
        fontSize: 10,
        color: 'rgba(255,255,255,0.55)',
        fontWeight: 600,
        letterSpacing: 0.3
      }}
    >
      75%
    </span>
  </div>
)

const SearchIcon = (): React.JSX.Element => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const WinCloseIcon = (): React.JSX.Element => (
  <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const WinMinIcon = (): React.JSX.Element => (
  <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
    <line x1="4" y1="12" x2="20" y2="12" />
  </svg>
)

const WinMaxIcon = (): React.JSX.Element => (
  <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </svg>
)

interface HeaderProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export default function Header({ searchQuery, setSearchQuery }: HeaderProps): React.JSX.Element {
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    const update = (): void => {
      const now = new Date()
      const h = now.getHours().toString().padStart(2, '0')
      const m = now.getMinutes().toString().padStart(2, '0')
      setTime(`${h}:${m}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleClose = (): void => window.api.closeWindow()
  const handleMin = (): void => window.api.minimizeWindow()
  const handleMax = (): void => window.api.maximizeWindow()

  return (
    <header className="sw-header">
      {/* Left: Avatar + Username */}
      <div className="sw-header-left">
        <div className="sw-avatar" title="Perfil de usuario">
          👤
        </div>
        <span className="sw-username">jdgar</span>
      </div>

      {/* Center: Search input */}
      <div className="sw-header-search">
        <span className="sw-search-icon">
          <SearchIcon />
        </span>
        <input
          type="text"
          placeholder="Buscar juego..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sw-search-input"
        />
        {searchQuery && (
          <button className="sw-search-clear" onClick={() => setSearchQuery('')} aria-label="Limpiar búsqueda">
            ✕
          </button>
        )}
      </div>

      {/* Right: Status icons + window controls */}
      <div className="sw-header-right">
        <div className="sw-status-icon">
          <WifiIcon />
        </div>
        <BatteryIcon />
        <span className="sw-clock">{time}</span>

        {/* macOS-style window controls */}
        <div className="sw-win-controls">
          <button
            id="btn-close"
            className="sw-win-btn sw-win-btn-close"
            onClick={handleClose}
            title="Cerrar"
          >
            <WinCloseIcon />
          </button>
          <button
            id="btn-min"
            className="sw-win-btn sw-win-btn-min"
            onClick={handleMin}
            title="Minimizar"
          >
            <WinMinIcon />
          </button>
          <button
            id="btn-max"
            className="sw-win-btn sw-win-btn-max"
            onClick={handleMax}
            title="Maximizar"
          >
            <WinMaxIcon />
          </button>
        </div>
      </div>
    </header>
  )
}
