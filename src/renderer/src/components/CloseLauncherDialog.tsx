import React from 'react'
import { motion } from 'framer-motion'

interface CloseLauncherDialogProps {
  isOpen: boolean
  selectedOption: 'confirm' | 'cancel'
  onSelectOption: (option: 'confirm' | 'cancel') => void
  onConfirm: () => void
  onCancel: () => void
}

export default function CloseLauncherDialog({
  isOpen,
  selectedOption,
  onSelectOption,
  onConfirm,
  onCancel
}: CloseLauncherDialogProps): React.JSX.Element | null {
  if (!isOpen) return null

  return (
    <div className="sw-modal-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', duration: 0.35 }}
        className="sw-modal-container"
      >
        {/* Power off symbol */}
        <div className="sw-modal-icon-container">
          <div className="sw-modal-power-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e4000f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </div>
        </div>

        {/* Modal content */}
        <div className="sw-modal-body">
          <h3 className="sw-modal-title">¿Quieres cerrar EDEN LAUNCHER?</h3>
          <p className="sw-modal-text">Se cerrará la aplicación y volverás al escritorio.</p>
        </div>

        {/* Modal buttons */}
        <div className="sw-modal-footer">
          <button
            className={`sw-modal-btn sw-btn-confirm ${selectedOption === 'confirm' ? 'focused' : ''}`}
            onClick={onConfirm}
            onMouseEnter={() => onSelectOption('confirm')}
          >
            SÍ
          </button>
          <button
            className={`sw-modal-btn sw-btn-cancel ${selectedOption === 'cancel' ? 'focused' : ''}`}
            onClick={onCancel}
            onMouseEnter={() => onSelectOption('cancel')}
          >
            CANCELAR
          </button>
        </div>
      </motion.div>
    </div>
  )
}
