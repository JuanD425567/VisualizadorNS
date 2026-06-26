import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Game } from '../types/game'
import { playSound } from '../utils/audio'

interface GameDetailsModalProps {
  game: Game | null
  isOpen: boolean
  isFavorite: boolean
  focusedIndex: number
  onToggleFavorite: () => void
  onLaunch: () => void
  onClose: () => void
}

export default function GameDetailsModal({
  game,
  isOpen,
  isFavorite,
  focusedIndex,
  onToggleFavorite,
  onLaunch,
  onClose
}: GameDetailsModalProps): React.JSX.Element {
  if (!game) return <></>

  // Format total play time
  const formatPlayTime = (ms: number): string => {
    if (!ms || ms < 60000) return 'Menos de un minuto'
    const totalMinutes = Math.floor(ms / 60000)
    if (totalMinutes < 60) {
      return `${totalMinutes} min`
    } else {
      const hours = Math.floor(totalMinutes / 60)
      const mins = totalMinutes % 60
      return mins > 0 ? `${hours} h ${mins} m` : `${hours} h`
    }
  }

  // Format last played relative date
  const formatLastPlayed = (timestamp: number): string => {
    if (!timestamp) return 'Nunca jugado'
    const now = Date.now()
    const diffMs = now - timestamp
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    return `Hace ${diffDays} días`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="sw-details-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.35 }}
            className="sw-details-container"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Cover Panel */}
            <div className="sw-details-left">
              <div className="sw-details-cover-container">
                <img
                  src={game.coverPath ? `local-file://${game.coverPath}` : 'https://placehold.co/240x240/1a1a1a/ffffff?text=No+Cover'}
                  alt={game.name}
                  className="sw-details-cover"
                />
              </div>
            </div>

            {/* Right Information Panel */}
            <div className="sw-details-right">
              {/* Title Section */}
              <div className="sw-details-title-section">
                <h1 className="sw-details-title">{game.name}</h1>
                <div className="sw-details-titleid">ID del Programa: {game.titleId || 'Desconocido'}</div>
              </div>

              {/* Stats Section */}
              <div className="sw-details-stats-section">
                <div className="sw-details-stat-card">
                  <span className="sw-details-stat-label">Tiempo Jugado</span>
                  <span className="sw-details-stat-value">{formatPlayTime(game.totalPlayTime)}</span>
                </div>
                <div className="sw-details-stat-card">
                  <span className="sw-details-stat-label">Última Partida</span>
                  <span className="sw-details-stat-value">{formatLastPlayed(game.lastPlayed)}</span>
                </div>
              </div>

              {/* Action Buttons Section */}
              <div className="sw-details-actions">
                <button
                  className={`sw-details-btn btn-play ${focusedIndex === 0 ? 'focused' : ''}`}
                  onClick={onLaunch}
                  onMouseEnter={() => playSound('move')}
                >
                  🎮 JUGAR
                </button>
                <button
                  className={`sw-details-btn btn-fav ${isFavorite ? 'active' : ''} ${focusedIndex === 1 ? 'focused' : ''}`}
                  onClick={onToggleFavorite}
                  onMouseEnter={() => playSound('move')}
                >
                  {isFavorite ? '⭐ FAVORITO' : '☆ FAVORITO'}
                </button>
                <button
                  className={`sw-details-btn ${focusedIndex === 2 ? 'focused' : ''}`}
                  onClick={onClose}
                  onMouseEnter={() => playSound('move')}
                >
                  ❌ VOLVER
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
