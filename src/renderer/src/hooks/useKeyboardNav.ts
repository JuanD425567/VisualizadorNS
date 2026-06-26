import { useState, useEffect, useCallback } from 'react'

export function useKeyboardNav(total: number) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') {
        return
      }
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(0, prev - 1))
          break
        case 'ArrowRight':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(total - 1, prev + 1))
          break
        case 'Home':
          e.preventDefault()
          setSelectedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setSelectedIndex(Math.max(0, total - 1))
          break
        default:
          break
      }
    },
    [total]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return [selectedIndex, setSelectedIndex] as const
}
