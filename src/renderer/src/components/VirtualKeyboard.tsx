import React from 'react'

interface VirtualKeyboardProps {
  suggestions: string[]
  activeRow: number
  activeCol: number
  onKeyPress: (key: string) => void
  onSuggestionSelect: (suggestion: string) => void
  onClose: () => void
}

export const KEYBOARD_GRID = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
  ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'],
  ['U', 'V', 'W', 'X', 'Y', 'Z', '1', '2', '3', '4'],
  ['5', '6', '7', '8', '9', '.', '-', '_', 'Espacio ␣', 'Limpiar ✕']
]

export default function VirtualKeyboard({
  suggestions,
  activeRow,
  activeCol,
  onKeyPress,
  onSuggestionSelect,
  onClose
}: VirtualKeyboardProps): React.JSX.Element {
  
  const handleKeyClick = (key: string): void => {
    onKeyPress(key)
  }

  const handlePreventDefault = (e: React.MouseEvent): void => {
    e.preventDefault()
  }

  return (
    <div className="sw-vk-container">
      {/* Suggestions Row */}
      {suggestions.length > 0 && (
        <div className="sw-vk-suggestions">
          <span className="sw-vk-suggest-label">Sugerencias:</span>
          <div className="sw-vk-suggest-list">
            {suggestions.map((sug, idx) => {
              const isSelected = activeRow === 0 && activeCol === idx
              return (
                <button
                  key={sug}
                  className={`sw-vk-suggest-btn ${isSelected ? 'sw-vk-suggest-focused' : ''}`}
                  onClick={() => onSuggestionSelect(sug)}
                  onMouseDown={handlePreventDefault}
                >
                  {sug}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Main Alphabet Grid */}
      <div className="sw-vk-grid">
        {KEYBOARD_GRID.map((row, rIdx) => (
          <div key={rIdx} className="sw-vk-row">
            {row.map((char, cIdx) => {
              // Rows are offset by 1 if suggestions exist.
              // In our state representation, activeRow 1 is KEYBOARD_GRID[0]
              const isSelected = activeRow === rIdx + 1 && activeCol === cIdx
              
              let displayChar = char
              if (char === 'Espacio ␣') displayChar = '␣'
              if (char === 'Limpiar ✕') displayChar = '✕'

              let keyClass = 'sw-vk-key'
              if (char === 'Espacio ␣' || char === 'Limpiar ✕') {
                keyClass += ' sw-vk-key-special'
              }
              if (isSelected) {
                keyClass += ' sw-key-selected'
              }

              return (
                <button
                  key={cIdx}
                  className={keyClass}
                  onClick={() => handleKeyClick(char)}
                  onMouseDown={handlePreventDefault}
                  title={char}
                >
                  {displayChar}
                </button>
              )
            })}
          </div>
        ))}

        {/* Bottom Actions Row (Row 5) */}
        <div className="sw-vk-row sw-vk-row-bottom">
          <button
            className={`sw-vk-action-btn sw-vk-key-backspace ${activeRow === 5 && activeCol < 5 ? 'sw-key-selected' : ''}`}
            onClick={() => handleKeyClick('Borrar ⌫')}
            onMouseDown={handlePreventDefault}
          >
            Borrar ⌫
          </button>
          <button
            className={`sw-vk-action-btn sw-vk-key-accept ${activeRow === 5 && activeCol >= 5 ? 'sw-key-selected' : ''}`}
            onClick={onClose}
            onMouseDown={handlePreventDefault}
          >
            Aceptar ✓
          </button>
        </div>
      </div>
    </div>
  )
}
