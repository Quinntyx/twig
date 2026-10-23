import StarterKit from '@tiptap/starter-kit'
import type { AnyExtension } from '@tiptap/core'
import { Markdown } from '@tiptap/markdown'
import Placeholder from '@tiptap/extension-placeholder'
import { PLACEHOLDER_TEXT } from './measure'

/**
 * A deliberately small Markdown editor for a single mind-map cell.
 *
 * Text is stored as Markdown, but the cell only supports inline formatting:
 * bold, italic, strike, code, links, and hard line breaks. Block structures
 * (headings, lists, quotes, code fences) are disabled so Enter can always mean
 * "finish editing" and so the node stays a compact label.
 */
export function markdownEditorExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      blockquote: false,
      bulletList: false,
      codeBlock: false,
      heading: false,
      horizontalRule: false,
      listItem: false,
      listKeymap: false,
      orderedList: false,
      trailingNode: false,
      underline: false,
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true
      }
    }),
    Markdown.configure({ indentation: { style: 'space', size: 2 } }),
    Placeholder.configure({ placeholder: PLACEHOLDER_TEXT })
  ]
}
