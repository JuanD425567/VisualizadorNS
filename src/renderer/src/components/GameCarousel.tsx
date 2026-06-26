import React, { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Game } from '../types/game'
import GameTile from './GameTile'

interface GameCarouselProps {
  games: Game[]
  selectedIndex: number
  onSelectIndex: (index: number) => void
  onLaunch: (game: Game) => void
  favorites: string[]
}

const TILE_SIZE = 200
const TILE_GAP = 20
const STEP = TILE_SIZE + TILE_GAP

const ChevronLeft = (): React.JSX.Element => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)

const ChevronRight = (): React.JSX.Element => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

export default function GameCarousel({
  games,
  selectedIndex,
  onSelectIndex,
  onLaunch,
  favorites
}: GameCarouselProps): React.JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null)

  // Approximated container width inside the carousel wrapper (accounting for padding & arrows)
  const containerWidth = typeof window !== 'undefined' ? window.innerWidth - 240 : 1000
  const TRACK_PADDING = 20
  const totalTrackWidth = games.length * TILE_SIZE + (games.length - 1) * TILE_GAP + TRACK_PADDING * 2

  let trackOffset = 0
  if (totalTrackWidth <= containerWidth) {
    // If the entire list of games fits on screen, center the track
    trackOffset = (containerWidth - totalTrackWidth) / 2
  } else {
    // Center the selected game tile
    const tileCenter = TRACK_PADDING + selectedIndex * STEP + TILE_SIZE / 2
    const targetOffset = containerWidth / 2 - tileCenter
    
    // Clamp so the track doesn't slide past boundaries and show blank space
    const minOffset = containerWidth - totalTrackWidth
    const maxOffset = 0
    trackOffset = Math.max(minOffset, Math.min(maxOffset, targetOffset))
  }

  const focusedGame = games[selectedIndex]

  return (
    <div className="sw-carousel-wrapper">
      {/* Floating game title above the carousel */}
      <div className="sw-game-title-bar">
        <AnimatePresence mode="wait">
          {focusedGame && (
            <motion.span
              key={focusedGame.titleId}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="sw-game-title-text"
            >
              {focusedGame.name}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Carousel track with arrows */}
      <div className="sw-carousel-track-container">
        {/* Left arrow */}
        <button
          id="btn-prev"
          className="sw-carousel-arrow"
          onClick={() => onSelectIndex(Math.max(0, selectedIndex - 1))}
          disabled={selectedIndex === 0}
          aria-label="Juego anterior"
        >
          <ChevronLeft />
        </button>

        {/* Scrolling carousel */}
        <div className="sw-carousel-overflow">
          <motion.div
            ref={trackRef}
            className="sw-carousel-track"
            animate={{ x: trackOffset }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ willChange: 'transform' }}
          >
            {games.map((game, i) => (
              <GameTile
                key={game.titleId || game.path}
                game={game}
                isFocused={i === selectedIndex}
                isFavorite={favorites.includes(game.titleId || game.path)}
                index={i}
                onClick={() => onSelectIndex(i)}
                onDoubleClick={() => onLaunch(game)}
              />
            ))}
          </motion.div>
        </div>

        {/* Right arrow */}
        <button
          id="btn-next"
          className="sw-carousel-arrow"
          onClick={() => onSelectIndex(Math.min(games.length - 1, selectedIndex + 1))}
          disabled={selectedIndex === games.length - 1}
          aria-label="Siguiente juego"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Page dots */}
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {games.map((_, i) => (
          <motion.div
            key={i}
            animate={{
              width: i === selectedIndex ? 20 : 6,
              background: i === selectedIndex ? 'var(--sw-cyan)' : 'rgba(255,255,255,0.25)'
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{ height: 6, borderRadius: 3, cursor: 'pointer' }}
            onClick={() => onSelectIndex(i)}
          />
        ))}
      </div>
    </div>
  )
}
