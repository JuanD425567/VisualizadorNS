import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export interface Game {
  name: string
  titleId: string
  path: string
  coverFile: string | null
  coverPath: string | null
}

export interface GamesResult {
  success: boolean
  games: Game[]
}

export interface LaunchResult {
  success: boolean
  error?: string
}

// Custom API exposed to renderer
const api = {
  getGames: (): Promise<GamesResult> => ipcRenderer.invoke('get-games'),
  getPaths: (): Promise<{ romsDir: string, emulatorPath: string }> => ipcRenderer.invoke('get-paths'),
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('select-directory'),
  selectFile: (): Promise<string | null> => ipcRenderer.invoke('select-file'),
  setPaths: (paths: { romsDir: string, emulatorPath: string }): Promise<{ success: boolean, error?: string }> =>
    ipcRenderer.invoke('set-paths', paths),
  launchGame: (romPath: string): Promise<LaunchResult> =>
    ipcRenderer.invoke('launch-game', romPath),
  getCover: (coverFile: string | null): Promise<string | null> =>
    ipcRenderer.invoke('get-cover', coverFile),
  startGamepadListen: (): Promise<number> => ipcRenderer.invoke('start-gamepad-listen'),
  stopGamepadListen: (): void => ipcRenderer.send('stop-gamepad-listen'),
  minimizeWindow: (): void => ipcRenderer.send('window-minimize'),
  maximizeWindow: (): void => ipcRenderer.send('window-maximize'),
  closeWindow: (): void => ipcRenderer.send('window-close'),
  showWindow: (): void => ipcRenderer.send('window-show'),
  setFullscreen: (flag: boolean): void => ipcRenderer.send('window-fullscreen', flag),
  onGameExited: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('game-exited', listener)
    return () => {
      ipcRenderer.removeListener('game-exited', listener)
    }
  },
  onGamesChanged: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('games-changed', listener)
    return () => {
      ipcRenderer.removeListener('games-changed', listener)
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
