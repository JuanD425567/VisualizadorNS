import { useEffect, useRef } from 'react'
import { vibrateGamepad } from '../utils/audio'

interface GamepadCallbacks {
  onLeft: () => void
  onRight: () => void
  onUp: () => void
  onDown: () => void
  onConfirm: () => void
  onBack: () => void
  onOptions: () => void
  onSearch: () => void
  onStopButtonDoublePress?: () => void
}

export function useGamepad(callbacks: GamepadCallbacks, stopButtonIndex: number | null): void {
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  const stopButtonIndexRef = useRef(stopButtonIndex)
  stopButtonIndexRef.current = stopButtonIndex

  useEffect(() => {
    let animationFrameId: number
    const buttonStates = new Map<number, boolean>()
    const axisStates = new Map<number, number>()
    
    let lastActionTime = 0
    let lastStopPressTime = 0
    const ACTION_COOLDOWN = 200 // ms throttling for continuous presses

    const pollGamepad = (): void => {
      const gamepads = navigator.getGamepads()
      // Get first connected gamepad
      const gp = gamepads.find((g) => g !== null)
      
      if (gp) {
        const now = Date.now()
        const currentStopButtonIndex = stopButtonIndexRef.current
        
        const isPressed = (index: number): boolean => {
          if (index < gp.buttons.length) {
            return gp.buttons[index].pressed
          }
          return false
        }

        const handleButtonPress = (index: number, callback: () => void): void => {
          if (currentStopButtonIndex !== null && currentStopButtonIndex !== undefined && index === currentStopButtonIndex) {
            return
          }

          const pressed = isPressed(index)
          const wasPressed = buttonStates.get(index) || false
          buttonStates.set(index, pressed)
          
          if (pressed && !wasPressed) {
            if (now - lastActionTime > ACTION_COOLDOWN) {
              // Trigger rumble for d-pad direction changes
              if ([12, 13, 14, 15].includes(index)) {
                vibrateGamepad('move')
              }
              callback()
              lastActionTime = now
            }
          }
        }

        // Check if stop button is pressed (and handle its double press)
        if (currentStopButtonIndex !== null && currentStopButtonIndex !== undefined && currentStopButtonIndex >= 0) {
          const pressed = isPressed(currentStopButtonIndex)
          const wasPressed = buttonStates.get(currentStopButtonIndex) || false
          buttonStates.set(currentStopButtonIndex, pressed)

          if (pressed && !wasPressed) {
            if (now - lastActionTime > ACTION_COOLDOWN) {
              const nowTime = Date.now()
              if (nowTime - lastStopPressTime < 1000) {
                if (callbacksRef.current.onStopButtonDoublePress) {
                  callbacksRef.current.onStopButtonDoublePress()
                }
                lastStopPressTime = 0
              } else {
                lastStopPressTime = nowTime
              }
              lastActionTime = now
            }
          }
        }

        // Mappings:
        // 0: A / Cross (Confirm)
        // 1: B / Circle (Back / Cancel)
        // 3: Y / Triangle (Search)
        // 9: Start / Options (Settings / Plus)
        // 12: D-pad Up
        // 13: D-pad Down
        // 14: D-pad Left
        // 15: D-pad Right
        
        handleButtonPress(0, callbacksRef.current.onConfirm)
        handleButtonPress(1, callbacksRef.current.onBack)
        handleButtonPress(3, callbacksRef.current.onSearch)
        handleButtonPress(9, callbacksRef.current.onOptions)
        handleButtonPress(12, callbacksRef.current.onUp)
        handleButtonPress(13, callbacksRef.current.onDown)
        handleButtonPress(14, callbacksRef.current.onLeft)
        handleButtonPress(15, callbacksRef.current.onRight)

        // Stick X navigation: axes[0] is Left Stick X-axis
        if (gp.axes.length > 0) {
          const axisX = gp.axes[0]
          const prevAxisX = axisStates.get(0) || 0
          axisStates.set(0, axisX)
          
          if (axisX > 0.5 && prevAxisX <= 0.5) {
            if (now - lastActionTime > ACTION_COOLDOWN) {
              vibrateGamepad('move')
              callbacksRef.current.onRight()
              lastActionTime = now
            }
          } else if (axisX < -0.5 && prevAxisX >= -0.5) {
            if (now - lastActionTime > ACTION_COOLDOWN) {
              vibrateGamepad('move')
              callbacksRef.current.onLeft()
              lastActionTime = now
            }
          }
        }

        // Stick Y navigation: axes[1] is Left Stick Y-axis
        if (gp.axes.length > 1) {
          const axisY = gp.axes[1]
          const prevAxisY = axisStates.get(1) || 0
          axisStates.set(1, axisY)

          if (axisY > 0.5 && prevAxisY <= 0.5) {
            if (now - lastActionTime > ACTION_COOLDOWN) {
              vibrateGamepad('move')
              callbacksRef.current.onDown()
              lastActionTime = now
            }
          } else if (axisY < -0.5 && prevAxisY >= -0.5) {
            if (now - lastActionTime > ACTION_COOLDOWN) {
              vibrateGamepad('move')
              callbacksRef.current.onUp()
              lastActionTime = now
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(pollGamepad)
    }

    pollGamepad()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])
}
