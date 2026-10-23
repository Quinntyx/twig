import { useEffect } from 'react'
import type { Direction } from '../../../shared/types'
import type { MenuAction } from '../../../shared/ipc'
import {
  DEFAULT_INSERT_KEYBINDS,
  DEFAULT_KEYBINDS,
  INSERT_KEYBIND_ACTIONS,
  KEYBIND_ACTIONS,
  chordMatches,
  parseChord,
  type InsertKeybindAction,
  type InsertKeybinds,
  type KeyChord,
  type KeyLike,
  type KeybindAction,
  type Keybinds
} from '../../../shared/config'
import { useMindStore, type CreateKind } from '../store'
import { newFlowCommand, openFlowCommand, saveFlowCommand } from './commands'

export type { KeyLike }

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

const KEY_ACTIONS: Record<KeybindAction, KeyAction> = {
  focusLeft: { type: 'focus', direction: 'left' },
  focusRight: { type: 'focus', direction: 'right' },
  focusUp: { type: 'focus', direction: 'up' },
  focusDown: { type: 'focus', direction: 'down' },
  createParent: { type: 'create', kind: 'parent' },
  createChild: { type: 'create', kind: 'child' },
  createSiblingBefore: { type: 'create', kind: 'sibling-before' },
  createSiblingAfter: { type: 'create', kind: 'sibling-after' },
  edit: { type: 'edit' },
  delete: { type: 'delete' },
  undo: { type: 'undo' },
  redo: { type: 'redo' },
  toggleHelp: { type: 'toggle-help' },
  newMap: { type: 'file', command: 'new' },
  openMap: { type: 'file', command: 'open' },
  saveMap: { type: 'file', command: 'save' },
  saveMapAs: { type: 'file', command: 'save-as' }
}

/**
 * Map a keyboard event to an editor action using the user's config. Pure, so
 * the mapping can be verified without a DOM. Escape is always reserved for
 * leaving insert/cancel help, regardless of config.
 */
export function keyToAction(event: KeyLike, keybinds: Keybinds = DEFAULT_KEYBINDS): KeyAction | null {
  if (event.key === 'Escape') return { type: 'escape' }

  for (const action of KEYBIND_ACTIONS) {
    const bindings = keybinds[action] ?? DEFAULT_KEYBINDS[action]
    for (const spec of bindings) {
      const chord = parseChord(spec)
      if (chord && chordMatches(chord, event)) return KEY_ACTIONS[action]
    }
  }
  return null
}

const INSERT_KEY_ACTIONS: Record<InsertKeybindAction, KeyAction> = {
  createParent: KEY_ACTIONS.createParent,
  createChild: KEY_ACTIONS.createChild,
  createSiblingBefore: KEY_ACTIONS.createSiblingBefore,
  createSiblingAfter: KEY_ACTIONS.createSiblingAfter
}

/**
 * Map a key held while inserting to a creation action. These aliases exist
 * because the normal creation keys are shifted letters, which must stay
 * available for typing capital letters in the textarea. On macOS the primary
 * modifier is Command, not Control.
 */
export function keyToInsertAction(
  event: KeyLike,
  insertKeybinds: InsertKeybinds = DEFAULT_INSERT_KEYBINDS,
  isMac = false
): KeyAction | null {
  if (event.key === 'Escape') return null

  for (const action of INSERT_KEYBIND_ACTIONS) {
    const bindings = insertKeybinds[action] ?? DEFAULT_INSERT_KEYBINDS[action]
    for (const spec of bindings) {
      const chord = parseChord(spec)
      if (chord && insertChordMatches(chord, event, isMac)) return INSERT_KEY_ACTIONS[action]
    }
  }
  return null
}

function insertChordMatches(chord: KeyChord, event: KeyLike, isMac: boolean): boolean {
  if (!chord.mod) return chordMatches(chord, event)

  // `Ctrl` in an insert alias means Command on macOS and Control elsewhere;
  // it must not match the other modifier, since macOS uses Control for text
  // editing (e.g. Ctrl+H is backspace).
  if (isMac) {
    if (!event.metaKey || event.ctrlKey) return false
  } else if (!event.ctrlKey || event.metaKey) {
    return false
  }

  return chordMatches(
    { ...chord, mod: false, meta: false },
    {
      key: event.key,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      ctrlKey: false,
      metaKey: false
    }
  )
}

export function isMacPlatform(): boolean {
  if (typeof window !== 'undefined' && window.twig?.platform) {
    return window.twig.platform === 'darwin'
  }
  if (typeof navigator !== 'undefined') return /mac/i.test(navigator.platform)
  return false
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable
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
  const keybinds = useMindStore((state) => state.keybinds)
  const insertKeybinds = useMindStore((state) => state.insertKeybinds)
  const isMac = isMacPlatform()

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const state = useMindStore.getState()
      const editable = isEditableTarget(event.target)
      const inserting = editable && state.editingId !== null

      // Insert aliases win over normal bindings so e.g. C-n can create a
      // sibling on Workman instead of opening a new map.
      const insertAction = inserting ? keyToInsertAction(event, insertKeybinds, isMac) : null
      const action = insertAction ?? keyToAction(event, keybinds)
      if (!action) return

      if (editable && !insertAction) {
        // While inserting, let the textarea own every key except the file
        // shortcuts; Escape is handled by the editor.
        if (action.type !== 'file') return
      }

      if (state.editingId !== null && action.type === 'toggle-help') return
      if (state.helpOpen && action.type !== 'escape' && action.type !== 'toggle-help') return

      event.preventDefault()
      event.stopPropagation()
      void executeKeyAction(action)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [keybinds, insertKeybinds, isMac])
}
