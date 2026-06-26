import { app, shell, BrowserWindow, ipcMain, protocol, net, dialog } from 'electron'
import { join, basename } from 'path'
import { readdirSync, existsSync, watch, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { spawn, exec, execSync } from 'child_process'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// Register local-file scheme as privileged
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: {
      bypassCSP: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
])

// ── Configuration & Paths ────────────────────────────────────────────────────
const CONFIG_FILE = join(app.getPath('userData'), 'eden-config.json')

let ROMS_DIR = 'C:\\Users\\jdgar\\Desktop\\NINTENDO SW\\Rooms NS'
let EMULATOR_PATH = 'C:\\Users\\jdgar\\Desktop\\NINTENDO SW\\EMULADOR\\eden.exe'
const COVERS_DIR = join(__dirname, '../../resources/covers')
const USER_COVERS_DIR = join(app.getPath('userData'), 'covers')

if (!existsSync(USER_COVERS_DIR)) {
  try {
    mkdirSync(USER_COVERS_DIR, { recursive: true })
  } catch (err) {
    console.error('Failed to create USER_COVERS_DIR:', err)
  }
}

function loadConfig(): void {
  try {
    if (existsSync(CONFIG_FILE)) {
      const data = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
      if (data.romsDir) ROMS_DIR = data.romsDir
      if (data.emulatorPath) EMULATOR_PATH = data.emulatorPath
    }
  } catch (err) {
    console.error('Failed to load config:', err)
  }
}

function saveConfig(): void {
  try {
    writeFileSync(
      CONFIG_FILE,
      JSON.stringify({ romsDir: ROMS_DIR, emulatorPath: EMULATOR_PATH }, null, 2),
      'utf-8'
    )
  } catch (err) {
    console.error('Failed to save config:', err)
  }
}

loadConfig()

// ── ROM title ID → clean name map ────────────────────────────────────────────
const KNOWN_TITLES: Record<string, string> = {
  '01001F5010DFA000': 'Pokémon Legends: Arceus',
  '0100000000010000': 'Super Mario Odyssey',
  '01007EF00011E000': 'The Legend of Zelda: Breath of the Wild',
  '01006A800016E000': 'Super Smash Bros Ultimate'
}

const COVER_FILES: Record<string, string> = {
  '01001F5010DFA000': 'pokemon-arceus.png',
  '0100000000010000': 'mario-odyssey.png',
  '01007EF00011E000': 'zelda-botw.png',
  '01006A800016E000': 'super-smash-bros-ultimate.png'
}

// ── Parse a ROM filename into metadata ───────────────────────────────────────
function parseRomFile(filename: string): {
  name: string
  titleId: string
  path: string
  coverFile: string | null
} | null {
  if (!filename.endsWith('.nsp') && !filename.endsWith('.xci')) return null

  // Extract title ID from bracket pattern [XXXXXXXXXXXXXXXX]
  const titleIdMatch = filename.match(/\[([0-9A-Fa-f]{16})\]/)
  const titleId = titleIdMatch ? titleIdMatch[1].toUpperCase() : ''

  // Skip update files (title IDs ending in 800)
  if (titleId.endsWith('800')) return null

  // Strip file extension first
  let cleanName = filename.replace(/\.(nsp|xci)$/i, '')
  // Strip brackets, parentheses and tidy up spacing
  cleanName = cleanName.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim()

  const name = KNOWN_TITLES[titleId] || cleanName

  const coverFile = COVER_FILES[titleId] || null

  return {
    name,
    titleId,
    path: join(ROMS_DIR, filename),
    coverFile
  }
}

// ── Window and ROM Watcher Helpers ──────────────────────────────────────────
const HISTORY_FILE = join(app.getPath('userData'), 'play-history.json')

interface PlayHistoryEntry {
  lastPlayed: number
  totalPlayTime: number
}

