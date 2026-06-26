let audioCtx: AudioContext | null = null
let musicMasterGain: GainNode | null = null
let activeOscillators: { osc: OscillatorNode; gainNode: GainNode }[] = []
let chordTimer: any = null
let currentChordIndex = 0

const CHORDS = [
  // Fmaj7
  [174.61, 220.00, 261.63, 329.63],
  // Gmaj7
  [196.00, 246.94, 293.66, 369.99],
  // Em7
  [164.81, 196.00, 246.94, 293.66],
  // Am7
  [220.00, 261.63, 329.63, 392.00]
]

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

export function playSound(
  type:
    | 'move'
    | 'select'
    | 'back'
    | 'tab'
    | 'toggle-on'
    | 'toggle-off'
    | 'click'
    | 'chime-connect'
    | 'chime-disconnect'
): void {
  // Check if sounds are enabled in settings
  const soundEnabled = localStorage.getItem('eden_sound_enabled') !== 'false'
  if (!soundEnabled) return

  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime

    if (type === 'chime-connect') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, now) // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08) // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16) // G5

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.setValueAtTime(0.08, now + 0.08)
      gain.gain.setValueAtTime(0.08, now + 0.16)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)

      osc.start(now)
      osc.stop(now + 0.45)
      return
    }

    if (type === 'chime-disconnect') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, now) // D5
      osc.frequency.setValueAtTime(440.00, now + 0.1) // A4

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.setValueAtTime(0.08, now + 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

      osc.start(now)
      osc.stop(now + 0.35)
      return
    }

    if (type === 'click') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(760, now)
      osc.frequency.setValueAtTime(1020, now + 0.04)

      gain.gain.setValueAtTime(0.14, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

      osc.start(now)
      osc.stop(now + 0.12)
      return
    }

    if (type === 'move') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(480, now)
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.08)

      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)

      osc.start(now)
      osc.stop(now + 0.08)
    } else if (type === 'select') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(380, now)
      osc.frequency.setValueAtTime(760, now + 0.07)

      gain.gain.setValueAtTime(0.1, now)
      gain.gain.setValueAtTime(0.1, now + 0.07)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

      osc.start(now)
      osc.stop(now + 0.3)
    } else if (type === 'back') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(320, now)
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.18)

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

      osc.start(now)
      osc.stop(now + 0.18)
    } else if (type === 'tab') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(600, now)
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05)

      gain.gain.setValueAtTime(0.04, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

      osc.start(now)
      osc.stop(now + 0.05)
    } else if (type === 'toggle-on') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(400, now)
      osc.frequency.setValueAtTime(600, now + 0.06)

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.setValueAtTime(0.08, now + 0.06)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

      osc.start(now)
      osc.stop(now + 0.2)
    } else if (type === 'toggle-off') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(500, now)
      osc.frequency.setValueAtTime(350, now + 0.06)

      gain.gain.setValueAtTime(0.08, now)
      gain.gain.setValueAtTime(0.08, now + 0.06)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)

      osc.start(now)
      osc.stop(now + 0.2)
    }
  } catch (e) {
    console.error('Failed to play UI sound:', e)
  }
}

export function startAmbientMusic(): void {
  const musicEnabled = localStorage.getItem('eden_music_enabled') !== 'false'
  if (!musicEnabled) return

  try {
    const ctx = getAudioContext()
    if (chordTimer) return // Already running

    if (!musicMasterGain) {
      musicMasterGain = ctx.createGain()
      musicMasterGain.connect(ctx.destination)
    }

    const savedVolume = localStorage.getItem('eden_music_volume')
    const vol = savedVolume !== null ? Number(savedVolume) : 0.3
    // Master volume scales to 15% max to remain a soft ambient sound
    musicMasterGain.gain.setValueAtTime(vol * 0.15, ctx.currentTime)

    const playNextChord = (): void => {
      const chord = CHORDS[currentChordIndex]
      currentChordIndex = (currentChordIndex + 1) % CHORDS.length

      const now = ctx.currentTime
      const notesToPlay: { osc: OscillatorNode; gainNode: GainNode }[] = []

      chord.forEach((freq) => {
        const osc = ctx.createOscillator()
        const gainNode = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)

        // Soft pad envelope
        gainNode.gain.setValueAtTime(0, now)
        gainNode.gain.linearRampToValueAtTime(0.08, now + 2.5) // Slow attack
        gainNode.gain.setValueAtTime(0.08, now + 5.0) // Hold
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 8.5) // Slow release

        osc.connect(gainNode)
        gainNode.connect(musicMasterGain!)

        osc.start(now)
        osc.stop(now + 8.5)

        notesToPlay.push({ osc, gainNode })
      })

      activeOscillators = notesToPlay
      chordTimer = setTimeout(playNextChord, 8000)
    }

    playNextChord()
  } catch (e) {
    console.error('Failed to start ambient music:', e)
  }
}

export function stopAmbientMusic(): void {
  if (chordTimer) {
    clearTimeout(chordTimer)
    chordTimer = null
  }
  activeOscillators.forEach((item) => {
    try {
      item.osc.stop()
      item.osc.disconnect()
      item.gainNode.disconnect()
    } catch (e) {}
  })
  activeOscillators = []
}

export function updateAmbientVolume(volume: number): void {
  localStorage.setItem('eden_music_volume', String(volume))
  if (musicMasterGain) {
    try {
      const ctx = getAudioContext()
      musicMasterGain.gain.linearRampToValueAtTime(volume * 0.15, ctx.currentTime + 0.1)
    } catch (e) {
      console.error(e)
    }
  }
}

export function vibrateGamepad(type: 'move' | 'select' | 'fav'): void {
  try {
    const vibrationEnabled = localStorage.getItem('eden_vibration_enabled') !== 'false'
    if (!vibrationEnabled) return

    const gamepads = navigator.getGamepads()
    const gp = gamepads.find((g) => g !== null)
    if (gp && gp.vibrationActuator) {
      if (type === 'move') {
        gp.vibrationActuator
          .playEffect('dual-rumble', {
            startDelay: 0,
            duration: 60,
            weakMagnitude: 0.12,
            strongMagnitude: 0.0
          })
          .catch(() => {})
      } else if (type === 'select') {
        gp.vibrationActuator
          .playEffect('dual-rumble', {
            startDelay: 0,
            duration: 200,
            weakMagnitude: 0.45,
            strongMagnitude: 0.25
          })
          .catch(() => {})
      } else if (type === 'fav') {
        gp.vibrationActuator
          .playEffect('dual-rumble', {
            startDelay: 0,
            duration: 120,
            weakMagnitude: 0.35,
            strongMagnitude: 0.1
          })
          .catch(() => {})
      }
    }
  } catch (e) {
    console.error('Gamepad vibration failed:', e)
  }
}
