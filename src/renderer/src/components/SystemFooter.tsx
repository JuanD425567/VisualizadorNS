import React from 'react'

// ── Inline SVG dock icons ────────────────────────────────────────────────────

const SettingsIcon = (): React.JSX.Element => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const SleepIcon = (): React.JSX.Element => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

// ── Dock button ──────────────────────────────────────────────────────────────

interface DockBtnProps {
  id: string
  icon: React.ReactNode
  label: string
  onClick?: () => void
}

function DockBtn({ id, icon, label, onClick }: DockBtnProps): React.JSX.Element {
  return (
    <button id={id} className="sw-dock-btn" onClick={onClick} title={label} aria-label={label}>
      {icon}
      <span className="sw-dock-btn-label">{label}</span>
    </button>
  )
}

// ── Action hint ──────────────────────────────────────────────────────────────

interface ActionHintProps {
  btnClass: string
  btnLabel: string
  hint: string
}

function ActionHint({ btnClass, btnLabel, hint }: ActionHintProps): React.JSX.Element {
  return (
    <div className="sw-action-hint">
      <span className={`sw-action-btn-icon ${btnClass}`}>{btnLabel}</span>
      <span>{hint}</span>
    </div>
  )
}

// ── SystemFooter ─────────────────────────────────────────────────────────────

interface SystemFooterProps {
  onOpenSettings: () => void
}

export default function SystemFooter({ onOpenSettings }: SystemFooterProps): React.JSX.Element {
  const handleSleep = (): void => window.api.minimizeWindow()

  return (
    <footer className="sw-footer">
      {/* Dock icons row */}
      <div className="sw-footer-dock">
        <DockBtn id="dock-settings" icon={<SettingsIcon />} label="Configuración" onClick={onOpenSettings} />
        <DockBtn id="dock-sleep" icon={<SleepIcon />} label="Suspender" onClick={handleSleep} />
      </div>

      {/* Action bar */}
      <div className="sw-footer-actions">
        <ActionHint btnClass="btn-a" btnLabel="A" hint="Iniciar" />
        <ActionHint btnClass="btn-b" btnLabel="B" hint="Atrás" />
        <ActionHint btnClass="btn-plus" btnLabel="+" hint="Opciones" />
      </div>
    </footer>
  )
}