function getPlayHistory(): Record<string, PlayHistoryEntry> {
  try {
    if (existsSync(HISTORY_FILE)) {
      const content = readFileSync(HISTORY_FILE, 'utf-8')
      const parsed = JSON.parse(content)
      const normalized: Record<string, PlayHistoryEntry> = {}
      for (const key of Object.keys(parsed)) {
        const val = parsed[key]
        if (typeof val === 'number') {
          normalized[key] = { lastPlayed: val, totalPlayTime: 0 }
        } else if (val && typeof val === 'object') {
          normalized[key] = {
            lastPlayed: typeof val.lastPlayed === 'number' ? val.lastPlayed : 0,
            totalPlayTime: typeof val.totalPlayTime === 'number' ? val.totalPlayTime : 0
          }
        }
      }
      return normalized
    }
  } catch (e) {
    console.error('Failed to read play history:', e)
  }
  return {}
}

function updatePlayHistory(gameKey: string): void {
  try {
    const history = getPlayHistory()
    if (!history[gameKey]) {
      history[gameKey] = { lastPlayed: 0, totalPlayTime: 0 }
    }
    history[gameKey].lastPlayed = Date.now()
    writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to save play history:', e)
  }
}

function addPlayTime(gameKey: string, durationMs: number): void {
  try {
    const history = getPlayHistory()
    if (!history[gameKey]) {
      history[gameKey] = { lastPlayed: 0, totalPlayTime: 0 }
    }
    history[gameKey].totalPlayTime += durationMs
    writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to save playtime:', e)
  }
}

const activeDownloads = new Set<string>()

function queueCoverDownload(titleId: string): void {
  if (!titleId || activeDownloads.has(titleId)) return
  activeDownloads.add(titleId)

  // Download URLs
  const urls = [
    `https://tinfoil.media/ti/${titleId}/0/0/`,
    `https://images.tgb.ovh/switch/${titleId}.png`
  ]

  const download = async (): Promise<void> => {
    const targetPath = join(USER_COVERS_DIR, `${titleId}.png`)
    for (const url of urls) {
      try {
        console.log(`[MAIN] Attempting to download cover for ${titleId} from ${url}...`)
        const response = await net.fetch(url)
        const contentType = response.headers.get('content-type')
        
        if (response.ok && contentType && contentType.startsWith('image/')) {
          const arrayBuffer = await response.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          writeFileSync(targetPath, buffer)
          console.log(`[MAIN] Cover downloaded successfully for ${titleId}: ${targetPath}`)
          
          // Notify the renderer that games list should reload to pick up the new cover
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('games-changed')
          }
          break // Stop on success
        } else {
          console.warn(`[MAIN] Failed to fetch cover from ${url}: Status ${response.status}, Content-Type ${contentType}`)
        }
      } catch (err) {
        console.error(`[MAIN] Exception downloading cover from ${url}:`, err)
      }
    }
    activeDownloads.delete(titleId)
  }

  download()
}

function findCoverFile(titleId: string, cleanName: string, romPath?: string): string | null {
  // 1. Check local ROM directory for matching cover file (offline matching next to ROM)
  if (romPath) {
    try {
      const baseWithoutExt = romPath.replace(/\.(nsp|xci)$/i, '')
      for (const ext of ['.png', '.jpg', '.jpeg']) {
        const localPath = baseWithoutExt + ext
        if (existsSync(localPath)) return localPath
      }
    } catch (err) {
      console.error('Error checking local ROM cover:', err)
    }
  }

  // 2. Check downloaded user covers directory by titleId
  if (titleId) {
    const pngPath = join(USER_COVERS_DIR, `${titleId}.png`)
    if (existsSync(pngPath)) return pngPath
    const jpgPath = join(USER_COVERS_DIR, `${titleId}.jpg`)
    if (existsSync(jpgPath)) return jpgPath
  }

  // 3. Check direct map in resources/covers
  if (titleId && COVER_FILES[titleId]) {
    const fullPath = join(COVERS_DIR, COVER_FILES[titleId])
    if (existsSync(fullPath)) return fullPath
  }

  // 4. Check titleId.png or titleId.jpg in resources/covers
  if (titleId) {
    const pngPath = join(COVERS_DIR, `${titleId}.png`)
    if (existsSync(pngPath)) return pngPath
    const jpgPath = join(COVERS_DIR, `${titleId}.jpg`)
    if (existsSync(jpgPath)) return jpgPath
  }

  // 5. Fuzzy search by clean name in USER_COVERS_DIR
  try {
    if (existsSync(USER_COVERS_DIR)) {
      const files = readdirSync(USER_COVERS_DIR)
      const normalizedName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')
      
      for (const file of files) {
        const fileBase = file.replace(/\.(png|jpg|jpeg)$/i, '')
        const normalizedFile = fileBase.toLowerCase().replace(/[^a-z0-9]/g, '')
        
        if (
          normalizedFile.includes(normalizedName) || 
          normalizedName.includes(normalizedFile)
        ) {
          return join(USER_COVERS_DIR, file)
        }
      }
    }
  } catch (err) {
    console.error('Error during fuzzy user cover matching:', err)
  }

  // 6. Fuzzy search by clean name in static COVERS_DIR
  try {
    if (existsSync(COVERS_DIR)) {
      const files = readdirSync(COVERS_DIR)
      const normalizedName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')
      
      for (const file of files) {
        const fileBase = file.replace(/\.(png|jpg|jpeg)$/i, '')
        const normalizedFile = fileBase.toLowerCase().replace(/[^a-z0-9]/g, '')
        
        if (
          normalizedFile.includes(normalizedName) || 
          normalizedName.includes(normalizedFile)
        ) {
          return join(COVERS_DIR, file)
        }
      }
    }
  } catch (err) {
    console.error('Error during fuzzy standard cover matching:', err)
  }

  return null
}

