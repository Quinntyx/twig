import type { Direction, MindMapDoc, MindNode, NodeId } from '../../../shared/types'

/**
 * Pure tree operations. Every mutation returns a new document; callers own
 * history and focus. The document is a strict tree: one root, no cycles, every
 * node reachable from the root.
 */

export type IdFactory = () => NodeId

let fallbackCounter = 0

/** Ids only need to be unique inside one document. */
export function randomId(): NodeId {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8)
  }
  fallbackCounter += 1
  return `n${Date.now().toString(36)}${fallbackCounter.toString(36)}`
}

function uniqueId(nodes: Record<NodeId, MindNode>, factory: IdFactory): NodeId {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const id = factory()
    if (id && !nodes[id]) return id
  }
  throw new Error('Could not generate a unique node id')
}

export function cloneDoc(doc: MindMapDoc): MindMapDoc {
  const nodes: Record<NodeId, MindNode> = {}
  for (const node of Object.values(doc.nodes)) {
    nodes[node.id] = { ...node, children: [...node.children] }
  }
  return { version: 1, rootId: doc.rootId, nodes }
}

export function createDoc(text = 'Central idea', idFactory: IdFactory = randomId): MindMapDoc {
  const id = idFactory()
  return {
    version: 1,
    rootId: id,
    nodes: {
      [id]: { id, text, parentId: null, children: [] }
    }
  }
}

export function countNodes(doc: MindMapDoc): number {
  return Object.keys(doc.nodes).length
}

export function siblingsOf(doc: MindMapDoc, id: NodeId): NodeId[] {
  const node = doc.nodes[id]
  if (!node || node.parentId === null) return []
  return doc.nodes[node.parentId]?.children ?? []
}

function replaceChild(doc: MindMapDoc, parentId: NodeId, oldChild: NodeId, newChild: NodeId): void {
  const parent = doc.nodes[parentId]
  if (!parent) return
  parent.children = parent.children.map((child) => (child === oldChild ? newChild : child))
}

/** Append a child node to `parentId`. */
export function addChild(
  doc: MindMapDoc,
  parentId: NodeId,
  text = '',
  idFactory: IdFactory = randomId
): { doc: MindMapDoc; id: NodeId } {
  const parent = doc.nodes[parentId]
  if (!parent) return { doc, id: parentId }

  const next = cloneDoc(doc)
  const id = uniqueId(next.nodes, idFactory)
  next.nodes[id] = { id, text, parentId, children: [] }
  next.nodes[parentId]!.children.push(id)
  return { doc: next, id }
}

/** Insert a sibling next to `siblingId`. Roots have no siblings, so this is a no-op there. */
export function addSibling(
  doc: MindMapDoc,
  siblingId: NodeId,
  position: 'before' | 'after',
  text = '',
  idFactory: IdFactory = randomId
): { doc: MindMapDoc; id: NodeId } {
  const sibling = doc.nodes[siblingId]
  if (!sibling || sibling.parentId === null) return { doc, id: siblingId }

  const next = cloneDoc(doc)
  const parent = next.nodes[sibling.parentId]
  if (!parent) return { doc, id: siblingId }

  const id = uniqueId(next.nodes, idFactory)
  next.nodes[id] = { id, text, parentId: sibling.parentId, children: [] }
  const index = parent.children.indexOf(siblingId)
  const insertAt = position === 'before' ? index : index + 1
  parent.children.splice(Math.max(0, insertAt), 0, id)
  return { doc: next, id }
}

/**
 * Insert a new node between `nodeId` and its parent (or above the root).
 * Shift+H in the editor.
 */
