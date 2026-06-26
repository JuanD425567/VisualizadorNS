import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Notification {
  id: string
  type: 'info' | 'success' | 'warn'
  text: string
}

interface SystemNotificationsProps {
  notifications: Notification[]
}

export default function SystemNotifications({ notifications }: SystemNotificationsProps): React.JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 99999,
        pointerEvents: 'none'
      }}
    >
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(30, 30, 30, 0.9)',
              border: `1.5px solid ${n.type === 'success' ? '#10b981' : n.type === 'warn' ? '#ef4444' : '#3b82f6'}`,
              borderRadius: 8,
              padding: '12px 20px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              minWidth: 280,
              maxWidth: 400
            }}
          >
            <span style={{ fontSize: 16 }}>
              {n.type === 'success' ? '🎮' : n.type === 'warn' ? '🔌' : 'ℹ️'}
            </span>
            <div style={{ flex: 1, lineHeight: 1.4 }}>{n.text}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
