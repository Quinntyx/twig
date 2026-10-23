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
})
