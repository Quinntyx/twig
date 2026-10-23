/**
 * User config contract shared by the main process (which creates the file) and
 * the renderer (which applies it). The config is deliberately plain JSON so it
 * stays diffable and can live in chezmoi.
 */

export const CONFIG_VERSION = 1

/** Every configurable keybinding action, in the order written to the file. */
export const KEYBIND_ACTIONS = [
  'focusLeft',
  'focusRight',
  'focusUp',
  'focusDown',
  'createParent',
  'createChild',
  'createSiblingBefore',
  'createSiblingAfter',
  'edit',
  'delete',
  'undo',
  'redo',
  'toggleHelp',
  'newMap',
  'openMap',
  'saveMap',
  'saveMapAs'
] as const

export type KeybindAction = (typeof KEYBIND_ACTIONS)[number]
export type Keybinds = Record<KeybindAction, string[]>

/**
 * Values use `+`-separated chords. `Ctrl` means Ctrl on Linux/Windows and is
 * also accepted as Cmd on macOS, matching the old hard-coded behaviour. Keys
 * are matched case-insensitively; `Shift` is significant for letter keys.
 */
export const DEFAULT_KEYBINDS: Keybinds = {
  focusLeft: ['h', 'ArrowLeft'],
  focusRight: ['l', 'ArrowRight'],
  focusUp: ['k', 'ArrowUp'],
  focusDown: ['j', 'ArrowDown'],
  createParent: ['Shift+h'],
  createChild: ['Shift+Enter', 'Shift+l'],
  createSiblingBefore: ['Shift+k'],
  createSiblingAfter: ['o', 'Shift+j'],
  edit: ['i'],
  delete: ['x', 'Delete'],
  undo: ['u', 'Ctrl+z'],
  redo: ['Ctrl+Shift+z', 'Ctrl+y'],
  toggleHelp: ['?'],
  newMap: ['Ctrl+n'],
  openMap: ['Ctrl+o'],
  saveMap: ['Ctrl+s'],
  saveMapAs: ['Ctrl+Shift+s']
}

export interface TwigConfig {
  version: number
  keybinds: Keybinds
}

export const DEFAULT_CONFIG: TwigConfig = {
  version: CONFIG_VERSION,
  keybinds: DEFAULT_KEYBINDS
}

export interface KeyLike {
  key: string
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  altKey?: boolean
}

export interface KeyChord {
  key: string
  /** Ctrl or Meta (the historical cross-platform "modifier"). */
  mod: boolean
  /** Explicit Meta/Cmd. */
  meta: boolean
  alt: boolean
  shift: boolean
}

const MODIFIER_ALIASES = new Set(['ctrl', 'control', 'mod', 'meta', 'cmd', 'command', 'super', 'alt', 'option', 'shift'])
const NAMED_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Enter',
  'Escape',
  'Delete',
  'Backspace',
  'Tab',
  'Space'
])

/** Parse one binding string such as `h`, `Shift+h`, or `Ctrl+Shift+z`. */
export function parseChord(spec: string): KeyChord | null {
  const parts = spec.split('+').map((part) => part.trim())
  const key = parts.pop()
  if (!key || parts.some((part) => part === '')) return null

  let mod = false
  let meta = false
  let alt = false
  let shift = false

  for (const part of parts) {
    switch (part.toLowerCase()) {
      case 'ctrl':
      case 'control':
      case 'mod':
        mod = true
        break
      case 'meta':
      case 'cmd':
      case 'command':
      case 'super':
        meta = true
        break
      case 'alt':
      case 'option':
        alt = true
        break
      case 'shift':
        shift = true
        break
      default:
        return null
    }
  }

  if (key.length > 1 && !NAMED_KEYS.has(key) && !NAMED_KEYS.has(key[0]?.toUpperCase() + key.slice(1))) {
    return null
  }

  return { key: normalizeNamedKey(key), mod, meta, alt, shift }
}

function normalizeNamedKey(key: string): string {
  const lower = key.toLowerCase()
  if (lower === 'esc') return 'Escape'
  if (lower === 'space' || key === ' ') return 'Space'
  if (lower === 'del') return 'Delete'
  const named = [...NAMED_KEYS].find((name) => name.toLowerCase() === lower)
  return named ?? key
}

function isAlphaKey(key: string): boolean {
  return /^[a-z]$/i.test(key)
}

/** Test a parsed chord against a DOM-ish keyboard event. */
export function chordMatches(chord: KeyChord, event: KeyLike): boolean {
  const modPressed = Boolean(event.ctrlKey || event.metaKey)
  if (chord.mod || chord.meta ? !modPressed : modPressed) return false
  if (chord.meta && !event.metaKey) return false
  if (Boolean(event.altKey) !== chord.alt) return false

  // A plain letter must not fire while Shift is held, so `h` and `Shift+h`
  // stay distinguishable. Punctuation such as `?` needs Shift on most
  // layouts, and named keys keep their existing shift-agnostic behaviour.
  if (chord.shift) {
    if (!event.shiftKey) return false
  } else if (isAlphaKey(chord.key) && event.shiftKey) {
    return false
  }

  if (chord.key === 'Space') return event.key === ' '
  if (isAlphaKey(chord.key)) return event.key.toLowerCase() === chord.key.toLowerCase()
  return event.key === chord.key || event.key.toLowerCase() === chord.key.toLowerCase()
}

function asStringArray(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return []
}

/**
 * Merge user input with defaults. Unknown actions are ignored, malformed
 * chords are dropped, and an action with no usable value keeps its default so
 * a config can never leave the app without navigation.
 */
export function normalizeKeybinds(raw: unknown): Keybinds {
  const source =
    isRecord(raw) && isRecord(raw['keybinds'])
      ? raw['keybinds']
      : isRecord(raw)
        ? raw
        : {}

  const result = {} as Keybinds
  for (const action of KEYBIND_ACTIONS) {
    const candidates = asStringArray(source[action])
      .map((value) => value.trim())
      .filter((value) => parseChord(value) !== null)
    result[action] = candidates.length > 0 ? candidates : [...DEFAULT_KEYBINDS[action]]
  }
  return result
}

export function normalizeConfig(raw: unknown): TwigConfig {
  const version =
    isRecord(raw) && typeof raw['version'] === 'number' ? raw['version'] : CONFIG_VERSION
  return { version, keybinds: normalizeKeybinds(raw) }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const DISPLAY_KEYS: Record<string, string> = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Enter: '↵',
  Escape: 'Esc',
  Delete: 'Del',
  Backspace: '⌫',
  Tab: '⇥',
  Space: 'Space'
}

/** Render a binding the way the help overlay and status bar show it. */
export function formatChord(spec: string): string {
  const chord = parseChord(spec)
  if (!chord) return spec

  const prefix =
    (chord.mod ? 'Ctrl' : '') +
    (chord.meta ? '⌘' : '') +
    (chord.alt ? '⌥' : '') +
    (chord.shift ? '⇧' : '')
  const key = DISPLAY_KEYS[chord.key] ?? chord.key
  const label = prefix !== '' && key.length === 1 ? key.toUpperCase() : key
  return prefix + label
}

/** All displayable bindings for an action, e.g. `['y', '←']`. */
export function formatKeybinds(bindings: string[]): string[] {
  return bindings.map(formatChord)
}
