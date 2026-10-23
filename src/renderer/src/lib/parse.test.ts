import { describe, expect, it } from 'vitest'
import { FlowFileError, displayName, parseDoc, serializeDoc } from './parse'
import { addChild, createDoc, type IdFactory } from './doc'

function sequence(...values: string[]): IdFactory {
  let index = 0
  return () => values[index++] ?? `extra-${index}`
}

function sample() {
  let doc = createDoc('Root', sequence('r'))
  doc = addChild(doc, 'r', 'First\nline', sequence('a')).doc
  doc = addChild(doc, 'a', 'Nested', sequence('n')).doc
  doc = addChild(doc, 'r', 'Second', sequence('b')).doc
  return doc
}

function file(nodes: unknown[], overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({ format: 'twig', version: 1, rootId: 'r', nodes, ...overrides })
}

describe('save/load round trip', () => {
  it('preserves the tree through serialize and parse', () => {
    const doc = sample()
    const raw = serializeDoc(doc)
    expect(raw.endsWith('\n')).toBe(true)

    const parsed = parseDoc(raw)
    expect(parsed).toEqual(doc)
    expect(parsed.nodes.a?.children).toEqual(['n'])
    expect(parsed.nodes.n?.parentId).toBe('a')
  })

  it('writes a readable, ordered document', () => {
    const value = JSON.parse(serializeDoc(sample()))
    expect(value.format).toBe('twig')
    expect(value.version).toBe(1)
    expect(value.nodes.map((node: { id: string }) => node.id)).toEqual(['r', 'a', 'n', 'b'])
  })

  it('round-trips an empty map', () => {
    const empty = createDoc()
    const raw = serializeDoc(empty)
    expect(JSON.parse(raw).rootId).toBeNull()
    expect(parseDoc(raw)).toEqual(empty)
    expect(parseDoc(file([], { rootId: null }))).toEqual(empty)
  })
})

describe('validation', () => {
  it('rejects non-JSON and foreign files', () => {
    expect(() => parseDoc('not json')).toThrow(FlowFileError)
    expect(() => parseDoc('[]')).toThrow(/does not contain a mind map/)
    expect(() => parseDoc(file([], { format: 'other' }))).toThrow(/not a Twig mind map/)
    expect(() => parseDoc(file([], { version: 2 }))).toThrow(/Unsupported mind map version/)
  })

  it('rejects malformed nodes', () => {
    expect(() => parseDoc(file([]))).toThrow(/no nodes/)
    expect(() => parseDoc(file([], { rootId: null }))).not.toThrow()
    expect(() => parseDoc(file([{ id: 'r', text: 'x', children: [] }], { rootId: null }))).toThrow(
      /no root node/
    )
    expect(() => parseDoc(file([{ id: 'r', text: 'x' }]))).toThrow(/invalid children list/)
    expect(() => parseDoc(file([{ id: 'r', text: 1, children: [] }]))).toThrow(/invalid text/)
    expect(() => parseDoc(file([{ id: '', text: 'x', children: [] }]))).toThrow(/invalid id/)
    expect(() =>
      parseDoc(
        file([
          { id: 'r', text: 'x', children: ['a'] },
          { id: 'a', text: 'x', children: [] },
          { id: 'a', text: 'y', children: [] }
        ])
      )
    ).toThrow(/Duplicate node id/)
  })

  it('rejects broken trees', () => {
    expect(() => parseDoc(file([{ id: 'r', text: 'x', children: ['ghost'] }]))).toThrow(/missing child/)
    expect(() => parseDoc(file([{ id: 'r', text: 'x', children: ['r'] }]))).toThrow(/own child/)
    expect(() =>
      parseDoc(
        file([
          { id: 'r', text: 'x', children: ['a'] },
          { id: 'a', text: 'x', children: [] },
          { id: 'b', text: 'x', children: [] }
        ])
      )
    ).toThrow(/exactly one root/)
    expect(() => parseDoc(file([{ id: 'r', text: 'x', children: [] }], { rootId: 'other' }))).toThrow(
      /root node is not present/
    )
    expect(() =>
      parseDoc(
        file([
          { id: 'r', text: 'x', children: ['a'] },
          { id: 'a', text: 'x', children: ['b'] },
          { id: 'b', text: 'x', children: ['a'] }
        ])
      )
    ).toThrow(/more than one parent|cycle/)
  })
})

describe('displayName', () => {
  it('strips the twig extension from paths', () => {
    expect(displayName('/tmp/ideas.twig.json')).toBe('ideas')
    expect(displayName('plan.json')).toBe('plan')
    expect(displayName('C:\\maps\\Road Map.twig.json')).toBe('Road Map')
    expect(displayName(null)).toBe('Untitled')
  })
})
