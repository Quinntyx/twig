import { describe, expect, it } from 'vitest'
import {
  DEFAULT_INSERT_KEYBINDS,
  DEFAULT_KEYBINDS,
  type InsertKeybinds,
  type Keybinds
} from '../../../shared/config'
import { keyToAction, keyToInsertAction, type KeyLike } from './keyboard'

function key(overrides: Partial<KeyLike>): KeyLike {
  return { key: '', ...overrides }
}

describe('keyToAction', () => {
  it('maps vim navigation', () => {
    expect(keyToAction(key({ key: 'h' }))).toEqual({ type: 'focus', direction: 'left' })
    expect(keyToAction(key({ key: 'l' }))).toEqual({ type: 'focus', direction: 'right' })
    expect(keyToAction(key({ key: 'j' }))).toEqual({ type: 'focus', direction: 'down' })
    expect(keyToAction(key({ key: 'k' }))).toEqual({ type: 'focus', direction: 'up' })
  })

  it('maps arrow keys to the same actions', () => {
    expect(keyToAction(key({ key: 'ArrowLeft' }))).toEqual({ type: 'focus', direction: 'left' })
    expect(keyToAction(key({ key: 'ArrowRight' }))).toEqual({ type: 'focus', direction: 'right' })
    expect(keyToAction(key({ key: 'ArrowDown' }))).toEqual({ type: 'focus', direction: 'down' })
    expect(keyToAction(key({ key: 'ArrowUp' }))).toEqual({ type: 'focus', direction: 'up' })
  })

  it('maps structure keys', () => {
    expect(keyToAction(key({ key: 'i' }))).toEqual({ type: 'edit' })
    expect(keyToAction(key({ key: 'o' }))).toEqual({ type: 'create', kind: 'sibling-after' })
    expect(keyToAction(key({ key: 'd' }))).toEqual({ type: 'delete' })
    expect(keyToAction(key({ key: 'Delete' }))).toEqual({ type: 'delete' })
    expect(keyToAction(key({ key: 'Enter', shiftKey: true }))).toEqual({ type: 'create', kind: 'child' })
    expect(keyToAction(key({ key: 'H', shiftKey: true }))).toEqual({ type: 'create', kind: 'parent' })
  })

  it('creates nodes with the shifted movement keys', () => {
    expect(keyToAction(key({ key: 'H', shiftKey: true }))).toEqual({ type: 'create', kind: 'parent' })
    expect(keyToAction(key({ key: 'L', shiftKey: true }))).toEqual({ type: 'create', kind: 'child' })
    expect(keyToAction(key({ key: 'J', shiftKey: true }))).toEqual({
      type: 'create',
      kind: 'sibling-after'
    })
    expect(keyToAction(key({ key: 'K', shiftKey: true }))).toEqual({
      type: 'create',
      kind: 'sibling-before'
    })
  })

  it('maps history, help and escape', () => {
    expect(keyToAction(key({ key: 'u' }))).toEqual({ type: 'undo' })
    expect(keyToAction(key({ key: '?' }))).toEqual({ type: 'toggle-help' })
    expect(keyToAction(key({ key: 'Escape' }))).toEqual({ type: 'escape' })
  })

  it('maps modified shortcuts', () => {
    expect(keyToAction(key({ key: 's', ctrlKey: true }))).toEqual({ type: 'file', command: 'save' })
    expect(keyToAction(key({ key: 'S', ctrlKey: true, shiftKey: true }))).toEqual({
      type: 'file',
      command: 'save-as'
    })
    expect(keyToAction(key({ key: 'o', metaKey: true }))).toEqual({ type: 'file', command: 'open' })
    expect(keyToAction(key({ key: 'n', ctrlKey: true }))).toEqual({ type: 'file', command: 'new' })
    expect(keyToAction(key({ key: 'z', ctrlKey: true }))).toEqual({ type: 'undo' })
    expect(keyToAction(key({ key: 'Z', ctrlKey: true, shiftKey: true }))).toEqual({ type: 'redo' })
    expect(keyToAction(key({ key: 'y', ctrlKey: true }))).toEqual({ type: 'redo' })
  })

  it('ignores unbound keys and alt chords', () => {
    expect(keyToAction(key({ key: 'q' }))).toBeNull()
    expect(keyToAction(key({ key: 'h', altKey: true }))).toBeNull()
    expect(keyToAction(key({ key: 'Ctrl' }))).toBeNull()
    expect(keyToAction(key({ key: 'p', ctrlKey: true }))).toBeNull()
  })

  it('applies a Workman-style keymap', () => {
    const workman: Keybinds = {
      ...DEFAULT_KEYBINDS,
      focusLeft: ['y', 'ArrowLeft'],
      focusRight: ['o', 'ArrowRight'],
      focusUp: ['e', 'ArrowUp'],
      focusDown: ['n', 'ArrowDown'],
      createParent: ['Shift+y'],
      createChild: ['Shift+Enter', 'Shift+o'],
      createSiblingBefore: ['Shift+e'],
      createSiblingAfter: ['p', 'Shift+n']
    }

    expect(keyToAction(key({ key: 'y' }), workman)).toEqual({ type: 'focus', direction: 'left' })
    expect(keyToAction(key({ key: 'o' }), workman)).toEqual({ type: 'focus', direction: 'right' })
    expect(keyToAction(key({ key: 'e' }), workman)).toEqual({ type: 'focus', direction: 'up' })
    expect(keyToAction(key({ key: 'n' }), workman)).toEqual({ type: 'focus', direction: 'down' })
    expect(keyToAction(key({ key: 'Y', shiftKey: true }), workman)).toEqual({
      type: 'create',
      kind: 'parent'
    })
    expect(keyToAction(key({ key: 'O', shiftKey: true }), workman)).toEqual({
      type: 'create',
      kind: 'child'
    })
    expect(keyToAction(key({ key: 'N', shiftKey: true }), workman)).toEqual({
      type: 'create',
      kind: 'sibling-after'
    })
    expect(keyToAction(key({ key: 'E', shiftKey: true }), workman)).toEqual({
      type: 'create',
      kind: 'sibling-before'
    })
    expect(keyToAction(key({ key: 'p' }), workman)).toEqual({ type: 'create', kind: 'sibling-after' })
    expect(keyToAction(key({ key: 'h' }), workman)).toBeNull()
    expect(keyToAction(key({ key: 'H', shiftKey: true }), workman)).toBeNull()
  })
})

