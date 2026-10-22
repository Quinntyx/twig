import type { Layout, LayoutEdge, LayoutNode, MindMapDoc, NodeId, NodeSize } from '../../../shared/types'
import { walkDoc } from './doc'
import { estimateNodeSize } from './measure'

/**
 * Automatic left-to-right tree layout.
 *
 * x is a column per depth, sized by the widest node in that column. y uses
 * subtree extents: leaves are stacked in document order and a parent is
 * centered inside its subtree's vertical extent. That keeps sibling subtrees
 * from overlapping even when a parent is much taller than its children.
 */

export interface LayoutOptions {
  hGap?: number
  vGap?: number
  sizes?: Record<NodeId, NodeSize>
}

export const DEFAULT_H_GAP = 64
export const DEFAULT_V_GAP = 18

export function layoutTree(doc: MindMapDoc, options: LayoutOptions = {}): Layout {
  const hGap = options.hGap ?? DEFAULT_H_GAP
  const vGap = options.vGap ?? DEFAULT_V_GAP
  const sizes = options.sizes ?? {}

  const sizeOf = (id: NodeId): NodeSize => {
    const node = doc.nodes[id]
    const provided = sizes[id]
    if (provided) return provided
    return node ? estimateNodeSize(node) : { width: 120, height: 40 }
  }

  const order = walkDoc(doc)
  const depthOf: Record<NodeId, number> = {}
  const maxWidthAtDepth: number[] = []

  for (const id of order) {
    const node = doc.nodes[id]
    if (!node) continue
    const depth = node.parentId === null ? 0 : (depthOf[node.parentId] ?? 0) + 1
    depthOf[id] = depth
    maxWidthAtDepth[depth] = Math.max(maxWidthAtDepth[depth] ?? 0, sizeOf(id).width)
  }

  const columnX: number[] = [0]
  for (let depth = 1; depth < maxWidthAtDepth.length; depth += 1) {
    columnX[depth] = (columnX[depth - 1] ?? 0) + (maxWidthAtDepth[depth - 1] ?? 0) + hGap
  }

  // Subtree vertical extents, computed children-first.
  const extent: Record<NodeId, number> = {}
  for (let index = order.length - 1; index >= 0; index -= 1) {
    const id = order[index]!
    const node = doc.nodes[id]
    if (!node) continue
    const height = sizeOf(id).height
    if (node.children.length === 0) {
      extent[id] = height
      continue
    }
    let childrenExtent = 0
    let visibleChildren = 0
    for (const child of node.children) {
      if (!doc.nodes[child]) continue
      visibleChildren += 1
      childrenExtent += extent[child] ?? 0
    }
    extent[id] = Math.max(height, childrenExtent + vGap * Math.max(0, visibleChildren - 1))
  }

  const byId: Record<NodeId, LayoutNode> = {}
  const nodes: LayoutNode[] = []

  const place = (id: NodeId, depth: number, top: number): void => {
    const node = doc.nodes[id]
    if (!node) return
    const size = sizeOf(id)
    const subtreeExtent = extent[id] ?? size.height
    const x = columnX[depth] ?? 0
    const y = top + subtreeExtent / 2 - size.height / 2
    const layoutNode: LayoutNode = {
      id,
      depth,
      x,
      y,
      width: size.width,
      height: size.height,
      sourceX: x + size.width,
      sourceY: y + size.height / 2,
      targetX: x,
      targetY: y + size.height / 2
    }
    byId[id] = layoutNode
    nodes.push(layoutNode)

    const children = node.children.filter((child) => doc.nodes[child] !== undefined)
    if (children.length === 0) return

    let childrenExtent = 0
    for (const child of children) childrenExtent += extent[child] ?? 0
    childrenExtent += vGap * (children.length - 1)

    let childTop = top + (subtreeExtent - childrenExtent) / 2
    for (const child of children) {
      place(child, depth + 1, childTop)
      childTop += (extent[child] ?? 0) + vGap
    }
  }

  if (doc.nodes[doc.rootId]) place(doc.rootId, 0, 0)

  const edges: LayoutEdge[] = []
  for (const node of Object.values(doc.nodes)) {
    for (const child of node.children) {
      if (doc.nodes[child]) edges.push({ id: `${node.id}->${child}`, source: node.id, target: child })
    }
  }

  const bounds = nodes.reduce(
    (acc, node) => ({
      minX: Math.min(acc.minX, node.x),
      minY: Math.min(acc.minY, node.y),
      maxX: Math.max(acc.maxX, node.x + node.width),
      maxY: Math.max(acc.maxY, node.y + node.height)
    }),
    { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  )

  return { nodes, byId, edges, bounds }
}
