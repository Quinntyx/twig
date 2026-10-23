import type { MindMapDoc, MindNode, NodeId } from '../../../shared/types'
import { walkDoc } from './doc'

/**
 * On-disk format (`*.twig.json`):
 *
 * {
 *   "format": "twig",
 *   "version": 1,
 *   "rootId": "n1",
 *   "nodes": [{ "id": "n1", "text": "Central idea", "children": ["n2"] }]
 * }
 *
 * An empty map is `{ ..., "rootId": null, "nodes": [] }`.
 *
 * Parent links are derived from `children` on load, so files stay compact and
 * readable. The loader is strict: a malformed or non-tree file is rejected with
 * a user-facing message instead of producing a corrupt canvas.
 */

export const FILE_FORMAT = 'twig'
export const FILE_VERSION = 1
export const FILE_EXTENSION = '.twig.json'

export interface SerializedNode {
  id: NodeId
  text: string
  children: NodeId[]
}

export interface SerializedDoc {
  format: typeof FILE_FORMAT
  version: typeof FILE_VERSION
  rootId: NodeId | null
  nodes: SerializedNode[]
}

export class FlowFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FlowFileError'
  }
}

export function serializeDoc(doc: MindMapDoc): string {
  const order = walkDoc(doc)
  const nodes: SerializedNode[] = []
  for (const id of order) {
    const node = doc.nodes[id]
    if (!node) continue
    nodes.push({ id: node.id, text: node.text, children: [...node.children] })
  }
  const serialized: SerializedDoc = {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    rootId: doc.rootId,
    nodes
  }
  return `${JSON.stringify(serialized, null, 2)}\n`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseDoc(raw: string): MindMapDoc {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    throw new FlowFileError('This file is not valid JSON.')
  }
  if (!isRecord(value)) throw new FlowFileError('This file does not contain a mind map.')
  if (value.format !== FILE_FORMAT) {
    throw new FlowFileError('This file is not a Twig mind map.')
  }
  if (value.version !== FILE_VERSION) {
    throw new FlowFileError(`Unsupported mind map version: ${String(value.version)}.`)
  }
  if (typeof value.rootId !== 'string' && value.rootId !== null) {
    throw new FlowFileError('The mind map is missing its root node.')
  }
  if (value.rootId === null) {
    if (!Array.isArray(value.nodes) || value.nodes.length > 0) {
      throw new FlowFileError('The mind map has nodes but no root node.')
    }
    return { version: 1, rootId: null, nodes: {} }
  }
  if (value.rootId.length === 0) {
    throw new FlowFileError('The mind map is missing its root node.')
  }
  if (!Array.isArray(value.nodes) || value.nodes.length === 0) {
    throw new FlowFileError('The mind map has no nodes.')
  }

  const nodes: Record<NodeId, MindNode> = {}
  const parentOf: Record<NodeId, NodeId | null> = {}

  for (const [index, entry] of value.nodes.entries()) {
    if (!isRecord(entry)) throw new FlowFileError(`Node ${index + 1} is malformed.`)
    const { id, text, children } = entry
    if (typeof id !== 'string' || id.length === 0) {
      throw new FlowFileError(`Node ${index + 1} has an invalid id.`)
    }
    if (nodes[id]) throw new FlowFileError(`Duplicate node id "${id}".`)
    if (typeof text !== 'string') throw new FlowFileError(`Node "${id}" has invalid text.`)
    if (!Array.isArray(children) || children.some((child) => typeof child !== 'string')) {
      throw new FlowFileError(`Node "${id}" has an invalid children list.`)
    }
    if (new Set(children).size !== children.length) {
      throw new FlowFileError(`Node "${id}" lists the same child twice.`)
    }
    nodes[id] = { id, text, parentId: null, children: [...children] }
    parentOf[id] = null
  }

  for (const node of Object.values(nodes)) {
    for (const child of node.children) {
      if (child === node.id) throw new FlowFileError(`Node "${node.id}" is its own child.`)
      if (!nodes[child]) throw new FlowFileError(`Node "${node.id}" points at a missing child.`)
      if (parentOf[child] !== null) {
        throw new FlowFileError(`Node "${child}" has more than one parent.`)
      }
      parentOf[child] = node.id
    }
  }

  const roots = Object.keys(nodes).filter((id) => parentOf[id] === null)
  if (roots.length !== 1) {
    throw new FlowFileError('A mind map must have exactly one root node.')
  }
  if (nodes[value.rootId] === undefined) {
    throw new FlowFileError('The root node is not present in the node list.')
  }
  if (roots[0] !== value.rootId) {
    throw new FlowFileError('The declared root node has a parent.')
  }

  for (const node of Object.values(nodes)) node.parentId = parentOf[node.id] ?? null

  // Reachability from the root proves the document is one connected tree and
  // catches cycles that the single-parent check alone cannot see.
  const seen = new Set<NodeId>()
  const stack: NodeId[] = [value.rootId]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (seen.has(id)) throw new FlowFileError('The mind map contains a cycle.')
    seen.add(id)
    const node = nodes[id]
    if (!node) throw new FlowFileError('The mind map references a missing node.')
    stack.push(...node.children)
  }
  if (seen.size !== Object.keys(nodes).length) {
    throw new FlowFileError('The mind map contains unreachable nodes.')
  }

  return { version: 1, rootId: value.rootId, nodes }
}

/** Display name for a path, e.g. "/tmp/ideas.twig.json" -> "ideas". */
export function displayName(filePath: string | null): string {
  if (!filePath) return 'Untitled'
  const base = filePath.split(/[\\/]/).pop() ?? filePath
  return base.replace(/\.twig\.json$/i, '').replace(/\.json$/i, '') || 'Untitled'
}