describe('keyToInsertAction', () => {
  it('maps Ctrl+H/J/K/L to the shifted creation actions', () => {
    expect(keyToInsertAction(key({ key: 'h', ctrlKey: true }))).toEqual({
      type: 'create',
      kind: 'parent'
    })
    expect(keyToInsertAction(key({ key: 'j', ctrlKey: true }))).toEqual({
      type: 'create',
      kind: 'sibling-after'
    })
    expect(keyToInsertAction(key({ key: 'k', ctrlKey: true }))).toEqual({
      type: 'create',
      kind: 'sibling-before'
    })
    expect(keyToInsertAction(key({ key: 'l', ctrlKey: true }))).toEqual({
      type: 'create',
      kind: 'child'
    })
  })

  it('does not respond to plain or shifted letters', () => {
    expect(keyToInsertAction(key({ key: 'h' }))).toBeNull()
    expect(keyToInsertAction(key({ key: 'H', shiftKey: true }))).toBeNull()
    expect(keyToInsertAction(key({ key: 'z', ctrlKey: true }))).toBeNull()
  })

  it('applies a Workman-style insert keymap', () => {
    const workmanInsert: InsertKeybinds = {
      createParent: ['Ctrl+y'],
      createChild: ['Ctrl+o'],
      createSiblingBefore: ['Ctrl+e'],
      createSiblingAfter: ['Ctrl+n']
    }

    expect(keyToInsertAction(key({ key: 'y', ctrlKey: true }), workmanInsert)).toEqual({
      type: 'create',
      kind: 'parent'
    })
    expect(keyToInsertAction(key({ key: 'o', ctrlKey: true }), workmanInsert)).toEqual({
      type: 'create',
      kind: 'child'
    })
    expect(keyToInsertAction(key({ key: 'e', ctrlKey: true }), workmanInsert)).toEqual({
      type: 'create',
      kind: 'sibling-before'
    })
    expect(keyToInsertAction(key({ key: 'n', ctrlKey: true }), workmanInsert)).toEqual({
      type: 'create',
      kind: 'sibling-after'
    })
  })

  it('keeps the insert defaults independent of normal keybinds', () => {
    expect(keyToInsertAction(key({ key: 'h', ctrlKey: true }), DEFAULT_INSERT_KEYBINDS)).toEqual({
      type: 'create',
      kind: 'parent'
    })
    expect(keyToAction(key({ key: 'h', ctrlKey: true }))).toBeNull()
  })

  it('uses Command instead of Control for insert aliases on macOS', () => {
    const insertKeybinds: InsertKeybinds = {
      ...DEFAULT_INSERT_KEYBINDS,
      createParent: ['Ctrl+h']
    }

    expect(keyToInsertAction(key({ key: 'h', metaKey: true }), insertKeybinds, true)).toEqual({
      type: 'create',
      kind: 'parent'
    })
    expect(keyToInsertAction(key({ key: 'h', ctrlKey: true }), insertKeybinds, true)).toBeNull()
    expect(keyToInsertAction(key({ key: 'h', metaKey: true }), insertKeybinds, false)).toBeNull()
    expect(keyToInsertAction(key({ key: 'h', ctrlKey: true }), insertKeybinds, false)).toEqual({
      type: 'create',
      kind: 'parent'
    })
  })

  it('reads DOM events through their getters', () => {
    // Properties such as key/ctrlKey are prototype getters on KeyboardEvent,
    // so spreading the event would lose them.
    const domEvent = {
      get key(): string {
        return 'l'
      },
      get ctrlKey(): boolean {
        return true
      },
      get metaKey(): boolean {
        return false
      },
      get shiftKey(): boolean {
        return false
      },
      get altKey(): boolean {
        return false
      }
    }

    expect(keyToInsertAction(domEvent)).toEqual({ type: 'create', kind: 'child' })
  })
})
