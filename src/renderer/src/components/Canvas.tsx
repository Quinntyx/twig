import { useEffect, useMemo, useRef } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type NodeTypes
} from '@xyflow/react'
import { useMindStore } from '../store'
import { layoutTree } from '../lib/layout'
import { MindNode, type TwigFlowNode } from './MindNode'

const nodeTypes: NodeTypes = { twig: MindNode }

const EDGE_STYLE = { stroke: '#39424f', strokeWidth: 1.5 } as const

function CanvasInner(): React.JSX.Element {
  const doc = useMindStore((state) => state.doc)
  const editingId = useMindStore((state) => state.editingId)
  const focusedId = useMindStore((state) => state.focusedId)
  const focusNode = useMindStore((state) => state.focusNode)
  const startEditing = useMindStore((state) => state.startEditing)
  const stopEditing = useMindStore((state) => state.stopEditing)

  const { setCenter, getZoom, fitView } = useReactFlow()
  const layout = useMemo(() => layoutTree(doc), [doc])
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  // Never feed an in-flight animation's intermediate zoom back into the next
  // setCenter call. During fast keyboard navigation that would compound the
  // animation and drift the global zoom.
  const settledZoomRef = useRef(1)

  const nodes = useMemo<TwigFlowNode[]>(
    () =>
      layout.nodes.map((item) => {
        const node = doc.nodes[item.id]!
        return {
          id: item.id,
          type: 'twig',
          position: { x: item.x, y: item.y },
          data: { text: node.text, root: node.parentId === null },
          width: item.width,
          height: item.height,
          style: { width: item.width, height: item.height },
          draggable: false,
          connectable: false,
          selectable: true
        }
      }),
    [doc, layout]
  )

  const edges = useMemo<Edge[]>(
    () =>
      layout.edges.map((edge) => ({
        ...edge,
        type: 'default',
        style: EDGE_STYLE,
        selectable: false,
        focusable: false
      })),
    [layout]
  )

  // Keep the focused node in view as focus moves (keyboard navigation, undo,
  // creating nodes). Panning only follows focus, never per-keystroke layout.
  useEffect(() => {
    const node = layoutRef.current.byId[focusedId]
    if (!node) return
    void setCenter(node.x + node.width / 2, node.y + node.height / 2, {
      zoom: settledZoomRef.current,
      duration: 180
    })
  }, [focusedId, setCenter])

  // New/open documents start with a fitted view.
  const rootId = doc.rootId
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.25, duration: 220, maxZoom: 1.1 })
    }, 40)
    return () => window.clearTimeout(timer)
  }, [rootId, fitView])

  return (
    <div className="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_event, node) => {
          if (editingId !== null) stopEditing()
          focusNode(node.id)
        }}
        onNodeDoubleClick={(_event, node) => startEditing(node.id)}
        onPaneClick={() => {
          if (editingId !== null) stopEditing()
        }}
        onMoveEnd={() => {
          settledZoomRef.current = getZoom() || settledZoomRef.current
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
        zoomOnDoubleClick={false}
        minZoom={0.2}
        maxZoom={1.8}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1.1 }}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#242b35" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  )
}

export function Canvas(): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  )
}