export function insertParent(
  doc: MindMapDoc,
  nodeId: NodeId,
  text = '',
  idFactory: IdFactory = randomId
): { doc: MindMapDoc; id: NodeId } {
  const node = doc.nodes[nodeId]
  if (!node) return { doc, id: nodeId }

  const next = cloneDoc(doc)
  const id = uniqueId(next.nodes, idFactory)

  if (node.parentId === null) {
    next.nodes[id] = { id, text, parentId: null, children: [nodeId] }
    next.nodes[nodeId]!.parentId = id
    next.rootId = id
    return { doc: next, id }
  }

  const parentId = node.parentId
  next.nodes[id] = { id, text, parentId, children: [nodeId] }
  replaceChild(next, parentId, nodeId, id)
  next.nodes[nodeId]!.parentId = id
  return { doc: next, id }
}

export function setText(doc: MindMapDoc, id: NodeId, text: string): MindMapDoc {
  const node = doc.nodes[id]
  if (!node || node.text === text) return doc
  const next = cloneDoc(doc)
  next.nodes[id]!.text = text
  return next
}

/**
 * Remove a node and its whole subtree. Focus lands on the previous sibling,
 * else the next sibling, else the parent. Removing the root is a no-op.
 */
export function deleteSubtree(doc: MindMapDoc, id: NodeId): { doc: MindMapDoc; focusId: NodeId } {
  const node = doc.nodes[id]
  if (!node || node.parentId === null) return { doc, focusId: node ? id : doc.rootId }

  const siblings = siblingsOf(doc, id)
  const index = siblings.indexOf(id)
  const focusId = siblings[index - 1] ?? siblings[index + 1] ?? node.parentId

  const next = cloneDoc(doc)
  const stack = [id]
  while (stack.length > 0) {
    const current = stack.pop()!
    const current_node = next.nodes[current]
    if (!current_node) continue
    stack.push(...current_node.children)
    delete next.nodes[current]
  }
  const parent = next.nodes[node.parentId]
  if (parent) parent.children = parent.children.filter((child) => child !== id)
  return { doc: next, focusId }
}

/** Move focus in a tree. Stays put when there is no node in that direction. */
export function focusMove(doc: MindMapDoc, id: NodeId, direction: Direction): NodeId {
  const node = doc.nodes[id]
  if (!node) return doc.rootId
  switch (direction) {
    case 'left':
      return node.parentId ?? id
    case 'right':
      return node.children[0] ?? id
    case 'up': {
      const siblings = siblingsOf(doc, id)
      const index = siblings.indexOf(id)
      return index > 0 ? siblings[index - 1]! : id
    }
    case 'down': {
      const siblings = siblingsOf(doc, id)
      const index = siblings.indexOf(id)
      return index >= 0 && index < siblings.length - 1 ? siblings[index + 1]! : id
    }
  }
}

/** Depth-first ids from the root, in child order. */
export function walkDoc(doc: MindMapDoc): NodeId[] {
  const result: NodeId[] = []
  const stack = [doc.rootId]
  while (stack.length > 0) {
    const id = stack.pop()!
    const node = doc.nodes[id]
    if (!node) continue
    result.push(id)
    for (let index = node.children.length - 1; index >= 0; index -= 1) {
      stack.push(node.children[index]!)
    }
  }
  return result
}

/** True when `maybeAncestor` is strictly above `id`. */
export function isAncestor(doc: MindMapDoc, maybeAncestor: NodeId, id: NodeId): boolean {
  let current = doc.nodes[id]?.parentId ?? null
  while (current !== null) {
    if (current === maybeAncestor) return true
    current = doc.nodes[current]?.parentId ?? null
  }
  return false
}

/** Reparent-free structural equality, used by history and tests. */
export function docsEqual(left: MindMapDoc, right: MindMapDoc): boolean {
  if (left.rootId !== right.rootId) return false
  const leftIds = Object.keys(left.nodes)
  if (leftIds.length !== Object.keys(right.nodes).length) return false
  for (const id of leftIds) {
    const a = left.nodes[id]
    const b = right.nodes[id]
    if (!a || !b) return false
    if (a.text !== b.text || a.parentId !== b.parentId) return false
    if (a.children.length !== b.children.length) return false
    for (let index = 0; index < a.children.length; index += 1) {
      if (a.children[index] !== b.children[index]) return false
    }
  }
  return true
}