let romsWatcher: ReturnType<typeof watch> | null = null

function watchRomsDirectory(): void {
  if (romsWatcher) {
    romsWatcher.close()
  }

  if (!existsSync(ROMS_DIR)) {
    console.error(`ROMS_DIR does not exist: ${ROMS_DIR}`)
    return
  }

  try {
    romsWatcher = watch(ROMS_DIR, (eventType, filename) => {
      console.log(`Directory change detected: ${eventType} - ${filename}`)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('games-changed')
      }
    })
  } catch (err) {
    console.error('Failed to watch ROMs directory:', err)
  }
}

function execTasklist(pid: number): Promise<string> {
  return new Promise((resolve) => {
    exec(`tasklist /v /fi "PID eq ${pid}" /fo csv`, (_, stdout) => {
      resolve(stdout || '')
    })
  })
}

// ── IPC: Get list of games ───────────────────────────────────────────────────
ipcMain.handle('get-games', () => {
  try {
    const files = readdirSync(ROMS_DIR)
    const history = getPlayHistory()
    
    const games = files
      .map(parseRomFile)
      .filter(Boolean)
      .map((g) => {
        const key = g!.titleId || g!.path
        
        let coverPath: string | null = null
        if (g!.coverFile) {
          coverPath = join(COVERS_DIR, g!.coverFile)
        } else {
          coverPath = findCoverFile(g!.titleId, g!.name, g!.path)
        }

        if (!coverPath && g!.titleId) {
          queueCoverDownload(g!.titleId)
        }

        const entry = history[key]
        const lastPlayed = entry ? entry.lastPlayed : 0
        const totalPlayTime = entry ? entry.totalPlayTime : 0

        return {
          ...g!,
          coverPath,
          lastPlayed,
          totalPlayTime
        }
      })
    
    // Sort by lastPlayed descending, then alphabetically by name
    games.sort((a, b) => {
      if (b.lastPlayed !== a.lastPlayed) {
        return b.lastPlayed - a.lastPlayed
      }
      return a.name.localeCompare(b.name)
    })
    
    return { success: true, games }
  } catch (err) {
    console.error('Failed to read ROMs directory:', err)
    return { success: false, games: [] }
  }
})

