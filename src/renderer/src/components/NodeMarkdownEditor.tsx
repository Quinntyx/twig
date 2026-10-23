import { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { markdownEditorExtensions } from '../lib/markdownEditor'

interface NodeMarkdownEditorProps {
  text: string
  onChange(text: string): void
  onDone(): void
}

/**
 * WYSIWYG Markdown editor mounted only while a node is in INSERT mode.
 *
 * Enter inserts a new paragraph (Shift+Enter inserts a hard break), Escape
 * finishes, and Tab inserts two spaces like the old textarea. Everything else
 * is ProseMirror/Tiptap, so Markdown input rules and Mod+b/i/e/⇧x work while
 * the stored value is serialized back to Markdown on every change.
 */
export function NodeMarkdownEditor({ text, onChange, onDone }: NodeMarkdownEditorProps): React.JSX.Element {
  const onChangeRef = useRef(onChange)
  const onDoneRef = useRef(onDone)
  const editorRef = useRef<Editor | null>(null)
  onChangeRef.current = onChange
  onDoneRef.current = onDone

  const editor = useEditor({
    extensions: markdownEditorExtensions(),
    content: text,
    contentType: 'markdown',
    autofocus: 'end',
    editorProps: {
      attributes: {
        class: 'twig-node__prosemirror',
        spellcheck: 'false'
      },
      handleKeyDown: (_view, event) => {
        if (event.isComposing) return false

        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          onDoneRef.current()
          return true
        }

        if (event.key === 'Tab') {
          event.preventDefault()
          event.stopPropagation()
          editorRef.current?.commands.insertContent('  ')
          return true
        }

        return false
      }
    },
    onUpdate: ({ editor: current }) => {
      // Table/list serializers can add surrounding blank lines. Node text is
      // trimmed at the edges; internal blank lines are preserved.
      onChangeRef.current(current.getMarkdown().replace(/^\n+|\n+$/g, ''))
    },
    onBlur: () => {
      onDoneRef.current()
    }
  })

  editorRef.current = editor

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.commands.focus('end')
    // The browser applies its own focus after the first paint; reassert the
    // caret at the end so the node does not lose it to the canvas.
    const frame = requestAnimationFrame(() => {
      if (!editor.isDestroyed) editor.commands.focus('end')
    })
    return () => cancelAnimationFrame(frame)
  }, [editor])

  return <EditorContent editor={editor} className="twig-node__editor" />
}
