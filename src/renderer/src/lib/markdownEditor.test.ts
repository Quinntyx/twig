// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import { markdownEditorExtensions } from './markdownEditor'

let editor: Editor | null = null

function create(markdown: string): Editor {
  editor = new Editor({
    extensions: markdownEditorExtensions(),
    content: markdown,
    contentType: 'markdown'
  })
  return editor
}

afterEach(() => {
  editor?.destroy()
  editor = null
})

describe('markdown node editor', () => {
  it('round-trips inline markdown', () => {
    const markdown = '**bold** and *italic* and ~~gone~~ and `code` and [link](https://example.com)'
    const result = create(markdown).getMarkdown()

    expect(result).toContain('**bold**')
    expect(result).toContain('*italic*')
    expect(result).toContain('~~gone~~')
    expect(result).toContain('`code`')
    expect(result).toContain('[link](https://example.com)')
  })

  it('serializes an empty document to an empty string', () => {
    expect(create('').getMarkdown()).toBe('')
  })

  it('does not append a trailing newline to a single paragraph', () => {
    expect(create('hello').getMarkdown()).toBe('hello')
  })

  it('keeps hard breaks', () => {
    expect(create('line one\\\nline two').getMarkdown()).toContain('line one')
    expect(create('line one\\\nline two').getMarkdown()).toContain('line two')
  })

  it('round-trips headings instead of discarding them', () => {
    expect(create('# Heading').getMarkdown()).toBe('# Heading')
    expect(create('## Sub heading').getMarkdown()).toBe('## Sub heading')
    expect(create('Text\n\n# Heading\n\nMore').getMarkdown()).toBe('Text\n\n# Heading\n\nMore')
  })

  it('round-trips lists, quotes, and code blocks', () => {
    const markdown = '- one\n- two'
    expect(create(markdown).getMarkdown()).toBe(markdown)
    expect(create('> quote').getMarkdown()).toBe('> quote')
    expect(create('```js\ncode()\n```').getMarkdown()).toContain('```js')
    expect(create('```js\ncode()\n```').getMarkdown()).toContain('code()')
  })

  it('round-trips GFM task lists, tables, and images', () => {
    const tasks = '- [ ] todo\n- [x] done'
    expect(create(tasks).getMarkdown()).toBe(tasks)

    const table = create('| a | b |\n| - | - |\n| 1 | 2 |').getMarkdown()
    expect(table).toContain('| a')
    expect(table).toContain('| 1')

    expect(create('![alt](https://example.com/x.png)').getMarkdown()).toBe(
      '![alt](https://example.com/x.png)'
    )
  })
})