function compileGamepadMonitor(): string {
  const userDataPath = app.getPath('userData')
  const csPath = join(userDataPath, 'gamepad-monitor-v5.cs')
  const exePath = join(userDataPath, 'gamepad-monitor-v5.exe')

  if (existsSync(exePath)) {
    return exePath
  }

  const csCode = `
using System;
using System.Runtime.InteropServices;
using System.Threading;

public class GamepadMonitor
{
    [DllImport("winmm.dll")]
    public static extern int joyGetPosEx(int uJoyID, ref JOYINFOEX pji);

    [DllImport("user32.dll")]
    private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    public const int JOYERR_NOERROR = 0;
    public const int JOY_RETURNALL = 0x000000FF;

    private const int INPUT_KEYBOARD = 1;
    private const uint KEYEVENTF_KEYUP = 0x0002;
    private const ushort VK_F5 = 0x74; // Corrected virtual key code (0x74 = F5)
    private const ushort SCAN_F5 = 0x3F; // Scan code for F5

    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
        public int type;
        public KEYBDINPUT ki;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOYINFOEX
    {
        public int dwSize;
        public int dwFlags;
        public int dwXpos;
        public int dwYpos;
        public int dwZpos;
        public int dwRpos;
        public int dwUpos;
        public int dwVpos;
        public int dwButtons;
        public int dwButtonNumber;
        public int dwPOV;
        public int dwReserved1;
        public int dwReserved2;
    }

    public static void SendF5()
    {
        INPUT[] inputs = new INPUT[2];

        // Key Down
        inputs[0].type = INPUT_KEYBOARD;
        inputs[0].ki.wVk = VK_F5;
        inputs[0].ki.wScan = SCAN_F5;
        inputs[0].ki.dwFlags = 0;

        // Key Up
        inputs[1].type = INPUT_KEYBOARD;
        inputs[1].ki.wVk = VK_F5;
        inputs[1].ki.wScan = SCAN_F5;
        inputs[1].ki.dwFlags = KEYEVENTF_KEYUP;

        SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
    }

    public static void Main(string[] args)
    {
        if (args.Length < 1)
        {
            Console.WriteLine("ERROR: Missing argument");
            return;
        }

        if (args[0] == "listen")
        {
            JOYINFOEX info = new JOYINFOEX();
            while (true)
            {
                for (int id = 0; id < 16; id++)
                {
                    info.dwSize = Marshal.SizeOf(typeof(JOYINFOEX));
                    info.dwFlags = JOY_RETURNALL;
                    if (joyGetPosEx(id, ref info) == JOYERR_NOERROR)
                    {
                        if (info.dwButtons != 0)
                        {
                            for (int btn = 0; btn < 32; btn++)
                            {
                                if ((info.dwButtons & (1 << btn)) != 0)
                                {
                                    Console.WriteLine("BUTTON " + btn);
                                    Console.Out.Flush();
                                    return;
                                }
                            }
                        }
                    }
                }
                Thread.Sleep(50);
            }
        }

        int targetButtonIndex = 0;
        if (!int.TryParse(args[0], out targetButtonIndex))
        {
            Console.WriteLine("ERROR: Invalid button index");
            return;
        }

        JOYINFOEX info2 = new JOYINFOEX();
        int buttonMask = 1 << targetButtonIndex;
        bool wasPressed = false;

        while (true)
        {
            bool isCurrentlyPressed = false;
            for (int id = 0; id < 16; id++)
            {
                info2.dwSize = Marshal.SizeOf(typeof(JOYINFOEX));
                info2.dwFlags = JOY_RETURNALL;
                if (joyGetPosEx(id, ref info2) == JOYERR_NOERROR)
                {
                    if ((info2.dwButtons & buttonMask) != 0)
                    {
                        isCurrentlyPressed = true;
                        break;
                    }
                }
            }

            if (isCurrentlyPressed && !wasPressed)
            {
                // Send F5 using SendInput (VK + scan code)
                SendF5();

                Console.WriteLine("STOP");
                Console.Out.Flush();
            }

            wasPressed = isCurrentlyPressed;
            Thread.Sleep(50);
        }
    }
}
`

  try {
    writeFileSync(csPath, csCode, 'utf-8')
    const cscPaths = [
      'C:\\\\Windows\\\\Microsoft.NET\\\\Framework64\\\\v4.0.30319\\\\csc.exe',
      'C:\\\\Windows\\\\Microsoft.NET\\\\Framework\\\\v4.0.30319\\\\csc.exe'
    ]
    let compilerPath = ''
    for (const p of cscPaths) {
      if (existsSync(p)) {
        compilerPath = p
        break
      }
    }

    if (!compilerPath) {
      console.error('C# compiler csc.exe not found. Background gamepad monitoring will be unavailable.')
      return ''
    }

    execSync(`"${compilerPath}" /out:"${exePath}" /target:exe "${csPath}"`)
    console.log('Gamepad monitor compiled successfully at', exePath)
    return exePath
  } catch (err) {
    console.error('Failed to compile gamepad monitor:', err)
    return ''
  }
}

