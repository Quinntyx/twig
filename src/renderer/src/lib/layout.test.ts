import { describe, expect, it } from 'vitest'
import { DEFAULT_H_GAP, DEFAULT_V_GAP, layoutTree } from './layout'
import { addChild, createDoc, type IdFactory } from './doc'
import type { MindMapDoc } from '../../../shared/types'

function sequence(...values: string[]): IdFactory {
  let index = 0
  return () => values[index++] ?? `extra-${index}`
}

function tree(): MindMapDoc {
  let doc = createDoc('Root', sequence('r'))
  doc = addChild(doc, 'r', 'Alpha', sequence('a')).doc
  doc = addChild(doc, 'r', 'Beta', sequence('b')).doc
  doc = addChild(doc, 'r', 'Gamma', sequence('c')).doc
  doc = addChild(doc, 'a', 'Alpha one', sequence('a1')).doc
  doc = addChild(doc, 'a', 'Alpha two', sequence('a2')).doc
  doc = addChild(doc, 'b', 'Beta one', sequence('b1')).doc
  return doc
}

function overlaps(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

describe('layoutTree', () => {
  it('places every visible node and edge', () => {
    const layout = layoutTree(tree())
    expect(layout.nodes).toHaveLength(7)
    expect(layout.edges).toHaveLength(6)
    expect(Object.keys(layout.byId).sort()).toEqual(['a', 'a1', 'a2', 'b', 'b1', 'c', 'r'].sort())
  })

  it('never overlaps two node rectangles', () => {
    const layout = layoutTree(tree())
    for (let i = 0; i < layout.nodes.length; i += 1) {
      for (let j = i + 1; j < layout.nodes.length; j += 1) {
        expect(overlaps(layout.nodes[i]!, layout.nodes[j]!), `${layout.nodes[i]!.id}/${layout.nodes[j]!.id}`).toBe(
          false
        )
      }
    }
  })

  it('uses one column per depth and keeps siblings in document order', () => {
    const layout = layoutTree(tree())
    expect(layout.byId.r?.x).toBe(0)
    expect(layout.byId.a?.x).toBeGreaterThan(layout.byId.r!.x)
    expect(layout.byId.a1?.x).toBeGreaterThan(layout.byId.a!.x)
    expect(layout.byId.a?.x).toBe(layout.byId.b?.x)
    expect(layout.byId.b?.x).toBe(layout.byId.c?.x)
    expect(layout.byId.a1!.y).toBeLessThan(layout.byId.a2!.y)
    expect(layout.byId.a!.y).toBeLessThan(layout.byId.b!.y)
    expect(layout.byId.b!.y).toBeLessThan(layout.byId.c!.y)
  })

  it('centers a parent on the extent of its children', () => {
    const layout = layoutTree(tree())
    const alpha = layout.byId.a!
    const first = layout.byId.a1!
    const second = layout.byId.a2!
    const center = alpha.y + alpha.height / 2
    expect(center).toBeGreaterThan(first.y)
    expect(center).toBeLessThan(second.y + second.height)
    expect(center).toBeCloseTo((first.y + second.y + second.height) / 2, 5)
  })

  it('honors custom gaps and measured sizes', () => {
    const doc = tree()
    const compact = layoutTree(doc, { hGap: 10, vGap: 0 })
    const roomy = layoutTree(doc)
    expect(compact.byId.a!.x - (compact.byId.r!.x + compact.byId.r!.width)).toBe(10)
    expect(roomy.byId.a!.x - (roomy.byId.r!.x + roomy.byId.r!.width)).toBe(DEFAULT_H_GAP)

    const withSizes = layoutTree(doc, { sizes: { a1: { width: 400, height: 20 }, a2: { width: 400, height: 20 } } })
    expect(withSizes.byId.a1?.width).toBe(400)
    expect(withSizes.byId.a2?.x).toBe(withSizes.byId.a1?.x)
    expect(withSizes.byId.a2!.y - (withSizes.byId.a1!.y + withSizes.byId.a1!.height)).toBe(DEFAULT_V_GAP)
  })

  it('returns usable bounds for an empty document', () => {
    const doc: MindMapDoc = { version: 1, rootId: 'missing', nodes: {} }
    const layout = layoutTree(doc)
    expect(layout.nodes).toEqual([])
    expect(layout.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
  })
})
