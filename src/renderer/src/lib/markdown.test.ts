import { describe, expect, it } from 'vitest'
import { hasVisibleMarkdown, markdownToPlainText } from './markdown'

describe('markdownToPlainText', () => {
  it('leaves plain text alone', () => {
    expect(markdownToPlainText('plain words')).toBe('plain words')
  })

  it('removes inline formatting but keeps the visible text', () => {
    expect(markdownToPlainText('**bold**')).toBe('bold')
    expect(markdownToPlainText('*italic*')).toBe('italic')
    expect(markdownToPlainText('~~gone~~')).toBe('gone')
    expect(markdownToPlainText('`code * literal`')).toBe('code * literal')
    expect(markdownToPlainText('[label](https://example.com)')).toBe('label')
    expect(markdownToPlainText('![alt text](image.png)')).toBe('alt text')
  })

  it('preserves snake_case and escapes', () => {
    expect(markdownToPlainText('snake_case_name')).toBe('snake_case_name')
    expect(markdownToPlainText('\\*not italic\\*')).toBe('*not italic*')
  })

  it('drops block prefixes and hard-break syntax', () => {
    expect(markdownToPlainText('# Heading')).toBe('Heading')
    expect(markdownToPlainText('> quote')).toBe('quote')
    expect(markdownToPlainText('- item')).toBe('item')
    expect(markdownToPlainText('1. item')).toBe('item')
    expect(markdownToPlainText('one  \ntwo')).toBe('one\ntwo')
    expect(markdownToPlainText('one\\\ntwo')).toBe('one\ntwo')
    expect(markdownToPlainText('one<br>two')).toBe('one\ntwo')
  })

  it('reports markup-only content as empty', () => {
    expect(markdownToPlainText('**')).toBe('**')
    expect(hasVisibleMarkdown('')).toBe(false)
    expect(hasVisibleMarkdown('**')).toBe(true)
    expect(hasVisibleMarkdown('**visible**')).toBe(true)
  })
})
