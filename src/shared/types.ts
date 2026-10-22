/** Core document types shared by the main, preload and renderer processes. */

export type NodeId = string

export interface MindNode {
  id: NodeId
  text: string
  parentId: NodeId | null
  children: NodeId[]
}

export interface MindMapDoc {
  version: 1
  rootId: NodeId
  nodes: Record<NodeId, MindNode>
}

export interface NodeSize {
  width: number
  height: number
}

export interface Position {
  x: number
  y: number
}

export interface LayoutNode extends Position, NodeSize {
  id: NodeId
  depth: number
  /** Center of the node's right edge, where outgoing edges attach. */
  sourceX: number
  sourceY: number
  /** Center of the node's left edge, where incoming edges attach. */
  targetX: number
  targetY: number
}

export interface LayoutEdge {
  id: string
  source: NodeId
  target: NodeId
}

export interface Layout {
  nodes: LayoutNode[]
  byId: Record<NodeId, LayoutNode>
  edges: LayoutEdge[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

export type Direction = 'left' | 'right' | 'up' | 'down'
