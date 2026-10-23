import { describe, expect, it } from 'vitest'
import { DEFAULT_KEYBINDS, type Keybinds } from '../../../shared/config'
import { keyToAction, type KeyLike } from './keyboard'

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
    expect(keyToAction(key({ key: 'x' }))).toEqual({ type: 'delete' })
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
