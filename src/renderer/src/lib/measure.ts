import type { MindNode, NodeSize } from '../../../shared/types'

/**
 * Text measurement and node sizing.
 *
 * Layout runs synchronously in the renderer *and* in unit tests, so node sizes
 * are estimated from a deterministic glyph-width table rather than measured
 * from the DOM. The CSS in `styles.css` mirrors these constants exactly:
 * font-size 14px, line-height 20px, padding 10px 12px, 1px border.
 */

export const NODE_FONT_SIZE = 14
export const NODE_LINE_HEIGHT = 20
export const NODE_PADDING_X = 12
export const NODE_PADDING_Y = 10
/** 1px border on each side, included because nodes use border-box sizing. */
export const NODE_BORDER = 2
export const NODE_MAX_TEXT_WIDTH = 240
export const NODE_MIN_WIDTH = 64
export const PLACEHOLDER_TEXT = 'New idea'

const MAX_TEXT_WIDTH = NODE_MAX_TEXT_WIDTH
const MIN_NODE_WIDTH = NODE_MIN_WIDTH

/** Must match `--font-node` and font-size in styles.css. */
export const NODE_FONT_STACK =
  "'Inter', 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', sans-serif"

let measureContext: CanvasRenderingContext2D | null | undefined

/**
 * Real text metrics when a DOM is available; the glyph table is the fallback
 * for unit tests (and any headless context without a canvas).
 */
function context(): CanvasRenderingContext2D | null {
  if (measureContext !== undefined) return measureContext
  if (typeof document === 'undefined') {
    measureContext = null
    return null
  }
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.font = `${NODE_FONT_SIZE}px ${NODE_FONT_STACK}`
  measureContext = ctx
  return ctx
}

function glyphWidth(char: string): number {
  const code = char.codePointAt(0) ?? 0
  if (char === '\t') return NODE_FONT_SIZE * 2
  if (char === ' ') return NODE_FONT_SIZE * 0.3
  // CJK, Hangul, full-width forms and emoji are roughly one em wide.
  if (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    code >= 0x1f300
  ) {
    return NODE_FONT_SIZE
  }
  if (/[iljtfrI.,:;'!|`()[\]]/.test(char)) return NODE_FONT_SIZE * 0.32
  if (/[mwMW@%&]/.test(char)) return NODE_FONT_SIZE * 0.86
  if (/[A-Z0-9]/.test(char)) return NODE_FONT_SIZE * 0.64
  if (/[-+=<>~^*\\/{}"]/.test(char)) return NODE_FONT_SIZE * 0.5
  return NODE_FONT_SIZE * 0.56
}

export function textWidth(text: string): number {
  const ctx = context()
  if (ctx) return ctx.measureText(text).width
  let width = 0
  for (const char of text) width += glyphWidth(char)
  return width
}

/** Wrap at explicit newlines first, then on word boundaries up to `maxWidth`. */
export function wrapText(text: string, maxWidth = MAX_TEXT_WIDTH): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines: string[] = []

  for (const paragraph of normalized.split('\n')) {
    if (paragraph.length === 0) {
      lines.push('')
      continue
    }

    let current = ''
    let currentWidth = 0

    for (const char of paragraph) {
      const width = glyphWidth(char)
      if (current.length > 0 && currentWidth + width > maxWidth) {
        const space = current.lastIndexOf(' ')
        if (space > 0 && space < current.length - 1) {
          lines.push(current.slice(0, space))
          current = current.slice(space + 1)
          currentWidth = textWidth(current)
        } else {
          lines.push(current)
          current = ''
          currentWidth = 0
        }
      }
      current += char
      currentWidth += width
    }

    lines.push(current)
  }

  return lines.length > 0 ? lines : ['']
}

export function measureNodeText(text: string): { width: number; height: number; lines: string[] } {
  const display = text.length > 0 ? text : PLACEHOLDER_TEXT
  const lines = wrapText(display)
  const widest = Math.max(0, ...lines.map((line) => textWidth(line)))
  return {
    width: Math.min(MAX_TEXT_WIDTH, Math.ceil(widest) + 1),
    height: Math.max(1, lines.length) * NODE_LINE_HEIGHT,
    lines
  }
}

export function estimateNodeSize(node: Pick<MindNode, 'text'>): NodeSize {
  const { width, height } = measureNodeText(node.text)
  return {
    width: Math.max(MIN_NODE_WIDTH, width + NODE_PADDING_X * 2 + NODE_BORDER),
    height: height + NODE_PADDING_Y * 2 + NODE_BORDER
  }
}
