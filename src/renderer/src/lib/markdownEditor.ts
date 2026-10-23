import StarterKit from '@tiptap/starter-kit'
import type { AnyExtension } from '@tiptap/core'
import { Markdown } from '@tiptap/markdown'
import Placeholder from '@tiptap/extension-placeholder'
import { TableKit } from '@tiptap/extension-table'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Image } from '@tiptap/extension-image'
import { PLACEHOLDER_TEXT } from './measure'

/**
 * WYSIWYG Markdown editor for a single mind-map cell.
 *
 * Text is stored as Markdown. The editor supports the full block set from
 * StarterKit (headings, lists, quotes, code fences, rules), GFM task lists,
 * tables, and images, so existing Markdown is never discarded on edit. Enter
 * inserts a new paragraph; Escape finishes editing.
 */
export function markdownEditorExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      trailingNode: false,
      underline: false,
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true
      }
    }),
    TableKit.configure({ table: { resizable: false } }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Image,
    Markdown.configure({ indentation: { style: 'space', size: 2 } }),
    Placeholder.configure({ placeholder: PLACEHOLDER_TEXT })
  ]
}
