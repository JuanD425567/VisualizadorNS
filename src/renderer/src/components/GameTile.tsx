import React, { useState } from 'react'
import { motion } from 'framer-motion'
import type { Game } from '../types/game'

interface GameTileProps {
  game: Game
  isFocused: boolean
  isFavorite: boolean
  onClick: () => void
  onDoubleClick: () => void
  index: number
}

const GamepadIcon = (): React.JSX.Element => (
  <svg
    width="52"
    height="52"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
  >
    <rect x="2" y="7" width="20" height="12" rx="3" />
    <path d="M6 11v4M4 13h4" />
    <circle cx="17" cy="11.5" r="1" fill="currentColor" />
    <circle cx="19.5" cy="13.5" r="1" fill="currentColor" />
  </svg>
)

export default function GameTile({
  game,
  isFocused,
  isFavorite,
  onClick,
  onDoubleClick,
  index
}: GameTileProps): React.JSX.Element {
  const [imageFailed, setImageFailed] = useState(false)

  // Determine image source — prefer local file path formatted with local-file custom protocol
  const imgSrc = game.coverPath && !imageFailed
    ? `local-file:///${game.coverPath.replace(/\\/g, '/')}`
    : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: isFocused ? -10 : 0,
        scale: isFocused ? 1.12 : 0.95,
        transition: {
          type: 'spring',
          stiffness: 350,
          damping: 22,
          opacity: { duration: 0.2, delay: index * 0.05 }
        }
      }}
      whileTap={{ scale: isFocused ? 1.05 : 0.9 }}
      className={`sw-tile ${isFocused ? 'sw-tile-focused' : ''}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onDoubleClick()
      }}
      aria-label={`Juego: ${game.name}`}
      role="button"
    >
      {/* Cover image or placeholder */}
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={game.name}
          className="sw-tile-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="sw-tile-placeholder">
          <div className="sw-tile-placeholder-icon">
            <GamepadIcon />
          </div>
          <span className="sw-tile-placeholder-text">{game.name}</span>
        </div>
      )}

      {/* Favorite gold star badge */}
      {isFavorite && (
        <div className="sw-game-tile-favorite-badge">
          ★
        </div>
      )}

      {/* Dim overlay for unfocused tiles */}
      {!isFocused && <div className="sw-tile-dim" />}
    </motion.div>
  )
}
