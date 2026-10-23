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
