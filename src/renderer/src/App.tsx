import React, { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Game } from './types/game'
import { useKeyboardNav } from './hooks/useKeyboardNav'
import { useGamepad } from './hooks/useGamepad'
import {
  playSound,
  startAmbientMusic,
  stopAmbientMusic,
  updateAmbientVolume,
  vibrateGamepad
} from './utils/audio'
import Header from './components/Header'
import SystemNotifications from './components/SystemNotifications'
import GameCarousel from './components/GameCarousel'
import SystemFooter from './components/SystemFooter'
import LaunchOverlay from './components/LaunchOverlay'
import SettingsOverlay from './components/SettingsOverlay'
import VirtualKeyboard, { KEYBOARD_GRID } from './components/VirtualKeyboard'
import BootScreen from './components/BootScreen'
import CloseLauncherDialog from './components/CloseLauncherDialog'
import GameDetailsModal from './components/GameDetailsModal'
import './assets/main.css'

type TabType = 'general' | 'audio' | 'pantalla' | 'mandos' | 'informacion'
const SETTINGS_TABS: TabType[] = ['general', 'audio', 'pantalla', 'mandos', 'informacion']

function App(): React.JSX.Element {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [launchingGame, setLaunchingGame] = useState<Game | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Settings lifted states
  const [showSettings, setShowSettings] = useState(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState<TabType>('general')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [stopButtonIndex, setStopButtonIndex] = useState<number | null>(null)

  // New audio, haptic and notification states
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => {
    return localStorage.getItem('eden_music_enabled') !== 'false'
  })
  const [musicVolume, setMusicVolume] = useState<number>(() => {
    const vol = localStorage.getItem('eden_music_volume')
    return vol !== null ? Number(vol) : 0.3
  })
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => {
    return localStorage.getItem('eden_vibration_enabled') !== 'false'
  })
  const [notifications, setNotifications] = useState<{ id: string; type: 'info' | 'success' | 'warn'; text: string }[]>([])

  // Custom Themes and Dynamic paths
  const [activeTheme, setActiveTheme] = useState<string>(localStorage.getItem('eden_theme') || 'neon')
  const [romsDir, setRomsDir] = useState<string>('')
  const [emulatorPath, setEmulatorPath] = useState<string>('')
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('eden_favorites') || '[]')
    } catch {
      return []
    }
  })
  const [selectedGameDetails, setSelectedGameDetails] = useState<Game | null>(null)
  const [detailsFocusedIndex, setDetailsFocusedIndex] = useState<number>(0)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [hasInitialFocus, setHasInitialFocus] = useState(false)
  
  // Virtual Keyboard states
  const [keyboardActive, setKeyboardActive] = useState(false)
  const [virtualRow, setVirtualRow] = useState(1)
  const [virtualCol, setVirtualCol] = useState(0)

  // Dialog & Animation states
  const [booting, setBooting] = useState(true)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [closeDialogOption, setCloseDialogOption] = useState<'cancel' | 'confirm'>('cancel')
  const [exitingEmulation, setExitingEmulation] = useState(false)

  // Fetch games helper (shared by mount and observer triggers)
  const fetchGames = useCallback(async (): Promise<void> => {
    try {
      const result = await window.api.getGames()
      if (result.success) {
        setGames(result.games)
      } else {
        setError('No se pudieron cargar los juegos')
      }
    } catch (err) {
      setError('Error al conectar con el sistema')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load initial settings and games
  useEffect(() => {
    fetchGames()
    
    const savedSound = localStorage.getItem('eden_sound_enabled') !== 'false'
    setSoundEnabled(savedSound)
    
    const savedFullscreen = localStorage.getItem('eden_fullscreen') === 'true'
    setIsFullscreen(savedFullscreen)

    const savedStopBtn = localStorage.getItem('eden_stop_button_index')
    if (savedStopBtn !== null) {
      setStopButtonIndex(Number(savedStopBtn))
    }

    // Fetch dynamic paths from backend
    window.api.getPaths().then((paths) => {
      setRomsDir(paths.romsDir)
      setEmulatorPath(paths.emulatorPath)
    }).catch(console.error)
  }, [fetchGames])

  const handleSetStopButtonIndex = useCallback((val: number | null) => {
    setStopButtonIndex(val)
    if (val !== null) {
      localStorage.setItem('eden_stop_button_index', String(val))
    } else {
      localStorage.removeItem('eden_stop_button_index')
    }
  }, [])

  const handleCloseDialogConfirm = useCallback(() => {
    playSound('select')
    window.api.closeWindow()
  }, [])

  const handleCloseDialogCancel = useCallback(() => {
    setShowCloseDialog(false)
    playSound('back')
  }, [])

  const handleToggleFavorite = useCallback((game: Game) => {
    playSound('select')
    vibrateGamepad('fav')
    setFavorites((prev) => {
      const key = game.titleId || game.path
      let next: string[]
      if (prev.includes(key)) {
        next = prev.filter((id) => id !== key)
      } else {
        next = [...prev, key]
      }
      localStorage.setItem('eden_favorites', JSON.stringify(next))
      return next
    })
  }, [])

  const handleThemeChange = useCallback((themeName: string) => {
    setActiveTheme(themeName)
    localStorage.setItem('eden_theme', themeName)
  }, [])

  const handleSetPaths = useCallback(async (newRomsDir: string, newEmulatorPath: string) => {
    try {
      const result = await window.api.setPaths({ romsDir: newRomsDir, emulatorPath: newEmulatorPath })
      if (result.success) {
        setRomsDir(newRomsDir)
        setEmulatorPath(newEmulatorPath)
        fetchGames()
      }
    } catch (e) {
      console.error(e)
    }
  }, [fetchGames])

  // Watch for directory changes to auto-update library
  useEffect(() => {
    const unsubscribe = window.api.onGamesChanged(() => {
      console.log('[RENDERER] Games folder modified. Auto-reloading library...')
      fetchGames()
    })
    return () => unsubscribe()
  }, [fetchGames])

  // Filter games based on search query (initials prefix matching first)
  const filteredGames = games.filter((game) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    
    // Exact startsWith matches first
    if (game.name.toLowerCase().startsWith(q)) return true
    
    // StartsWith on any individual word (e.g. "Arceus" matches "Pokémon Legends: Arceus")
    const words = game.name.toLowerCase().split(/\s+/)
    if (words.some((word) => word.startsWith(q))) return true
    
    // Substring fallback
    return game.name.toLowerCase().includes(q)
  })

  // Dynamic search suggestions for the virtual keyboard
  const suggestions = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return []
    const matches = games
      .filter((game) => game.name.toLowerCase().includes(q) && game.name.toLowerCase() !== q)
      .map((game) => game.name)
    return Array.from(new Set(matches)).slice(0, 3)
  }, [searchQuery, games])

  const handleKeyPress = useCallback((key: string) => {
    if (key === 'Borrar ⌫') {
      setSearchQuery((prev) => prev.slice(0, -1))
      playSound('back')
    } else if (key === 'Limpiar ✕') {
      setSearchQuery('')
      playSound('back')
    } else if (key === 'Espacio ␣') {
      setSearchQuery((prev) => prev + ' ')
      playSound('select')
    } else {
      setSearchQuery((prev) => prev + key)
      playSound('select')
    }
  }, [])

  const handleSuggestionSelect = useCallback((sug: string) => {
    setSearchQuery(sug)
    setKeyboardActive(false)
    playSound('select')
    const searchInput = document.querySelector('.sw-search-input') as HTMLInputElement | null
    searchInput?.blur()
  }, [])

  const handleCloseKeyboard = useCallback(() => {
    setKeyboardActive(false)
    playSound('select')
    const searchInput = document.querySelector('.sw-search-input') as HTMLInputElement | null
    searchInput?.blur()
  }, [])

  const triggerKeySelection = useCallback(() => {
    if (virtualRow === 0 && suggestions.length > 0) {
      const sug = suggestions[virtualCol]
      if (sug) {
        handleSuggestionSelect(sug)
      }
    } else if (virtualRow >= 1 && virtualRow <= 4) {
      const char = KEYBOARD_GRID[virtualRow - 1][virtualCol]
      handleKeyPress(char)
    } else if (virtualRow === 5) {
      if (virtualCol < 5) {
        handleKeyPress('Borrar ⌫')
      } else {
        handleCloseKeyboard()
      }
    }
  }, [virtualRow, virtualCol, suggestions, handleKeyPress, handleSuggestionSelect, handleCloseKeyboard])

  // Auto-clamp virtual keyboard cursor when suggestions shrink or are cleared
  useEffect(() => {
    if (keyboardActive && suggestions.length === 0 && virtualRow === 0) {
      setVirtualRow(1)
      setVirtualCol(0)
    }
  }, [suggestions.length, keyboardActive, virtualRow])

  const [selectedIndex, setSelectedIndex] = useKeyboardNav(filteredGames.length)

  // Auto-clamp selected index if the list shrinks during search filtering
  useEffect(() => {
    if (selectedIndex >= filteredGames.length && filteredGames.length > 0) {
      setSelectedIndex(filteredGames.length - 1)
    }
  }, [filteredGames.length, selectedIndex, setSelectedIndex])

  // Lifted state toggles
  const handleToggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev
      localStorage.setItem('eden_sound_enabled', String(next))
      playSound(next ? 'toggle-on' : 'toggle-off')
      return next
    })
  }, [])

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev
      localStorage.setItem('eden_fullscreen', String(next))
      window.api.setFullscreen(next)
      playSound(next ? 'toggle-on' : 'toggle-off')
      return next
    })
  }, [])

  const handleToggleMusic = useCallback(() => {
    setMusicEnabled((prev) => {
      const next = !prev
      localStorage.setItem('eden_music_enabled', String(next))
      if (next) {
        startAmbientMusic()
      } else {
        stopAmbientMusic()
      }
      playSound(next ? 'toggle-on' : 'toggle-off')
      return next
    })
  }, [])

  const handleMusicVolumeChange = useCallback((vol: number) => {
    setMusicVolume(vol)
    updateAmbientVolume(vol)
  }, [])

  const handleToggleVibration = useCallback(() => {
    setVibrationEnabled((prev) => {
      const next = !prev
      localStorage.setItem('eden_vibration_enabled', String(next))
      playSound(next ? 'toggle-on' : 'toggle-off')
      return next
    })
  }, [])

  const addNotification = useCallback((text: string, type: 'info' | 'success' | 'warn' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setNotifications((prev) => [...prev, { id, type, text }])
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 4000)
  }, [])

  // Gamepad Hotplug Alerts
  useEffect(() => {
    const handleGamepadConnected = (e: GamepadEvent) => {
      console.log('Gamepad connected:', e.gamepad)
      playSound('chime-connect')
      setTimeout(() => {
        vibrateGamepad('select')
      }, 100)
      addNotification(`Mando conectado: ${e.gamepad.id}`, 'success')
    }

    const handleGamepadDisconnected = (e: GamepadEvent) => {
      console.log('Gamepad disconnected:', e.gamepad)
      playSound('chime-disconnect')
      addNotification(`Mando desconectado: ${e.gamepad.id}`, 'warn')
    }

    window.addEventListener('gamepadconnected', handleGamepadConnected)
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected)

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected)
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected)
    }
  }, [addNotification])

  // Ambient Music Control
  useEffect(() => {
    const startMusicWithInteraction = () => {
      if (musicEnabled && !booting) {
        startAmbientMusic()
      }
      window.removeEventListener('click', startMusicWithInteraction)
      window.removeEventListener('keydown', startMusicWithInteraction)
      window.removeEventListener('gamepadconnected', startMusicWithInteraction)
    }
    
    if (musicEnabled && !booting) {
      startAmbientMusic()
      window.addEventListener('click', startMusicWithInteraction)
      window.addEventListener('keydown', startMusicWithInteraction)
      window.addEventListener('gamepadconnected', startMusicWithInteraction)
    } else {
      stopAmbientMusic()
    }

    return () => {
      stopAmbientMusic()
      window.removeEventListener('click', startMusicWithInteraction)
      window.removeEventListener('keydown', startMusicWithInteraction)
      window.removeEventListener('gamepadconnected', startMusicWithInteraction)
    }
  }, [musicEnabled, booting])

  // Handle Confirmed launch
  const handleLaunch = useCallback(
    async (game: Game) => {
      if (launching) return
      playSound('select')
      vibrateGamepad('select')
      setLaunchingGame(game)
      setLaunching(true)

      // Show overlay for 2s then actually launch
      setTimeout(async () => {
        try {
          await window.api.launchGame(game.path)
        } catch (err) {
          console.error('Launch failed:', err)
          setLaunching(false)
          setLaunchingGame(null)
        }
      }, 2000)
    },
    [launching]
  )

  // Keyboard navigation confirm handler
  useEffect(() => {
    const handleEnter = (e: KeyboardEvent): void => {
      if (
        e.key === 'Enter' &&
        !launching &&
        filteredGames.length > 0 &&
        !showSettings &&
        !showCloseDialog &&
        !selectedGameDetails &&
        !booting &&
        document.activeElement?.tagName !== 'INPUT'
      ) {
        setSelectedGameDetails(filteredGames[selectedIndex])
        setDetailsFocusedIndex(0)
        playSound('select')
      }
    }
    window.addEventListener('keydown', handleEnter)
    return () => window.removeEventListener('keydown', handleEnter)
  }, [selectedIndex, filteredGames, launching, showSettings, showCloseDialog, selectedGameDetails, booting])

  // Keyboard settings navigation (Arrow Up/Down/Enter inside settings modal)
  useEffect(() => {
    const handleSettingsKeys = (e: KeyboardEvent): void => {
      if (!showSettings) return
      
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveSettingsTab((prev) => {
          const idx = SETTINGS_TABS.indexOf(prev)
          const nextIdx = idx > 0 ? idx - 1 : SETTINGS_TABS.length - 1
          playSound('tab')
          return SETTINGS_TABS[nextIdx]
        })
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveSettingsTab((prev) => {
          const idx = SETTINGS_TABS.indexOf(prev)
          const nextIdx = idx < SETTINGS_TABS.length - 1 ? idx + 1 : 0
          playSound('tab')
          return SETTINGS_TABS[nextIdx]
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (activeSettingsTab === 'audio') {
          handleToggleSound()
        } else if (activeSettingsTab === 'pantalla') {
          handleToggleFullscreen()
        }
      }
    }
    window.addEventListener('keydown', handleSettingsKeys)
    return () => window.removeEventListener('keydown', handleSettingsKeys)
  }, [showSettings, activeSettingsTab, handleToggleSound, handleToggleFullscreen])

  // Keyboard slash "/" to focus search bar, Escape to blur
  useEffect(() => {
    const handleSearchKeys = (e: KeyboardEvent): void => {
      if (launching || showSettings || showCloseDialog || booting) return
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        const searchInput = document.querySelector('.sw-search-input') as HTMLInputElement | null
        searchInput?.focus()
        setKeyboardActive(true)
        playSound('select')
      } else if (e.key === 'Escape' && document.activeElement?.tagName === 'INPUT') {
        e.preventDefault()
        const searchInput = document.querySelector('.sw-search-input') as HTMLInputElement | null
        searchInput?.blur()
        setKeyboardActive(false)
        playSound('back')
      }
    }
    window.addEventListener('keydown', handleSearchKeys)
    return () => window.removeEventListener('keydown', handleSearchKeys)
  }, [launching, showSettings, showCloseDialog, booting])

  // Keyboard handlers for close confirmation dialog
  useEffect(() => {
    if (!showCloseDialog) return

    const handleCloseKeys = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCloseDialogOption('confirm')
        playSound('move')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCloseDialogOption('cancel')
        playSound('move')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (closeDialogOption === 'confirm') {
          handleCloseDialogConfirm()
        } else {
          handleCloseDialogCancel()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCloseDialogCancel()
      }
    }

    window.addEventListener('keydown', handleCloseKeys)
    return () => window.removeEventListener('keydown', handleCloseKeys)
  }, [showCloseDialog, closeDialogOption, handleCloseDialogConfirm, handleCloseDialogCancel])

  // Keyboard handlers for game details modal
  useEffect(() => {
    if (!selectedGameDetails) return

    const handleDetailsKeys = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setDetailsFocusedIndex((prev) => Math.max(0, prev - 1))
        playSound('move')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setDetailsFocusedIndex((prev) => Math.min(2, prev + 1))
        playSound('move')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (detailsFocusedIndex === 0) {
          handleLaunch(selectedGameDetails)
          setSelectedGameDetails(null)
        } else if (detailsFocusedIndex === 1) {
          handleToggleFavorite(selectedGameDetails)
        } else {
          setSelectedGameDetails(null)
          playSound('back')
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setSelectedGameDetails(null)
        playSound('back')
      }
    }

    window.addEventListener('keydown', handleDetailsKeys)
    return () => window.removeEventListener('keydown', handleDetailsKeys)
  }, [selectedGameDetails, detailsFocusedIndex, handleLaunch, handleToggleFavorite])

  // Keyboard navigation for the virtual keyboard
  useEffect(() => {
    if (!keyboardActive) return

    const handleVKKeys = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setVirtualRow((prev) => {
          const minRow = suggestions.length > 0 ? 0 : 1
          const next = Math.max(minRow, prev - 1)
          if (next === 0) {
            setVirtualCol((c) => Math.min(c, suggestions.length - 1))
          }
          playSound('tab')
          return next
        })
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setVirtualRow((prev) => {
          const next = Math.min(5, prev + 1)
          playSound('tab')
          return next
        })
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setVirtualCol((prev) => {
          const next = Math.max(0, prev - 1)
          playSound('tab')
          return next
        })
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setVirtualCol((prev) => {
          const maxCol = virtualRow === 0 ? suggestions.length - 1 : 9
          const next = Math.min(maxCol, prev + 1)
          playSound('tab')
          return next
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        triggerKeySelection()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCloseKeyboard()
        playSound('back')
      }
    }
    window.addEventListener('keydown', handleVKKeys)
    return () => window.removeEventListener('keydown', handleVKKeys)
  }, [keyboardActive, virtualRow, virtualCol, suggestions, triggerKeySelection, handleCloseKeyboard])

  // Play sound when selected index changes
  const isFirstIndexRender = useRef(true)
  useEffect(() => {
    if (isFirstIndexRender.current) {
      isFirstIndexRender.current = false
      return
    }
    if (filteredGames.length > 0 && !showSettings) {
      playSound('move')
    }
  }, [selectedIndex, filteredGames.length, showSettings])

  // Gamepad navigation connection
  useGamepad({
    onLeft: () => {
      if (selectedGameDetails) {
        setDetailsFocusedIndex((prev) => Math.max(0, prev - 1))
        playSound('move')
        return
      }
      if (showCloseDialog) {
        setCloseDialogOption('confirm')
        playSound('move')
        return
      }
      if (showSettings) return
      if (keyboardActive) {
        setVirtualCol((prev) => Math.max(0, prev - 1))
        playSound('tab')
        return
      }
      setSelectedIndex((prev) => Math.max(0, prev - 1))
    },
    onRight: () => {
      if (selectedGameDetails) {
        setDetailsFocusedIndex((prev) => Math.min(2, prev + 1))
        playSound('move')
        return
      }
      if (showCloseDialog) {
        setCloseDialogOption('cancel')
        playSound('move')
        return
      }
      if (showSettings) return
      if (keyboardActive) {
        const maxCol = virtualRow === 0 ? suggestions.length - 1 : 9
        setVirtualCol((prev) => Math.min(maxCol, prev + 1))
        playSound('tab')
        return
      }
      setSelectedIndex((prev) => Math.min(filteredGames.length - 1, prev + 1))
    },
    onUp: () => {
      if (selectedGameDetails) return
      if (showCloseDialog) return
      if (showSettings) {
        setActiveSettingsTab((prev) => {
          const idx = SETTINGS_TABS.indexOf(prev)
          const nextIdx = idx > 0 ? idx - 1 : SETTINGS_TABS.length - 1
          playSound('tab')
          return SETTINGS_TABS[nextIdx]
        })
        return
      }
      if (keyboardActive) {
        setVirtualRow((prev) => {
          const minRow = suggestions.length > 0 ? 0 : 1
          const next = Math.max(minRow, prev - 1)
          if (next === 0) {
            setVirtualCol((c) => Math.min(c, suggestions.length - 1))
          }
          playSound('tab')
          return next
        })
        return
      }
    },
    onDown: () => {
      if (selectedGameDetails) return
      if (showCloseDialog) return
      if (showSettings) {
        setActiveSettingsTab((prev) => {
          const idx = SETTINGS_TABS.indexOf(prev)
          const nextIdx = idx < SETTINGS_TABS.length - 1 ? idx + 1 : 0
          playSound('tab')
          return SETTINGS_TABS[nextIdx]
        })
        return
      }
      if (keyboardActive) {
        setVirtualRow((prev) => {
          const next = Math.min(5, prev + 1)
          playSound('tab')
          return next
        })
        return
      }
    },
    onConfirm: () => {
      if (selectedGameDetails) {
        if (detailsFocusedIndex === 0) {
          handleLaunch(selectedGameDetails)
          setSelectedGameDetails(null)
        } else if (detailsFocusedIndex === 1) {
          handleToggleFavorite(selectedGameDetails)
        } else {
          setSelectedGameDetails(null)
          playSound('back')
        }
        return
      }
      if (showCloseDialog) {
        if (closeDialogOption === 'confirm') {
          handleCloseDialogConfirm()
        } else {
          handleCloseDialogCancel()
        }
        return
      }
      if (showSettings) {
        if (activeSettingsTab === 'audio') {
          handleToggleSound()
        } else if (activeSettingsTab === 'pantalla') {
          handleToggleFullscreen()
        }
        return
      }
      if (keyboardActive) {
        triggerKeySelection()
        return
      }
      if (filteredGames.length > 0 && !launching) {
        setSelectedGameDetails(filteredGames[selectedIndex])
        setDetailsFocusedIndex(0)
        playSound('select')
      }
    },
    onBack: () => {
      if (selectedGameDetails) {
        setSelectedGameDetails(null)
        playSound('back')
        return
      }
      if (showCloseDialog) {
        handleCloseDialogCancel()
        return
      }
      if (showSettings) {
        setShowSettings(false)
        playSound('back')
      } else if (keyboardActive) {
        handleCloseKeyboard()
      } else if (document.activeElement?.tagName === 'INPUT') {
        // Blur search bar on cancel/back press
        const searchInput = document.querySelector('.sw-search-input') as HTMLInputElement | null
        searchInput?.blur()
        setKeyboardActive(false)
        playSound('back')
      } else {
        playSound('back')
      }
    },
    onOptions: () => {
      if (showCloseDialog || selectedGameDetails) return
      setShowSettings((prev) => {
        const next = !prev
        playSound(next ? 'select' : 'back')
        return next
      })
    },
    onSearch: () => {
      if (showCloseDialog || showSettings || launching || selectedGameDetails) return
      const searchInput = document.querySelector('.sw-search-input') as HTMLInputElement | null
      if (searchInput) {
        if (document.activeElement === searchInput) {
          searchInput.blur()
          setKeyboardActive(false)
          playSound('back')
        } else {
          searchInput.focus()
          setKeyboardActive(true)
          playSound('select')
        }
      }
    },
    onStopButtonDoublePress: () => {
      if (!launching && !showSettings && !booting && !exitingEmulation && !selectedGameDetails) {
        setShowCloseDialog(true)
        playSound('select')
      }
    }
  }, stopButtonIndex)

  // Listen to IPC event when emulator exits to restore immersion
  useEffect(() => {
    const unsubscribe = window.api.onGameExited(() => {
      console.log('[RENDERER] Game exited notification received.')
      setLaunching(false)
      setLaunchingGame(null)

      // Show smooth exiting overlay
      setExitingEmulation(true)
      setTimeout(() => {
        setExitingEmulation(false)
      }, 1200)

      // Force fullscreen on return as requested
      setIsFullscreen(true)
      localStorage.setItem('eden_fullscreen', 'true')
      window.api.setFullscreen(true)

      // Refetch games to update play order in real time!
      fetchGames()
    })
    return () => unsubscribe()
  }, [fetchGames])

  // Focus the selected carousel tile automatically on mount, tab changes, index changes, or settings closed
  useEffect(() => {
    if (!loading && !showSettings && !selectedGameDetails && !launching && !booting && !showCloseDialog && !exitingEmulation) {
      const timer = setTimeout(() => {
        const focusedTile = document.querySelector('.sw-tile-focused') as HTMLDivElement | null
        const activeEl = document.activeElement
        
        // Force focus to carousel tile on initial load to override browser's default input focus
        const forceInitial = !hasInitialFocus
        if (forceInitial) {
          setHasInitialFocus(true)
        }

        const isInput = activeEl?.tagName === 'INPUT'
        const isSettings = activeEl?.closest('.sw-settings-overlay')
        const isDetails = activeEl?.closest('.sw-details-overlay')
        if (focusedTile && (forceInitial || (!isInput && !isSettings && !isDetails && !keyboardActive))) {
          if (isInput && forceInitial) {
            (activeEl as HTMLInputElement).blur()
          }
          focusedTile.focus()
        }
      }, 150) // 150ms timeout ensures DOM is fully rendered and settled
      return () => clearTimeout(timer)
    }
    return undefined
  }, [loading, showSettings, selectedGameDetails, launching, booting, showCloseDialog, exitingEmulation, selectedIndex, filteredGames.length, hasInitialFocus, keyboardActive])

  return (
    <div className={`sw-layout theme-${activeTheme}`}>
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <SystemNotifications notifications={notifications} />

      <main className="sw-main">
        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16
            }}
          >
            <div className="sw-spinner" />
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              Cargando biblioteca de juegos...
            </span>
          </div>
        )}

        {error && !loading && (
          <div style={{ color: '#ff6b6b', fontSize: 14, textAlign: 'center' }}>{error}</div>
        )}

        {!loading && !error && (
          <GameCarousel
            games={filteredGames}
            selectedIndex={selectedIndex}
            onSelectIndex={setSelectedIndex}
            onLaunch={(game) => {
              setSelectedGameDetails(game)
              setDetailsFocusedIndex(0)
              playSound('select')
            }}
            favorites={favorites}
          />
        )}
      </main>

      <SystemFooter onOpenSettings={() => { setShowSettings(true); playSound('select'); }} />

      <AnimatePresence>
        {launching && launchingGame && (
          <LaunchOverlay game={launchingGame} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <SettingsOverlay
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            activeTab={activeSettingsTab}
            setActiveTab={setActiveSettingsTab}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            stopButtonIndex={stopButtonIndex}
            onSetStopButtonIndex={handleSetStopButtonIndex}
            activeTheme={activeTheme}
            onChangeTheme={handleThemeChange}
            romsDir={romsDir}
            emulatorPath={emulatorPath}
            onSetPaths={handleSetPaths}
            musicEnabled={musicEnabled}
            onToggleMusic={handleToggleMusic}
            musicVolume={musicVolume}
            onMusicVolumeChange={handleMusicVolumeChange}
            vibrationEnabled={vibrationEnabled}
            onToggleVibration={handleToggleVibration}
          />
        )}
      </AnimatePresence>

      <GameDetailsModal
        game={selectedGameDetails}
        isOpen={selectedGameDetails !== null}
        isFavorite={selectedGameDetails ? favorites.includes(selectedGameDetails.titleId || selectedGameDetails.path) : false}
        focusedIndex={detailsFocusedIndex}
        onToggleFavorite={() => selectedGameDetails && handleToggleFavorite(selectedGameDetails)}
        onLaunch={() => selectedGameDetails && handleLaunch(selectedGameDetails)}
        onClose={() => { setSelectedGameDetails(null); playSound('back'); }}
      />

      <AnimatePresence>
        {keyboardActive && (
          <VirtualKeyboard
            suggestions={suggestions}
            activeRow={virtualRow}
            activeCol={virtualCol}
            onKeyPress={handleKeyPress}
            onSuggestionSelect={handleSuggestionSelect}
            onClose={handleCloseKeyboard}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {booting && (
          <BootScreen onComplete={() => setBooting(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCloseDialog && (
          <CloseLauncherDialog
            isOpen={showCloseDialog}
            selectedOption={closeDialogOption}
            onSelectOption={setCloseDialogOption}
            onConfirm={handleCloseDialogConfirm}
            onCancel={handleCloseDialogCancel}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {exitingEmulation && (
          <motion.div
            className="sw-exit-overlay"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="sw-spinner" />
            <div className="sw-exit-text">Restaurando Eden Launcher...</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
