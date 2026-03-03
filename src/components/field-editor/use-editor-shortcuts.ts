'use client'

import { useEffect, useCallback } from 'react'
import { useFieldEditor } from '@/lib/store/field-editor-store'

// Pixels per meter for pan calculations — matches PIXELS_PER_METER in editor-canvas
const PAN_PX_PER_METER = 50

interface EditorShortcutOptions {
  onDeleteSelected?: () => void
  onSelectAll?: () => void
  onCopy?: () => void
  onPaste?: () => void
  onDuplicate?: () => void
  onZoomToSelection?: () => void
  fieldDimensions?: { widthM: number; heightM: number }
  viewportSize?: { width: number; height: number }
}

/**
 * Registers global keyboard shortcuts for the field editor canvas.
 * Should be called once in the editor layout component.
 */
export function useEditorShortcuts(options: EditorShortcutOptions = {}) {
  const {
    onDeleteSelected,
    onSelectAll,
    onCopy,
    onPaste,
    onDuplicate,
    onZoomToSelection,
    fieldDimensions,
    viewportSize,
  } = options
  const {
    setTool,
    setTemporaryTool,
    restoreTool,
    clearSelection,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToFit,
    toggleInspector,
    toggleGrid,
    toggleSnap,
    toggleLayerVisibility,
    undo,
    redo,
    gridSpacing,
    pan,
    setPan,
    timelineMode,
    enterTimeline,
    exitTimeline,
    timelinePrevDay,
    timelineNextDay,
    timelinePrevMonth,
    timelineNextMonth,
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

      // Ctrl+A: select all
      if (isMod && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        onSelectAll?.()
        return
      }

      // Ctrl+=  / Ctrl++: zoom in
      if (isMod && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomIn()
        return
      }

      // Ctrl+-: zoom out
      if (isMod && e.key === '-') {
        e.preventDefault()
        zoomOut()
        return
      }

      // Ctrl+0: zoom to fit
      if (isMod && e.key === '0') {
        e.preventDefault()
        if (fieldDimensions && viewportSize) {
          zoomToFit(
            fieldDimensions.widthM,
            fieldDimensions.heightM,
            viewportSize.width,
            viewportSize.height,
          )
        }
        return
      }

      // Ctrl+1: reset zoom to 100%
      if (isMod && e.key === '1') {
        e.preventDefault()
        resetZoom()
        return
      }

      // Ctrl+2: zoom to selection
      if (isMod && e.key === '2') {
        e.preventDefault()
        onZoomToSelection?.()
        return
      }

      // Ctrl+C: copy
      if (isMod && (e.key === 'c' || e.key === 'C') && !e.shiftKey) {
        e.preventDefault()
        onCopy?.()
        return
      }

      // Ctrl+X: cut
      if (isMod && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault()
        onCopy?.()
        onDeleteSelected?.()
        return
      }

      // Ctrl+V: paste
      if (isMod && (e.key === 'v' || e.key === 'V') && !e.shiftKey) {
        e.preventDefault()
        onPaste?.()
        return
      }

      // Ctrl+D: duplicate
      if (isMod && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault()
        onDuplicate?.()
        return
      }

      // Ctrl+': toggle snap
      if (isMod && e.key === "'") {
        e.preventDefault()
        toggleSnap()
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
        case 'p':
        case 'P':
          setTool('draw_polygon')
          break
        case 'u':
        case 'U':
          setTool('utility_node')
          break
        case 'c':
        case 'C':
          setTool('utility_edge')
          break

        // Timeline toggle
        case 't':
        case 'T':
          if (timelineMode) {
            exitTimeline()
          } else {
            enterTimeline()
          }
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

        // Delete/Backspace: delete selected items
        case 'Delete':
        case 'Backspace':
          if (onDeleteSelected) {
            e.preventDefault()
            onDeleteSelected()
          }
          break

        // Zoom (without modifier)
        case '=':
        case '+':
          zoomIn()
          break
        case '-':
          zoomOut()
          break

        // Timeline day/month navigation or toggle inspector
        case '[':
          if (timelineMode) {
            timelinePrevDay()
          }
          break
        case ']':
          if (timelineMode) {
            timelineNextDay()
          } else {
            toggleInspector()
          }
          break
        case '{':
          if (timelineMode) {
            timelinePrevMonth()
          }
          break
        case '}':
          if (timelineMode) {
            timelineNextMonth()
          }
          break

        // Toggle grid
        case 'g':
        case 'G':
          toggleGrid()
          break

        // Layer visibility toggles (1-4 without modifiers)
        case '1':
          toggleLayerVisibility('crops')
          break
        case '2':
          toggleLayerVisibility('facilities')
          break
        case '3':
          toggleLayerVisibility('waterUtilities')
          break
        case '4':
          toggleLayerVisibility('electricUtilities')
          break

        // Arrow keys: nudge pan (gridSpacing is in meters, convert to pixels)
        case 'ArrowUp': {
          e.preventDefault()
          const step = (e.shiftKey ? 10 * gridSpacing : gridSpacing) * PAN_PX_PER_METER
          setPan(pan.x, pan.y + step)
          break
        }
        case 'ArrowDown': {
          e.preventDefault()
          const step = (e.shiftKey ? 10 * gridSpacing : gridSpacing) * PAN_PX_PER_METER
          setPan(pan.x, pan.y - step)
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          const step = (e.shiftKey ? 10 * gridSpacing : gridSpacing) * PAN_PX_PER_METER
          setPan(pan.x + step, pan.y)
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          const step = (e.shiftKey ? 10 * gridSpacing : gridSpacing) * PAN_PX_PER_METER
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
      resetZoom,
      zoomToFit,
      toggleInspector,
      toggleGrid,
      toggleSnap,
      toggleLayerVisibility,
      undo,
      redo,
      gridSpacing,
      pan,
      setPan,
      onDeleteSelected,
      onSelectAll,
      onCopy,
      onPaste,
      onDuplicate,
      onZoomToSelection,
      fieldDimensions,
      viewportSize,
      timelineMode,
      enterTimeline,
      exitTimeline,
      timelinePrevDay,
      timelineNextDay,
      timelinePrevMonth,
      timelineNextMonth,
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
