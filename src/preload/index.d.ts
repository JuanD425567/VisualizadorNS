import { ElectronAPI } from '@electron-toolkit/preload'

interface Game {
  name: string
  titleId: string
  path: string
  coverFile: string | null
  coverPath: string | null
}

interface GamesResult {
  success: boolean
  games: Game[]
}

interface LaunchResult {
  success: boolean
  error?: string
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getGames: () => Promise<GamesResult>
      getPaths: () => Promise<{ romsDir: string; emulatorPath: string }>
      selectDirectory: () => Promise<string | null>
      selectFile: () => Promise<string | null>
      setPaths: (paths: { romsDir: string; emulatorPath: string }) => Promise<{ success: boolean; error?: string }>
      launchGame: (romPath: string) => Promise<LaunchResult>
      getCover: (coverFile: string | null) => Promise<string | null>
      startGamepadListen: () => Promise<number>
      stopGamepadListen: () => void
      minimizeWindow: () => void
      maximizeWindow: () => void
      closeWindow: () => void
      showWindow: () => void
      setFullscreen: (flag: boolean) => void
      onGameExited: (callback: () => void) => () => void
      onGamesChanged: (callback: () => void) => () => void
    }
  }
}

export type { Game, GamesResult, LaunchResult }
