import { beforeEach, describe, expect, it } from 'vitest'
import { createDoc } from './lib/doc'
import { useMindStore } from './store'

beforeEach(() => {
  useMindStore.getState().loadDoc(createDoc(), null)
})

describe('mode preservation', () => {
  it('stays in normal mode when a node is created', () => {
    useMindStore.getState().createNode('child')
    const state = useMindStore.getState()
    expect(state.editingId).toBeNull()
    expect(state.focusedId).not.toBe(state.doc.rootId)
  })

  it('stays in insert mode when a node is created', () => {
    const rootId = useMindStore.getState().focusedId
    useMindStore.getState().startEditing()
    useMindStore.getState().updateText(rootId, 'edited root')
    useMindStore.getState().createNode('child')

    const state = useMindStore.getState()
    expect(state.editingId).toBe(state.focusedId)
    expect(state.doc.nodes[state.focusedId]?.text).toBe('')
    expect(state.doc.nodes[rootId]?.text).toBe('edited root')
  })

  it('stays in normal mode when a node is deleted', () => {
    useMindStore.getState().createNode('child')
    const childId = useMindStore.getState().focusedId
    useMindStore.getState().deleteFocused()

    const state = useMindStore.getState()
    expect(state.editingId).toBeNull()
    expect(state.doc.nodes[childId]).toBeUndefined()
  })

  it('stays in insert mode when a node is deleted', () => {
    useMindStore.getState().createNode('child')
    const childId = useMindStore.getState().focusedId
    useMindStore.getState().startEditing(childId)
    useMindStore.getState().deleteFocused()

    const state = useMindStore.getState()
    expect(state.doc.nodes[childId]).toBeUndefined()
    expect(state.editingId).not.toBeNull()
    expect(state.editingId).toBe(state.focusedId)
  })
})

describe('child focus memory', () => {
  it('returns to the child that was focused most recently', () => {
    const rootId = useMindStore.getState().focusedId
    useMindStore.getState().createNode('child')
    const first = useMindStore.getState().focusedId
    useMindStore.getState().focusNode(rootId)
    useMindStore.getState().createNode('child')
    const second = useMindStore.getState().focusedId
    useMindStore.getState().focusNode(rootId)
    useMindStore.getState().createNode('child')
    const third = useMindStore.getState().focusedId

    useMindStore.getState().focusNode(second)
    useMindStore.getState().moveFocus('left')
    expect(useMindStore.getState().focusedId).toBe(rootId)
    useMindStore.getState().moveFocus('right')
    expect(useMindStore.getState().focusedId).toBe(second)

    // A different child becomes the remembered one.
    useMindStore.getState().focusNode(third)
    useMindStore.getState().moveFocus('left')
    useMindStore.getState().moveFocus('right')
    expect(useMindStore.getState().focusedId).toBe(third)
    expect(first).not.toBe(third)
  })

  it('falls back to the first child when the remembered child is gone', () => {
    const rootId = useMindStore.getState().focusedId
    useMindStore.getState().createNode('child')
    const first = useMindStore.getState().focusedId
    useMindStore.getState().focusNode(rootId)
    useMindStore.getState().createNode('child')
    const doomed = useMindStore.getState().focusedId

    useMindStore.getState().focusNode(doomed)
    useMindStore.getState().deleteFocused()
    expect(useMindStore.getState().focusedId).toBe(first)

    // Simulate the remembered id surviving a delete elsewhere.
    useMindStore.setState({ lastChildByParent: { [rootId]: doomed } })
    useMindStore.getState().focusNode(rootId)
    useMindStore.getState().moveFocus('right')
    expect(useMindStore.getState().focusedId).toBe(first)
  })

  it('does not persist focus memory into the document', () => {
    useMindStore.getState().createNode('child')
    const state = useMindStore.getState()
    const saved = JSON.stringify(state.doc)
    expect(saved).not.toContain('lastChild')
  })
})
