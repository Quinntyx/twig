import { useEffect } from 'react'
import type { Direction } from '../../../shared/types'
import type { MenuAction } from '../../../shared/ipc'
import { useMindStore, type CreateKind } from '../store'
import { newFlowCommand, openFlowCommand, saveFlowCommand } from './commands'

export type KeyAction =
  | { type: 'focus'; direction: Direction }
  | { type: 'create'; kind: CreateKind }
  | { type: 'edit' }
  | { type: 'delete' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'toggle-help' }
  | { type: 'escape' }
  | { type: 'file'; command: MenuAction }

export interface KeyLike {
  key: string
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
}

/**
 * Map a keyboard event to an editor action. Pure, so the mapping can be
 * verified without a DOM.
 */
export function keyToAction(event: KeyLike): KeyAction | null {
  const key = event.key
  const lower = key.length === 1 ? key.toLowerCase() : key
  const mod = Boolean(event.ctrlKey || event.metaKey)

  if (mod) {
    switch (lower) {
      case 's':
        return { type: 'file', command: event.shiftKey ? 'save-as' : 'save' }
      case 'o':
        return { type: 'file', command: 'open' }
      case 'n':
        return { type: 'file', command: 'new' }
      case 'z':
        return event.shiftKey ? { type: 'redo' } : { type: 'undo' }
      case 'y':
        return { type: 'redo' }
      default:
        return null
    }
  }

  if (event.altKey) return null
  if (key === '?') return { type: 'toggle-help' }
  if (key === 'Escape') return { type: 'escape' }

  switch (key) {
    case 'ArrowLeft':
      return { type: 'focus', direction: 'left' }
    case 'ArrowRight':
      return { type: 'focus', direction: 'right' }
    case 'ArrowUp':
      return { type: 'focus', direction: 'up' }
    case 'ArrowDown':
      return { type: 'focus', direction: 'down' }
    default:
      break
  }

  switch (lower) {
    case 'h':
      return event.shiftKey
        ? { type: 'create', kind: 'parent' }
        : { type: 'focus', direction: 'left' }
    case 'l':
      return { type: 'focus', direction: 'right' }
    case 'j':
      return { type: 'focus', direction: 'down' }
    case 'k':
      return { type: 'focus', direction: 'up' }
    case 'i':
      return { type: 'edit' }
    case 'o':
      return { type: 'create', kind: 'sibling-after' }
    case 'u':
      return { type: 'undo' }
    case 'x':
      return { type: 'delete' }
    default:
      break
  }

  if (key === 'Delete') return { type: 'delete' }
  if (key === 'Enter' && event.shiftKey) return { type: 'create', kind: 'child' }
  return null
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'INPUT' ||
    target.isContentEditable
  )
}

export async function executeKeyAction(action: KeyAction): Promise<void> {
  const store = useMindStore.getState()

  switch (action.type) {
    case 'focus':
      store.moveFocus(action.direction)
      return
    case 'create':
      store.createNode(action.kind)
      return
    case 'edit':
      store.startEditing()
      return
    case 'delete':
      store.deleteFocused()
      return
    case 'undo':
      store.undo()
      return
    case 'redo':
      store.redo()
      return
    case 'toggle-help':
      store.setHelpOpen(!store.helpOpen)
      return
    case 'escape':
      if (store.editingId !== null) store.stopEditing()
      else if (store.helpOpen) store.setHelpOpen(false)
      return
    case 'file':
      if (action.command === 'new') newFlowCommand()
      else if (action.command === 'open') await openFlowCommand()
      else await saveFlowCommand(action.command === 'save-as')
      return
  }
}

export function useKeyboard(): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const action = keyToAction(event)
      if (!action) return

      const editable = isEditableTarget(event.target)
      if (editable) {
        // While inserting, let the textarea own every key except the file
        // shortcuts; Escape is handled by the editor.
        if (action.type !== 'file') return
      }

      const state = useMindStore.getState()
      if (state.editingId !== null && action.type === 'toggle-help') return
      if (state.helpOpen && action.type !== 'escape' && action.type !== 'toggle-help') return

      event.preventDefault()
      event.stopPropagation()
      void executeKeyAction(action)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