let activeListenChild: any = null

ipcMain.handle('start-gamepad-listen', async () => {
  if (activeListenChild) {
    try {
      activeListenChild.kill()
    } catch (e) {}
    activeListenChild = null
  }

  return new Promise((resolve) => {
    const exePath = compileGamepadMonitor()
    if (!exePath) {
      resolve(-1)
      return
    }

    try {
      activeListenChild = spawn(exePath, ['listen'], {
        detached: false,
        stdio: ['ignore', 'pipe', 'ignore']
      })

      let resolved = false

      activeListenChild.stdout.on('data', (data: Buffer) => {
        const msg = data.toString().trim()
        const match = msg.match(/BUTTON (\d+)/)
        if (match) {
          resolved = true
          const btnIndex = Number(match[1])
          console.log(`[MONITOR] Gamepad button press detected: index ${btnIndex}`)
          resolve(btnIndex)
          if (activeListenChild) {
            try {
              activeListenChild.kill()
            } catch (e) {}
            activeListenChild = null
          }
        }
      })

      activeListenChild.on('exit', () => {
        activeListenChild = null
        if (!resolved) {
          resolve(-1)
        }
      })
    } catch (err) {
      console.error('Failed to spawn gamepad listen monitor:', err)
      resolve(-1)
    }
  })
})

ipcMain.on('stop-gamepad-listen', () => {
  if (activeListenChild) {
    try {
      activeListenChild.kill()
    } catch (e) {}
    activeListenChild = null
  }
})

// ── IPC: Launch a game ───────────────────────────────────────────────────────
ipcMain.handle('launch-game', (_event, romPath: string) => {
  try {
    if (!existsSync(EMULATOR_PATH)) {
      throw new Error(`EDEN executable not found at: ${EMULATOR_PATH}`)
    }
    if (!existsSync(romPath)) {
      throw new Error(`ROM not found at: ${romPath}`)
    }

    // Save game to play history
    const filename = basename(romPath)
    const parsed = parseRomFile(filename)
    const gameKey = parsed ? (parsed.titleId || parsed.path) : ''
    if (gameKey) {
      updatePlayHistory(gameKey)
    }

    const gameStartTime = Date.now()

    const child = spawn(EMULATOR_PATH, ['-f', '-g', romPath], {
      detached: false,
      stdio: 'ignore'
    })

    let hasExited = false
    const handleGameExit = (): void => {
      if (hasExited) return
      hasExited = true

      const elapsed = Date.now() - gameStartTime
      if (gameKey) {
        addPlayTime(gameKey, elapsed)
      }

      if (mainWindow) {
        mainWindow.setFullScreen(true)
        mainWindow.show()
        mainWindow.maximize()
        mainWindow.restore()
        
        mainWindow.setAlwaysOnTop(true)
        app.focus({ steal: true })
        mainWindow.focus()
        
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setAlwaysOnTop(false)
          }
        }, 100)
        
        mainWindow.webContents.send('game-exited')
      }
    }

    // Monitor the window titles of the process to detect when emulation is stopped via F5 or Detener
    let gameDetected = false
    const monitorInterval = setInterval(async () => {
      if (!child.pid) return
      try {
        const titleOutput = await execTasklist(child.pid)
        if (!titleOutput) return

        const lines = titleOutput.split('\n').map((l) => l.trim()).filter(Boolean)
        if (lines.length < 2) return

        let hasOtherWindow = false
        let hasMainMenuWindow = false
        const cleanGameName = parsed ? parsed.name.toUpperCase() : ''

        for (const line of lines) {
          const parts = line.split('","')
          if (parts.length > 0) {
            let title = parts[parts.length - 1]
            if (title.endsWith('"')) {
              title = title.slice(0, -1)
            }
            
            const isNotAvailable = title === 'N/D' || title === 'N/A' || !title || title.trim() === ''
            if (isNotAvailable) {
              continue
            }

            const titleUpper = title.toUpperCase()
            const isMainMenu = titleUpper.startsWith('EDEN |') && !titleUpper.includes('-')
            
            if (isMainMenu) {
              hasMainMenuWindow = true
            } else {
              hasOtherWindow = true
              // If it contains a hyphen or the clean game name, it's the game window
              const isGameWindow = titleUpper.includes('-') || (cleanGameName && titleUpper.includes(cleanGameName))
              if (isGameWindow) {
                gameDetected = true
              }
            }
          }
        }

        // Only kill the emulator and restore the launcher if we previously detected the game running,
        // there are no dialogs or game windows active, and the main menu is present.
        if (gameDetected && !hasOtherWindow && hasMainMenuWindow) {
          console.log('[MONITOR] Game stopped detected (returned to main menu). Killing emulator process to restore launcher.')
          clearInterval(monitorInterval)
          try {
            process.kill(child.pid)
          } catch (e) {
            spawn('taskkill', ['/F', '/PID', String(child.pid)])
          }
          handleGameExit()
        }
      } catch (err) {
        console.error('Error in window monitor:', err)
      }
    }, 1000)

    child.on('exit', (code) => {
      console.log(`Emulator process exited with code: ${code}`)
      clearInterval(monitorInterval)
      handleGameExit()
    })

    child.on('error', (err) => {
      console.error('Emulator process error:', err)
      clearInterval(monitorInterval)
      handleGameExit()
    })

    // Hide the launcher window after a short delay
    setTimeout(() => {
      BrowserWindow.getAllWindows().forEach((w) => w.hide())
    }, 800)

    return { success: true }
  } catch (err) {
    console.error('Failed to launch game:', err)
    return { success: false, error: String(err) }
  }
})

