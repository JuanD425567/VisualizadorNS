import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { playSound } from '../utils/audio'

type TabType = 'general' | 'audio' | 'pantalla' | 'mandos' | 'informacion'

interface SettingsOverlayProps {
  isOpen: boolean
  onClose: () => void
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  soundEnabled: boolean
  onToggleSound: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
  stopButtonIndex: number | null
  onSetStopButtonIndex: (val: number | null) => void
  activeTheme: string
  onChangeTheme: (theme: string) => void
  romsDir: string
  emulatorPath: string
  onSetPaths: (romsDir: string, emulatorPath: string) => void
  musicEnabled: boolean
  onToggleMusic: () => void
  musicVolume: number
  onMusicVolumeChange: (vol: number) => void
  vibrationEnabled: boolean
  onToggleVibration: () => void
}

export default function SettingsOverlay({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  stopButtonIndex,
  onSetStopButtonIndex,
  activeTheme,
  onChangeTheme,
  romsDir,
  emulatorPath,
  onSetPaths,
  musicEnabled,
  onToggleMusic,
  musicVolume,
  onMusicVolumeChange,
  vibrationEnabled,
  onToggleVibration
}: SettingsOverlayProps): React.JSX.Element | null {
  
  // Gamepad test states (kept local to SettingsOverlay since they only matter for visual tester)
  const [gamepadName, setGamepadName] = useState<string | null>(null)
  const [activeButtons, setActiveButtons] = useState<number[]>([])
  const [axes, setAxes] = useState<readonly number[]>([])
  const [isMappingButton, setIsMappingButton] = useState(false)

  // Poll gamepad state when on 'mandos' tab
  useEffect(() => {
    if (activeTab !== 'mandos' || !isOpen) return

    let animId: number
    const poll = (): void => {
      const gps = navigator.getGamepads()
      const gp = gps.find((g) => g !== null)
      if (gp) {
        setGamepadName(gp.id)
        const pressed: number[] = []
        gp.buttons.forEach((btn, idx) => {
          if (btn.pressed) {
            pressed.push(idx)
            if (isMappingButton) {
              onSetStopButtonIndex(idx)
              setIsMappingButton(false)
              playSound('select')
            }
          }
        })
        setActiveButtons(pressed)
        setAxes(gp.axes)
      } else {
        setGamepadName(null)
        setActiveButtons([])
        setAxes([])
      }
      animId = requestAnimationFrame(poll)
    }

    poll()
    return () => cancelAnimationFrame(animId)
  }, [activeTab, isOpen, isMappingButton, onSetStopButtonIndex])

  if (!isOpen) return null

  const changeTab = (tab: TabType): void => {
    setActiveTab(tab)
    playSound('tab')
  }

  const handleClose = (): void => {
    window.api.stopGamepadListen()
    playSound('back')
    onClose()
  }

  const handleStartMapping = async (): Promise<void> => {
    setIsMappingButton(true)
    try {
      const result = await window.api.startGamepadListen()
      if (result !== undefined && result !== null && result >= 0) {
        onSetStopButtonIndex(result)
        playSound('select')
      }
    } catch (e) {
      console.error('Failed to map gamepad button:', e)
    } finally {
      setIsMappingButton(false)
    }
  }

  const handleSelectRomsDir = async (): Promise<void> => {
    try {
      const selected = await window.api.selectDirectory()
      if (selected) {
        onSetPaths(selected, emulatorPath)
        playSound('select')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSelectEmulatorPath = async (): Promise<void> => {
    try {
      const selected = await window.api.selectFile()
      if (selected) {
        onSetPaths(romsDir, selected)
        playSound('select')
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Helper to determine if a controller button is currently pressed
  const isPressed = (index: number): boolean => activeButtons.includes(index)

  return (
    <div className="sw-settings-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', duration: 0.4 }}
        className="sw-settings-container"
      >
        {/* Settings Header */}
        <header className="sw-settings-header">
          <div className="sw-settings-title-group">
            <span className="sw-settings-gear">⚙️</span>
            <h2>Configuración de la Consola</h2>
          </div>
          <button className="sw-settings-close-btn" onClick={handleClose}>
            ✕
          </button>
        </header>

        {/* Settings Content Area */}
        <div className="sw-settings-body">
          {/* Sidebar */}
          <aside className="sw-settings-sidebar">
            <button
              className={`sw-settings-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => changeTab('general')}
            >
              📂 General
            </button>
            <button
              className={`sw-settings-tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => changeTab('audio')}
            >
              🔊 Audio
            </button>
            <button
              className={`sw-settings-tab-btn ${activeTab === 'pantalla' ? 'active' : ''}`}
              onClick={() => changeTab('pantalla')}
            >
              📺 Pantalla
            </button>
            <button
              className={`sw-settings-tab-btn ${activeTab === 'mandos' ? 'active' : ''}`}
              onClick={() => changeTab('mandos')}
            >
              🎮 Mandos
            </button>
            <button
              className={`sw-settings-tab-btn ${activeTab === 'informacion' ? 'active' : ''}`}
              onClick={() => changeTab('informacion')}
            >
              ℹ️ Información
            </button>
          </aside>

          {/* Right Pane */}
          <main className="sw-settings-pane">
            {activeTab === 'general' && (
              <div className="sw-settings-section">
                <h3>General</h3>
                <div className="sw-settings-card">
                  <div className="sw-settings-row" style={{ gap: 15 }}>
                    <div style={{ flex: 1 }}>
                      <div className="sw-setting-label">Directorio de ROMs</div>
                      <div className="sw-setting-desc">Ubicación donde el launcher busca tus juegos (*.nsp, *.xci)</div>
                      <code className="sw-setting-path" style={{ display: 'block', marginTop: 5, fontSize: 11 }}>{romsDir}</code>
                    </div>
                    <button
                      onClick={handleSelectRomsDir}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        alignSelf: 'center'
                      }}
                    >
                      SELECCIONAR
                    </button>
                  </div>
                  <div className="sw-settings-row" style={{ gap: 15 }}>
                    <div style={{ flex: 1 }}>
                      <div className="sw-setting-label">Ejecutable de EDEN</div>
                      <div className="sw-setting-desc">Ruta al emulador utilizado para iniciar los juegos</div>
                      <code className="sw-setting-path" style={{ display: 'block', marginTop: 5, fontSize: 11 }}>{emulatorPath}</code>
                    </div>
                    <button
                      onClick={handleSelectEmulatorPath}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        alignSelf: 'center'
                      }}
                    >
                      SELECCIONAR
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'audio' && (
              <div className="sw-settings-section">
                <h3>Sonido y Música</h3>
                <div className="sw-settings-card">
                  <div className="sw-settings-row interactive" onClick={onToggleSound}>
                    <div>
                      <div className="sw-setting-label">Efectos de Sonido</div>
                      <div className="sw-setting-desc">Sonidos cortos al navegar por la biblioteca y menús</div>
                    </div>
                    <div className={`sw-switch ${soundEnabled ? 'on' : ''}`}>
                      <div className="sw-switch-handle" />
                    </div>
                  </div>
                  <div className="sw-settings-row interactive" onClick={onToggleMusic} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 20, marginTop: 20 }}>
                    <div>
                      <div className="sw-setting-label">Música de Fondo</div>
                      <div className="sw-setting-desc">Música instrumental relajante de fondo en los menús</div>
                    </div>
                    <div className={`sw-switch ${musicEnabled ? 'on' : ''}`}>
                      <div className="sw-switch-handle" />
                    </div>
                  </div>
                  {musicEnabled && (
                    <div className="sw-settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10, borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 20, marginTop: 20 }}>
                      <div>
                        <div className="sw-setting-label">Volumen de Música: {Math.round(musicVolume * 100)}%</div>
                        <div className="sw-setting-desc">Ajusta el volumen de la melodía de fondo</div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={musicVolume}
                        onChange={(e) => onMusicVolumeChange(Number(e.target.value))}
                        style={{
                          width: '100%',
                          height: '6px',
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: '3px',
                          outline: 'none',
                          cursor: 'pointer',
                          marginTop: '8px',
                          accentColor: 'var(--sw-cyan)'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'pantalla' && (
              <div className="sw-settings-section">
                <h3>Pantalla</h3>
                <div className="sw-settings-card">
                  <div className="sw-settings-row interactive" onClick={onToggleFullscreen}>
                    <div>
                      <div className="sw-setting-label">Pantalla Completa</div>
                      <div className="sw-setting-desc">Expandir el launcher para cubrir todo el monitor</div>
                    </div>
                    <div className={`sw-switch ${isFullscreen ? 'on' : ''}`}>
                      <div className="sw-switch-handle" />
                    </div>
                  </div>

                  {/* Theme Selector */}
                  <div className="sw-settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 20 }}>
                    <div>
                      <div className="sw-setting-label">Tema de la Consola</div>
                      <div className="sw-setting-desc">Selecciona un esquema de colores para personalizar la interfaz</div>
                    </div>
                    <div className="sw-theme-grid">
                      {[
                        { id: 'neon', name: 'Joy-Con Neon', colors: ['#e4000f', '#00d1d1'] },
                        { id: 'oled', name: 'OLED White', colors: ['#ffffff', '#8e8e93'] },
                        { id: 'splatoon', name: 'Splatoon', colors: ['#2bf016', '#bf00ff'] },
                        { id: 'zelda', name: 'Zelda Legend', colors: ['#d4af37', '#0f5223'] }
                      ].map((t) => (
                        <div
                          key={t.id}
                          className={`sw-theme-card ${activeTheme === t.id ? 'active' : ''}`}
                          onClick={() => {
                            onChangeTheme(t.id)
                            playSound('select')
                          }}
                        >
                          <div className="sw-theme-dots">
                            <div className="sw-theme-dot" style={{ backgroundColor: t.colors[0] }} />
                            <div className="sw-theme-dot" style={{ backgroundColor: t.colors[1] }} />
                          </div>
                          <span className="sw-theme-name">{t.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'mandos' && (
              <div className="sw-settings-section">
                <h3>Configuración de Mandos</h3>
                <div className="sw-settings-card">
                  {gamepadName ? (
                    <div className="sw-gamepad-tester">
                      <div className="sw-gamepad-status success">
                        🟢 Mando detectado: <span className="sw-gamepad-name">{gamepadName}</span>
                      </div>
                      
                      <div className="sw-tester-visualizer">
                        {/* Interactive gamepad tester view */}
                        <div className="sw-controller-silhouette">
                          {/* Face Buttons */}
                          <div className="sw-controller-face-buttons">
                            <div className={`sw-controller-btn btn-x ${isPressed(2) ? 'pressed' : ''}`}>X</div>
                            <div className="sw-controller-middle-row">
                              <div className={`sw-controller-btn btn-y ${isPressed(3) ? 'pressed' : ''}`}>Y</div>
                              <div className={`sw-controller-btn btn-a ${isPressed(0) ? 'pressed' : ''}`}>A</div>
                            </div>
                            <div className={`sw-controller-btn btn-b ${isPressed(1) ? 'pressed' : ''}`}>B</div>
                          </div>

                          {/* D-Pad */}
                          <div className="sw-controller-dpad">
                            <div className={`sw-dpad-dir up ${isPressed(12) ? 'pressed' : ''}`}>▲</div>
                            <div className="sw-dpad-row">
                              <div className={`sw-dpad-dir left ${isPressed(14) ? 'pressed' : ''}`}>◀</div>
                              <div className="sw-dpad-center" />
                              <div className={`sw-dpad-dir right ${isPressed(15) ? 'pressed' : ''}`}>▶</div>
                            </div>
                            <div className={`sw-dpad-dir down ${isPressed(13) ? 'pressed' : ''}`}>▼</div>
                          </div>

                          {/* Sticks */}
                          <div className="sw-controller-sticks">
                            <div className="sw-stick-indicator">
                              <span className="sw-stick-title">Stick Izd.</span>
                              <div className="sw-stick-ring">
                                <div 
                                  className="sw-stick-dot"
                                  style={{
                                    transform: `translate(${axes[0] ? axes[0] * 12 : 0}px, ${axes[1] ? axes[1] * 12 : 0}px)`
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Menu buttons */}
                          <div className="sw-controller-system-buttons">
                            <div className={`sw-controller-sysbtn btn-select ${isPressed(8) ? 'pressed' : ''}`}>Share</div>
                            <div className={`sw-controller-sysbtn btn-start ${isPressed(9) ? 'pressed' : ''}`}>Options</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="sw-tester-guide">
                        Presiona botones en tu mando de PS4, PS5, Switch Pro o Xbox para probarlos.
                      </div>
                    </div>
                  ) : (
                    <div className="sw-gamepad-status error">
                      🔴 No hay ningún mando conectado.
                      <div className="sw-gamepad-instruction">
                        Conecta un mando mediante USB o Bluetooth y presiona cualquier botón para sincronizarlo.
                      </div>
                    </div>
                  )}

                  {/* Custom Exit Button Mapper */}
                  <div className="sw-settings-row" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 20 }}>
                    <div>
                      <div className="sw-setting-label">Botón para Cerrar Launcher</div>
                      <div className="sw-setting-desc">Presiona este botón dos veces en el menú del Launcher para cerrar la aplicación</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button
                        className={`sw-btn-mapping ${isMappingButton ? 'mapping' : ''}`}
                        onClick={handleStartMapping}
                        disabled={isMappingButton}
                        style={{
                          padding: '8px 16px',
                          background: isMappingButton ? '#e4000f' : 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: 6,
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isMappingButton ? 'default' : 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {isMappingButton ? 'Presiona un botón en el mando...' : stopButtonIndex !== null ? `BOTÓN ${stopButtonIndex}` : 'CONFIGURAR'}
                      </button>
                      {stopButtonIndex !== null && (
                        <button
                          onClick={() => {
                            onSetStopButtonIndex(null)
                            playSound('back')
                          }}
                          style={{
                            padding: '8px 16px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: 6,
                            color: '#f87171',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          BORRAR
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Controller Vibration Toggle */}
                  <div className="sw-settings-row interactive" onClick={onToggleVibration} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: 20, marginTop: 20 }}>
                    <div>
                      <div className="sw-setting-label">Vibración del Mando (Haptic Feedback)</div>
                      <div className="sw-setting-desc">Activar efectos de vibración al navegar y seleccionar en la interfaz</div>
                    </div>
                    <div className={`sw-switch ${vibrationEnabled ? 'on' : ''}`}>
                      <div className="sw-switch-handle" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'informacion' && (
              <div className="sw-settings-section">
                <h3>Información de EDEN LAUNCHER</h3>
                <div className="sw-settings-card info-card">
                  <div className="sw-info-title">EDEN Launcher</div>
                  <div className="sw-info-version">Versión 1.2.0</div>
                  <hr className="sw-info-divider" />
                  <p className="sw-info-text">
                    Lanzador optimizado para emulación con soporte nativo de controladores, retroalimentación sonora y transición inmersiva de procesos.
                  </p>
                  <div className="sw-info-tech">
                    <span>Vite</span>
                    <span>Electron</span>
                    <span>React</span>
                    <span>TypeScript</span>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Footer controls hint */}
        <footer className="sw-settings-footer">
          <div className="sw-settings-action-hint">
            <span className="sw-settings-btn-icon btn-b">B</span>
            <span>Atrás / Cerrar</span>
          </div>
        </footer>
      </motion.div>
    </div>
  )
}
