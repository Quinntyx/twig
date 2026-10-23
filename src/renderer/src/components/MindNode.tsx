import { useCallback } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import type { NodeId } from '../../../shared/types'
import { useMindStore } from '../store'
import { PLACEHOLDER_TEXT } from '../lib/measure'
import { hasVisibleMarkdown } from '../lib/markdown'
import { NodeMarkdownEditor } from './NodeMarkdownEditor'

export type TwigNodeData = { text: string; root: boolean }
export type TwigFlowNode = Node<TwigNodeData, 'twig'>

const MARKDOWN_ELEMENTS = ['p', 'strong', 'em', 'del', 'code', 'a', 'br']

/**
 * A single mind-map node. In NORMAL mode it renders Markdown; in INSERT mode
 * the same box becomes a WYSIWYG Markdown editor so the caret sits exactly
 * where the text does.
 */
export function MindNode({ id, data }: NodeProps<TwigFlowNode>): React.JSX.Element {
  const editingId = useMindStore((state) => state.editingId)
  const focusedId = useMindStore((state) => state.focusedId)
  const updateText = useMindStore((state) => state.updateText)
  const stopEditing = useMindStore((state) => state.stopEditing)

  const editing = editingId === id
  const focused = focusedId === id
  const hasText = hasVisibleMarkdown(data.text)

  const finishEditing = useCallback(() => {
    // The editor can blur after focus has already moved to a newly created
    // node; never stop that newer edit session.
    if (useMindStore.getState().editingId === (id as NodeId)) stopEditing()
  }, [id, stopEditing])

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
        <NodeMarkdownEditor
          text={data.text}
          onChange={(text) => updateText(id as NodeId, text)}
          onDone={finishEditing}
        />
      ) : (
        <div className={`twig-node__text${hasText ? '' : ' twig-node__text--empty'}`}>
          {hasText ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              allowedElements={MARKDOWN_ELEMENTS}
              unwrapDisallowed
              skipHtml
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noreferrer">
                    {children}
                  </a>
                )
              }}
            >
              {data.text}
            </ReactMarkdown>
          ) : (
            PLACEHOLDER_TEXT
          )}
        </div>
      )}
    </div>
  )
}
