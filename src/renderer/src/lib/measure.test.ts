import { describe, expect, it } from 'vitest'
import {
  NODE_FONT_SIZE,
  NODE_LINE_HEIGHT,
  NODE_MAX_TEXT_WIDTH,
  PLACEHOLDER_TEXT,
  estimateNodeSize,
  measureNodeText,
  textWidth,
  wrapText
} from './measure'

describe('text measurement', () => {
  it('widens with more characters and narrows for thin glyphs', () => {
    expect(textWidth('iiii')).toBeLessThan(textWidth('mmmm'))
    expect(textWidth('')).toBe(0)
    expect(textWidth('a')).toBeGreaterThan(0)
  })

  it('treats CJK glyphs as full-width', () => {
    expect(textWidth('中')).toBe(NODE_FONT_SIZE)
    expect(textWidth('中')).toBeGreaterThan(textWidth('a'))
  })

  it('wraps on word boundaries within the max width', () => {
    const long = 'alpha beta gamma delta epsilon zeta eta theta'
    const lines = wrapText(long, NODE_MAX_TEXT_WIDTH)
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) expect(textWidth(line)).toBeLessThanOrEqual(NODE_MAX_TEXT_WIDTH)
    expect(lines.join(' ')).toBe(long)
  })

  it('respects explicit newlines and blank lines', () => {
    expect(wrapText('one\ntwo')).toEqual(['one', 'two'])
    expect(wrapText('one\n\ntwo')).toEqual(['one', '', 'two'])
  })

  it('measures empty text using the placeholder', () => {
    const measured = measureNodeText('')
    expect(measured.lines).toEqual([PLACEHOLDER_TEXT])
    expect(measured.height).toBe(NODE_LINE_HEIGHT)
    expect(measured.width).toBeGreaterThan(0)
  })

  it('measures Markdown by its visible text, not its syntax', () => {
    expect(measureNodeText('**bold**').width).toBe(measureNodeText('bold').width)
    expect(measureNodeText('[label](https://example.com)').lines).toEqual(['label'])
  })

  it('scales headings and indents block content', () => {
    const heading = measureNodeText('# Heading')
    expect(heading.lines).toEqual(['Heading'])
    expect(heading.height).toBeGreaterThan(NODE_LINE_HEIGHT)

    const list = measureNodeText('- one\n- two')
    expect(list.lines).toEqual(['one', 'two'])
    expect(list.height).toBe(NODE_LINE_HEIGHT * 2)

    const code = measureNodeText('```\ncode\n```')
    expect(code.lines).toEqual(['code'])
    expect(code.height).toBeGreaterThan(0)
  })

  it('measures task lists, tables, and images', () => {
    const tasks = measureNodeText('- [ ] todo\n- [x] done')
    expect(tasks.lines).toEqual(['todo', 'done'])
    expect(tasks.height).toBe(NODE_LINE_HEIGHT * 2)

    const table = measureNodeText('| a | b |\n| --- | --- |\n| 1 | 2 |')
    expect(table.lines).toEqual(['a  b', '1  2'])
    expect(table.height).toBe(40)
    expect(table.width).toBeGreaterThanOrEqual(200)

    const image = measureNodeText('![alt](https://example.com/x.png)')
    expect(image.height).toBe(72)
    expect(image.width).toBeGreaterThanOrEqual(160)
  })

  it('sizes nodes with padding for all lines', () => {    const size = estimateNodeSize({ text: 'one\ntwo\nthree' })
    expect(size.height).toBe(NODE_LINE_HEIGHT * 3 + 22)
    expect(size.width).toBeGreaterThanOrEqual(64)

    const wide = estimateNodeSize({ text: 'x'.repeat(200) })
    expect(wide.width).toBeLessThanOrEqual(NODE_MAX_TEXT_WIDTH + 26)
  })
})
