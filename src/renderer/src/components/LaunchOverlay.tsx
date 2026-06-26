import React from 'react'
import { motion } from 'framer-motion'
import type { Game } from '../types/game'

interface LaunchOverlayProps {
  game: Game
}

export default function LaunchOverlay({ game }: LaunchOverlayProps): React.JSX.Element {
  const imgSrc = game.coverPath
    ? `local-file:///${game.coverPath.replace(/\\/g, '/')}`
    : null

  return (
    <motion.div
      className="sw-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Cover art zoom-in */}
      {imgSrc && (
        <motion.img
          src={imgSrc}
          alt={game.name}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 250, damping: 22, delay: 0.05 }}
          style={{
            width: 180,
            height: 180,
            borderRadius: 16,
            objectFit: 'cover',
            boxShadow: '0 0 40px rgba(0, 209, 209, 0.4), 0 20px 60px rgba(0,0,0,0.6)',
            border: '3px solid #00d1d1'
          }}
        />
      )}

      {/* Game name */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        style={{ textAlign: 'center' }}
      >
        <div className="sw-overlay-game-name">{game.name}</div>
        <div className="sw-overlay-subtitle" style={{ marginTop: 8 }}>
          Iniciando con EDEN...
        </div>
      </motion.div>

      {/* Spinner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="sw-spinner"
      />

      {/* Cyan accent line at bottom */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.1, duration: 1.5, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, transparent, #00d1d1, transparent)',
          transformOrigin: 'center'
        }}
      />
    </motion.div>
  )
}
