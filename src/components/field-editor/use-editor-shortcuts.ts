'use client'

import { useEffect, useCallback } from 'react'
import { useFieldEditor } from '@/lib/store/field-editor-store'

/**
 * Registers global keyboard shortcuts for the field editor canvas.
 * Should be called once in the editor layout component.
 */
export function useEditorShortcuts() {
  const {
    setTool,
    setTemporaryTool,
    restoreTool,
    clearSelection,
    zoomIn,
    zoomOut,
    toggleInspector,
    undo,
    redo,
    gridSpacing,
    pan,
    setPan,
  } = useFieldEditor()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea/select
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.target as HTMLElement).isContentEditable) return

      const isMod = e.metaKey || e.ctrlKey

      // Undo: Ctrl/Cmd+Z
      if (isMod && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        void undo()
        return
      }

      // Redo: Ctrl/Cmd+Shift+Z
      if (isMod && e.shiftKey && e.key === 'Z') {
        e.preventDefault()
        void redo()
        return
      }

      // Skip other shortcuts if a modifier is held
      if (isMod) return

      switch (e.key) {
        // Tool shortcuts
        case 'v':
        case 'V':
          setTool('select')
          break
        case 'r':
        case 'R':
          setTool('draw_rect')
          break
        case 'h':
        case 'H':
          setTool('hand')
          break
        case 'e':
        case 'E':
          setTool('eraser')
          break
        case 'm':
        case 'M':
          setTool('measure')
          break

        // Space: temporary hand tool
        case ' ':
          e.preventDefault()
          setTemporaryTool('hand')
          break

        // Escape: deselect all
        case 'Escape':
          clearSelection()
          break

        // Delete/Backspace: handled by canvas component (needs delete command context)
        // We only clear selection here; actual deletion is up to the consumer.
        case 'Delete':
        case 'Backspace':
          // Intentionally left for the canvas to handle via selectedIds
          break

        // Zoom
        case '=':
        case '+':
          zoomIn()
          break
        case '-':
          zoomOut()
          break

        // Toggle inspector
        case ']':
          toggleInspector()
          break

        // Arrow keys: nudge pan (or selected items)
        case 'ArrowUp': {
          e.preventDefault()
          const step = e.shiftKey ? 10 * gridSpacing : gridSpacing
          setPan(pan.x, pan.y + step)
          break
        }
        case 'ArrowDown': {
          e.preventDefault()
          const step = e.shiftKey ? 10 * gridSpacing : gridSpacing
          setPan(pan.x, pan.y - step)
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          const step = e.shiftKey ? 10 * gridSpacing : gridSpacing
          setPan(pan.x + step, pan.y)
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          const step = e.shiftKey ? 10 * gridSpacing : gridSpacing
          setPan(pan.x - step, pan.y)
          break
        }
      }
    },
    [
      setTool,
      setTemporaryTool,
      clearSelection,
      zoomIn,
      zoomOut,
      toggleInspector,
      undo,
      redo,
      gridSpacing,
      pan,
      setPan,
    ],
  )

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === ' ') {
        restoreTool()
      }
    },
    [restoreTool],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])
}
