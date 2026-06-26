export interface Game {
  name: string
  titleId: string
  path: string
  coverFile: string | null
  coverPath: string | null
  lastPlayed: number
  totalPlayTime: number
}

export interface GamesResult {
  success: boolean
  games: Game[]
}

export interface LaunchResult {
  success: boolean
  error?: string
}

// Extend window with our API
declare global {
  interface Window {
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
