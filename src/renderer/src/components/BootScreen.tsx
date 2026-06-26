import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { playSound } from '../utils/audio'

interface BootScreenProps {
  onComplete: () => void
}

export default function BootScreen({ onComplete }: BootScreenProps): React.JSX.Element {
  useEffect(() => {
    // Play the Switch snap click sound at 0.75s (when the joycons snap together)
    const soundTimer = setTimeout(() => {
      // We will play a customized 'click' sound. If not present in audio.ts yet, we'll add it.
      // Falls back safely if needed.
      try {
        playSound('click' as any)
      } catch (e) {
        playSound('select')
      }
    }, 750)

    // Complete the boot animation after 2.6 seconds
    const completeTimer = setTimeout(() => {
      onComplete()
    }, 2600)

    return () => {
      clearTimeout(soundTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  return (
    <motion.div
      className="sw-boot-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="sw-boot-logo-container">
        <svg width="140" height="140" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
          {/* Left Joycon (Red) */}
          <motion.g
            initial={{ y: -80, x: -40, opacity: 0 }}
            animate={{ y: 0, x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.15 }}
          >
            <path
              d="M36 15 C18 15, 18 85, 36 85 L44 85 L44 15 Z"
              fill="#e4000f"
              stroke="#ffffff"
              strokeWidth="2.5"
            />
            {/* Analog Stick */}
            <circle cx="30" cy="35" r="5" fill="#ffffff" />
            {/* D-Pad Buttons */}
            <circle cx="30" cy="55" r="2" fill="#ffffff" />
            <circle cx="30" cy="67" r="2" fill="#ffffff" />
            <circle cx="24" cy="61" r="2" fill="#ffffff" />
            <circle cx="36" cy="61" r="2" fill="#ffffff" />
          </motion.g>

          {/* Right Joycon (Cyan) */}
          <motion.g
            initial={{ y: 80, x: 40, opacity: 0 }}
            animate={{ y: 0, x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.35 }}
          >
            <path
              d="M64 15 C82 15, 82 85, 64 85 L56 85 L56 15 Z"
              fill="#00d1d1"
              stroke="#ffffff"
              strokeWidth="2.5"
            />
            {/* Analog Stick */}
            <circle cx="70" cy="65" r="5" fill="#ffffff" />
            {/* Action Buttons */}
            <circle cx="70" cy="33" r="2.5" fill="#ffffff" /> {/* X */}
            <circle cx="70" cy="47" r="2.5" fill="#ffffff" /> {/* B */}
            <circle cx="63" cy="40" r="2.5" fill="#ffffff" /> {/* Y */}
            <circle cx="77" cy="40" r="2.5" fill="#ffffff" /> {/* A */}
          </motion.g>
        </svg>

        {/* Text Fade In */}
        <motion.div
          className="sw-boot-title"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          EDEN LAUNCHER
        </motion.div>

        <motion.div
          className="sw-boot-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.1, duration: 0.6 }}
        >
          NINTENDO SWITCH EMULATION EXPERIENCE
        </motion.div>
      </div>
    </motion.div>
  )
}
