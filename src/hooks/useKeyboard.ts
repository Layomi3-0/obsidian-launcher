import { useState, useCallback, useEffect } from 'react'
import { hideWindow, openNote } from '@/lib/ipc'
import type { SearchResult } from '@/lib/types'

interface UseKeyboardOptions {
  results: SearchResult[]
  onClearSearch: () => void
}

interface UseKeyboardReturn {
  selectedIndex: number
  setSelectedIndex: (index: number) => void
  handleKeyDown: (e: React.KeyboardEvent) => void
}

export function useKeyboard({ results, onClearSearch }: UseKeyboardOptions): UseKeyboardReturn {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  const executeResult = useCallback((result: SearchResult) => {
    openNote(result.path)
    onClearSearch()
    hideWindow()
  }, [onClearSearch])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break

      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break

      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          executeResult(results[selectedIndex])
        }
        break

      case 'Escape':
        e.preventDefault()
        onClearSearch()
        hideWindow()
        break
    }
  }, [results, selectedIndex, executeResult, onClearSearch])

  return {
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
  }
}