// ── IPC: Get cover image as file path ────────────────────────────────────────
ipcMain.handle('get-cover', (_event, coverFile: string | null) => {
  if (!coverFile) return null
  const fullPath = join(COVERS_DIR, coverFile)
  return existsSync(fullPath) ? fullPath : null
})

ipcMain.handle('get-paths', () => {
  return { romsDir: ROMS_DIR, emulatorPath: EMULATOR_PATH }
})

ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
})

ipcMain.handle('select-file', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Executables (*.exe)', extensions: ['exe'] }]
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
})

ipcMain.handle('set-paths', (_event, paths: { romsDir: string, emulatorPath: string }) => {
  try {
    ROMS_DIR = paths.romsDir
    EMULATOR_PATH = paths.emulatorPath
    saveConfig()
    watchRomsDirectory()
    return { success: true }
  } catch (err) {
    console.error('Failed to set paths:', err)
    return { success: false, error: String(err) }
  }
})

// ── Window management ────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    frame: false,
    fullscreen: false,
    autoHideMenuBar: true,
    backgroundColor: '#2b2b2b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false
    }
  })

  // Mostrar solo cuando el renderer termine de cargar
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow!.show()
    mainWindow!.maximize()
    mainWindow!.focus()
    if (is.dev) {
      mainWindow!.webContents.openDevTools({ mode: 'detach' })
    }
  })

  // Log de errores
  mainWindow.webContents.on('did-fail-load', (_event, code, desc, url) => {
    console.error('[RENDERER] did-fail-load:', code, desc, url)
    // Si falla la carga, mostrar la ventana igual para ver el error
    mainWindow!.show()
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[RENDERER] crashed:', details.reason)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ── IPC: Window controls ─────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window-close', () => {
  app.quit()
})
ipcMain.on('window-show', () => mainWindow?.show())
ipcMain.on('window-fullscreen', (_event, flag: boolean) => {
  if (mainWindow) {
    mainWindow.setFullScreen(flag)
    if (!flag) {
      mainWindow.maximize()
    }
  }
})

app.whenReady().then(() => {
  // Handle local-file protocol
  protocol.handle('local-file', (request) => {
    let filePath = request.url.slice('local-file://'.length)
    if (filePath.startsWith('/')) {
      filePath = filePath.slice(1)
    }
    const decodedPath = decodeURIComponent(filePath)
    return net.fetch(`file:///${decodedPath}`)
  })

  // Watch ROMs directory for changes
  watchRomsDirectory()

  electronApp.setAppUserModelId('com.jdgar.eden-launcher')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Pre-compile gamepad monitor if needed
  compileGamepadMonitor()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
