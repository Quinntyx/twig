import type { MindNode, NodeSize } from '../../../shared/types'
import { markdownToPlainText } from './markdown'

/**
 * Text measurement and node sizing. Node text is Markdown, so layout measures
 * the visible plain text (formatting characters are not rendered).
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

/** Font scale for h1..h6; mirrors the heading sizes in styles.css. */
export const NODE_HEADING_SCALES = [1.36, 1.22, 1.11, 1, 1, 1] as const

const LIST_INDENT = 16
const QUOTE_INDENT = 10
const CODE_INDENT = 16
const CODE_SCALE = 0.86
const CODE_LINE_HEIGHT = 18
const CODE_PADDING = 12
const TASK_CHECKBOX = 14
const TABLE_SCALE = 0.86
const TABLE_LINE_HEIGHT = 20
const TABLE_MIN_WIDTH = 200
const IMAGE_HEIGHT = 72
const IMAGE_MIN_WIDTH = 160

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

interface BlockLine {
  text: string
  scale: number
  lineHeight: number
  indent: number
  extra: number
  minWidth?: number
}

const FENCE = /^\s{0,3}(?:```|~~~)/
const HEADING = /^\s{0,3}(#{1,6})\s+(.*)$/
const LIST_ITEM = /^(\s*)(?:[-*+]|\d+[.)])\s+/
const TASK_ITEM = /^(\s*)(?:[-*+]|\d+[.)])\s+\[[ xX]\]\s+/
const QUOTE = /^(\s*(?:>\s?)+)/
const RULE = /^\s{0,3}(?:[-*_])(?:\s*[-*_]){2,}\s*$/
const IMAGE_LINE = /^\s*!\[[^\]]*\]\([^)]*\)\s*$/
const TABLE_ROW = /^\s*\|.*\|\s*$/

function rawCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function tableCells(line: string): string[] {
  return rawCells(line).map((cell) => markdownToPlainText(cell))
}

function isTableSeparator(line: string): boolean {
  return rawCells(line).every((cell) => /^:?-+:?$/.test(cell))
}

/**
 * Break Markdown into the visual lines a node renders, preserving the
 * relative font scale and indentation of headings, lists, quotes and code.
 * This is intentionally layout-only: it does not need to be a full parser.
 */
function blockLines(markdown: string): BlockLine[] {
  const source = markdown.replace(/\r\n?/g, '\n').split('\n')
  const lines: BlockLine[] = []
  let inCode = false
  let codeStarted = false

  for (const raw of source) {
    if (FENCE.test(raw)) {
      inCode = !inCode
      codeStarted = false
      continue
    }

    if (inCode) {
      lines.push({
        // Code blocks preserve punctuation literally; only spaces are visible
        // for wrapping purposes.
        text: raw.replace(/\t/g, '  '),
        scale: CODE_SCALE,
        lineHeight: CODE_LINE_HEIGHT,
        indent: CODE_INDENT,
        extra: codeStarted ? 0 : CODE_PADDING
      })
      codeStarted = true
      continue
    }

    const heading = HEADING.exec(raw)
    if (heading) {
      const level = (heading[1] ?? '').length
      const scale = NODE_HEADING_SCALES[level - 1] ?? 1
      lines.push({
        text: markdownToPlainText(heading[2] ?? ''),
        scale,
        lineHeight: NODE_LINE_HEIGHT * scale,
        indent: 0,
        extra: 0
      })
      continue
    }

    if (IMAGE_LINE.test(raw)) {
      lines.push({
        text: '',
        scale: 1,
        lineHeight: 0,
        indent: 0,
        extra: IMAGE_HEIGHT,
        minWidth: IMAGE_MIN_WIDTH
      })
      continue
    }

    if (TABLE_ROW.test(raw)) {
      if (isTableSeparator(raw)) continue
      const cells = tableCells(raw)
      lines.push({
        text: cells.join('  '),
        scale: TABLE_SCALE,
        lineHeight: TABLE_LINE_HEIGHT,
        indent: 0,
        extra: 0,
        minWidth: Math.max(TABLE_MIN_WIDTH, cells.length * 70)
      })
      continue
    }

    const quote = QUOTE.exec(raw)
    if (quote) {
      const depth = ((quote[1] ?? '').match(/>/g) ?? []).length
      lines.push({
        text: markdownToPlainText(raw),
        scale: 1,
        lineHeight: NODE_LINE_HEIGHT,
        indent: QUOTE_INDENT * Math.max(1, depth),
        extra: 0
      })
      continue
    }

    const task = TASK_ITEM.exec(raw)
    if (task) {
      const depth = Math.floor((task[1] ?? '').length / 2)
      lines.push({
        text: markdownToPlainText(raw),
        scale: 1,
        lineHeight: NODE_LINE_HEIGHT,
        indent: LIST_INDENT * (depth + 1) + TASK_CHECKBOX,
        extra: 0
      })
      continue
    }

    const list = LIST_ITEM.exec(raw)
    if (list) {
      const depth = Math.floor((list[1] ?? '').length / 2)
      lines.push({
        text: markdownToPlainText(raw),
        scale: 1,
        lineHeight: NODE_LINE_HEIGHT,
        indent: LIST_INDENT * (depth + 1),
        extra: 0
      })
      continue
    }

    lines.push({
      text: markdownToPlainText(raw),
      scale: 1,
      lineHeight: NODE_LINE_HEIGHT,
      indent: 0,
      // A horizontal rule is shorter than an empty text line.
      extra: RULE.test(raw) ? -3 : 0
    })
  }

  return lines
}

export function measureNodeText(text: string): { width: number; height: number; lines: string[] } {
  const buffer = blockLines(text)
  const measured = buffer.length > 0 ? buffer : [{ text: '', scale: 1, lineHeight: NODE_LINE_HEIGHT, indent: 0, extra: 0 }]
  const hasVisibleText = measured.some(
    (line) => line.text.trim().length > 0 || line.extra !== 0 || line.minWidth !== undefined
  )
  const blocks = hasVisibleText
    ? measured
    : [{ text: PLACEHOLDER_TEXT, scale: 1, lineHeight: NODE_LINE_HEIGHT, indent: 0, extra: 0 }]

  let height = 0
  let widest = 0
  const lines: string[] = []

  for (const block of blocks) {
    const maxWidth = Math.max(24, (MAX_TEXT_WIDTH - block.indent) / block.scale)
    const wrapped = wrapText(block.text, maxWidth)
    for (const line of wrapped) {
      lines.push(line)
      height += block.lineHeight
      widest = Math.max(
        widest,
        block.minWidth ?? 0,
        textWidth(line) * block.scale + block.indent
      )
    }
    height += block.extra
  }

  return {
    width: Math.min(MAX_TEXT_WIDTH, Math.ceil(widest) + 1),
    height: Math.max(1, height),
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
