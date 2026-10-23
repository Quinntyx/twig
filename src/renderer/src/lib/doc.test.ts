import { describe, expect, it } from 'vitest'
import {
  addChild,
  addSibling,
  cloneDoc,
  countNodes,
  createDoc,
  deleteSubtree,
  docsEqual,
  focusMove,
  insertParent,
  isAncestor,
  setText,
  siblingsOf,
  walkDoc,
  type IdFactory
} from './doc'
import type { MindMapDoc } from '../../../shared/types'

function sequence(...values: string[]): IdFactory {
  let index = 0
  return () => {
    const value = values[index]
    index += 1
    return value ?? `extra-${index}`
  }
}

function tree(): MindMapDoc {
  let doc = createDoc('Root', sequence('r'))
  doc = addChild(doc, 'r', 'A', sequence('a')).doc
  doc = addChild(doc, 'r', 'B', sequence('b')).doc
  doc = addChild(doc, 'r', 'C', sequence('c')).doc
  doc = addChild(doc, 'b', 'B1', sequence('b1')).doc
  doc = addChild(doc, 'b', 'B2', sequence('b2')).doc
  return doc
}

describe('createDoc', () => {
  it('creates a single root with the given text', () => {
    const doc = createDoc('Ideas', sequence('root'))
    expect(doc.rootId).toBe('root')
    expect(doc.nodes.root).toEqual({ id: 'root', text: 'Ideas', parentId: null, children: [] })
    expect(countNodes(doc)).toBe(1)
  })
})

describe('addChild / addSibling', () => {
  it('appends a child and links parentage', () => {
    const doc = createDoc('Root', sequence('r'))
    const result = addChild(doc, 'r', 'Child', sequence('c'))
    expect(result.id).toBe('c')
    expect(result.doc.nodes.c?.parentId).toBe('r')
    expect(result.doc.nodes.r?.children).toEqual(['c'])
    expect(doc.nodes.r?.children).toEqual([])
  })

  it('is a no-op for a missing parent', () => {
    const doc = createDoc('Root', sequence('r'))
    const result = addChild(doc, 'nope', 'x', sequence('c'))
    expect(result.doc).toBe(doc)
    expect(result.id).toBe('nope')
  })

  it('inserts siblings before and after while keeping order', () => {
    const doc = tree()
    const before = addSibling(doc, 'b', 'before', 'Before', sequence('x'))
    expect(before.doc.nodes.r?.children).toEqual(['a', 'x', 'b', 'c'])

    const after = addSibling(doc, 'b', 'after', 'After', sequence('y'))
    expect(after.doc.nodes.r?.children).toEqual(['a', 'b', 'y', 'c'])
  })

  it('refuses to give the root a sibling', () => {
    const doc = tree()
    const result = addSibling(doc, 'r', 'after', 'Nope', sequence('x'))
    expect(result.doc).toBe(doc)
    expect(result.id).toBe('r')
  })
})

describe('insertParent', () => {
  it('wraps a child node', () => {
    const doc = tree()
    const result = insertParent(doc, 'b', 'Wrapper', sequence('w'))
    expect(result.id).toBe('w')
    expect(result.doc.nodes.r?.children).toEqual(['a', 'w', 'c'])
    expect(result.doc.nodes.w?.children).toEqual(['b'])
    expect(result.doc.nodes.b?.parentId).toBe('w')
  })

  it('replaces the root when wrapping the root', () => {
    const doc = tree()
    const result = insertParent(doc, 'r', 'Above', sequence('top'))
    expect(result.doc.rootId).toBe('top')
    expect(result.doc.nodes.top?.parentId).toBeNull()
    expect(result.doc.nodes.top?.children).toEqual(['r'])
    expect(result.doc.nodes.r?.parentId).toBe('top')
  })
})

describe('deleteSubtree', () => {
  it('removes a whole subtree and focuses the previous sibling', () => {
    const doc = tree()
    const result = deleteSubtree(doc, 'b')
    expect(result.focusId).toBe('a')
    expect(result.doc.nodes.b).toBeUndefined()
    expect(result.doc.nodes.b1).toBeUndefined()
    expect(result.doc.nodes.b2).toBeUndefined()
    expect(result.doc.nodes.r?.children).toEqual(['a', 'c'])
    expect(countNodes(result.doc)).toBe(3)
  })

  it('falls back to the next sibling, then the parent', () => {
    const doc = tree()
    expect(deleteSubtree(doc, 'a').focusId).toBe('b')

    let only = createDoc('Root', sequence('r'))
    only = addChild(only, 'r', 'Child', sequence('c')).doc
    expect(deleteSubtree(only, 'c').focusId).toBe('r')
  })

  it('never deletes the root', () => {
    const doc = tree()
    const result = deleteSubtree(doc, 'r')
    expect(result.doc).toBe(doc)
    expect(result.focusId).toBe('r')
  })
})

describe('focusMove', () => {
  it('moves between parent, first child, and siblings', () => {
    const doc = tree()
    expect(focusMove(doc, 'b1', 'left')).toBe('b')
    expect(focusMove(doc, 'r', 'right')).toBe('a')
    expect(focusMove(doc, 'a', 'down')).toBe('b')
    expect(focusMove(doc, 'b', 'up')).toBe('a')
    expect(focusMove(doc, 'c', 'down')).toBe('c')
    expect(focusMove(doc, 'r', 'up')).toBe('r')
    expect(focusMove(doc, 'r', 'left')).toBe('r')
  })

  it('returns to the remembered child when moving right', () => {
    const doc = tree()
    expect(focusMove(doc, 'r', 'right', { r: 'c' })).toBe('c')
    expect(focusMove(doc, 'r', 'right', { r: 'b1' })).toBe('a')
  })
})

describe('setText and structural helpers', () => {
  it('updates text immutably and ignores no-op writes', () => {
    const doc = tree()
    const next = setText(doc, 'a', 'Alpha')
    expect(next).not.toBe(doc)
    expect(next.nodes.a?.text).toBe('Alpha')
    expect(doc.nodes.a?.text).toBe('A')
    expect(setText(doc, 'a', 'A')).toBe(doc)
  })

  it('reports siblings, ancestry and walk order', () => {
    const doc = tree()
    expect(siblingsOf(doc, 'b')).toEqual(['a', 'b', 'c'])
    expect(siblingsOf(doc, 'r')).toEqual([])
    expect(isAncestor(doc, 'r', 'b1')).toBe(true)
    expect(isAncestor(doc, 'b', 'b1')).toBe(true)
    expect(isAncestor(doc, 'a', 'b1')).toBe(false)
    expect(walkDoc(doc)).toEqual(['r', 'a', 'b', 'b1', 'b2', 'c'])
  })

  it('detects structural equality', () => {
    const doc = tree()
    expect(docsEqual(doc, cloneDoc(doc))).toBe(true)
    expect(docsEqual(doc, setText(doc, 'a', 'changed'))).toBe(false)
    expect(docsEqual(doc, deleteSubtree(doc, 'c').doc)).toBe(false)
  })
})
