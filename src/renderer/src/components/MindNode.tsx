import { useEffect, useMemo, useRef } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { NodeId } from '../../../shared/types'
import { useMindStore } from '../store'
import { PLACEHOLDER_TEXT, measureNodeText } from '../lib/measure'

export type TwigNodeData = { text: string; root: boolean }
export type TwigFlowNode = Node<TwigNodeData, 'twig'>

/**
 * A single mind-map node. In NORMAL mode it renders text; in INSERT mode the
 * same box becomes a transparent textarea so the caret sits exactly where the
 * text does.
 */
export function MindNode({ id, data }: NodeProps<TwigFlowNode>): React.JSX.Element {
  const editingId = useMindStore((state) => state.editingId)
  const focusedId = useMindStore((state) => state.focusedId)
  const updateText = useMindStore((state) => state.updateText)
  const stopEditing = useMindStore((state) => state.stopEditing)

  const editing = editingId === id
  const focused = focusedId === id
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lines = useMemo(() => measureNodeText(data.text).lines, [data.text])

  useEffect(() => {
    if (!editing) return
    const el = textareaRef.current
    if (!el) return
    el.focus({ preventScroll: true })
    const end = el.value.length
    el.setSelectionRange(end, end)
  }, [editing])

  const className = [
    'twig-node',
    data.root ? 'twig-node--root' : '',
    focused ? 'twig-node--focused' : '',
    editing ? 'twig-node--editing' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <Handle className="twig-handle" type="target" position={Position.Left} isConnectable={false} />
      <Handle className="twig-handle" type="source" position={Position.Right} isConnectable={false} />

      {editing ? (
        <textarea
          ref={textareaRef}
          className="twig-node__input"
          value={data.text}
          spellCheck={false}
          placeholder={PLACEHOLDER_TEXT}
          onChange={(event) => updateText(id as NodeId, event.target.value)}
          onBlur={() => stopEditing()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              stopEditing()
              return
            }
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              event.stopPropagation()
              stopEditing()
              return
            }
            if (event.key === 'Tab') {
              event.preventDefault()
              const el = event.currentTarget
              const start = el.selectionStart
              const end = el.selectionEnd
              updateText(id as NodeId, `${data.text.slice(0, start)}  ${data.text.slice(end)}`)
              requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2))
            }
          }}
        />
      ) : (
        <div className={`twig-node__text${data.text.length === 0 ? ' twig-node__text--empty' : ''}`}>
          {data.text.length === 0 ? PLACEHOLDER_TEXT : lines.join('\n')}
        </div>
      )}
    </div>
  )
}
