import { describe, expect, it } from 'vitest'
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
})
