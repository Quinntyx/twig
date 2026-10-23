import { describe, expect, it } from 'vitest'
import {
  DEFAULT_KEYBINDS,
  KEYBIND_ACTIONS,
  formatChord,
  normalizeConfig,
  normalizeKeybinds,
  parseChord
} from './config'

describe('config', () => {
  it('normalizes a partial config over the defaults', () => {
    const keybinds = normalizeKeybinds({ keybinds: { focusLeft: 'y' } })
    expect(keybinds.focusLeft).toEqual(['y'])
    expect(keybinds.focusRight).toEqual(DEFAULT_KEYBINDS.focusRight)
    expect(Object.keys(keybinds).sort()).toEqual([...KEYBIND_ACTIONS].sort())
  })

  it('drops malformed bindings and unknown actions', () => {
    const keybinds = normalizeKeybinds({
      keybinds: { focusLeft: ['y', 'Nonsense+key'], nope: 'z' }
    })
    expect(keybinds.focusLeft).toEqual(['y'])
    expect((keybinds as Record<string, unknown>).nope).toBeUndefined()
  })

  it('falls back when a field has no usable binding', () => {
    const keybinds = normalizeConfig({ keybinds: { focusLeft: 'Wat+q' } }).keybinds
    expect(keybinds.focusLeft).toEqual(DEFAULT_KEYBINDS.focusLeft)
  })

  it('parses modifiers and named keys', () => {
    expect(parseChord('Ctrl+Shift+z')).toMatchObject({ key: 'z', mod: true, shift: true })
    expect(parseChord('Shift+Enter')).toMatchObject({ key: 'Enter', shift: true })
    expect(parseChord('Meta+s')).toMatchObject({ key: 's', meta: true })
    expect(parseChord('Bad+key')).toBeNull()
  })

  it('formats bindings for the UI', () => {
    expect(formatChord('h')).toBe('h')
    expect(formatChord('Shift+l')).toBe('⇧L')
    expect(formatChord('Ctrl+Shift+s')).toBe('Ctrl⇧S')
    expect(formatChord('ArrowLeft')).toBe('←')
    expect(formatChord('Shift+Enter')).toBe('⇧↵')
  })
})
