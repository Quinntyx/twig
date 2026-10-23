import { create } from 'zustand'
import type { Direction, MindMapDoc, NodeId } from '../../shared/types'
import {
  DEFAULT_INSERT_KEYBINDS,
  DEFAULT_KEYBINDS,
  type InsertKeybinds,
  type Keybinds
} from '../../shared/config'
import {
  addChild,
  addSibling,
  createDoc,
  deleteSubtree,
  docsEqual,
  focusMove,
  insertParent,
  setText
} from './lib/doc'

export type CreateKind = 'parent' | 'child' | 'sibling-before' | 'sibling-after'

const HISTORY_LIMIT = 100

/**
 * Remember which child focus came from for each parent. This is deliberately
 * session-only state: it makes Left/Right navigation feel reversible without
 * polluting saved `.twig.json` files.
 */
function rememberChild(
  lastChildByParent: Record<NodeId, NodeId>,
  doc: MindMapDoc,
  id: NodeId
): Record<NodeId, NodeId> {
  const parentId = doc.nodes[id]?.parentId
  if (!parentId) return lastChildByParent
  if (lastChildByParent[parentId] === id) return lastChildByParent
  return { ...lastChildByParent, [parentId]: id }
}

export interface MindMapState {
  doc: MindMapDoc
  focusedId: NodeId
  editingId: NodeId | null
  filePath: string | null
  dirty: boolean
  helpOpen: boolean
  toast: string | null
  keybinds: Keybinds
  insertKeybinds: InsertKeybinds
  past: MindMapDoc[]
  future: MindMapDoc[]
  /** Parent -> most recently focused child, for reversible Left/Right nav. */
  lastChildByParent: Record<NodeId, NodeId>
  /** Document as it was when the current insert session started. */
  editBaseline: MindMapDoc | null

  commitDoc(next: MindMapDoc, focusId?: NodeId, edit?: boolean): void
  focusNode(id: NodeId): void
  moveFocus(direction: Direction): void
  createNode(kind: CreateKind): void
  deleteFocused(): void
  startEditing(id?: NodeId): void
  stopEditing(): void
  updateText(id: NodeId, text: string): void
  undo(): void
  redo(): void
  newDoc(): void
  loadDoc(doc: MindMapDoc, filePath: string | null): void
  markSaved(filePath: string): void
  setHelpOpen(open: boolean): void
  setToast(toast: string | null): void
  setKeybinds(keybinds: Keybinds): void
  setInsertKeybinds(insertKeybinds: InsertKeybinds): void
}

const initialDoc = createDoc()

export const useMindStore = create<MindMapState>((set, get) => ({
  doc: initialDoc,
  focusedId: initialDoc.rootId,
  editingId: null,
  filePath: null,
  dirty: false,
  helpOpen: false,
  toast: null,
  keybinds: DEFAULT_KEYBINDS,
  insertKeybinds: DEFAULT_INSERT_KEYBINDS,
  past: [],
  future: [],
  lastChildByParent: {},
  editBaseline: null,

  commitDoc(next, focusId, edit = false) {
    set((state) => {
      const focus = focusId && next.nodes[focusId] ? focusId : state.focusedId
      const focusExists = next.nodes[focus] !== undefined
      return {
        doc: next,
        past: [state.doc, ...state.past].slice(0, HISTORY_LIMIT),
        future: [],
        focusedId: focusExists ? focus : next.rootId,
        editingId: edit ? (focusExists ? focus : next.rootId) : null,
        editBaseline: edit ? next : null,
        lastChildByParent: rememberChild(state.lastChildByParent, next, focusExists ? focus : next.rootId),
        dirty: true
      }
    })
  },

  focusNode(id) {
    if (!get().doc.nodes[id]) return
    if (get().editingId !== null) get().stopEditing()
    set((state) => ({
      focusedId: id,
      editingId: null,
      lastChildByParent: rememberChild(state.lastChildByParent, state.doc, id)
    }))
  },

  moveFocus(direction) {
    if (get().editingId !== null) get().stopEditing()
    const { doc, focusedId, lastChildByParent } = get()
    const next = focusMove(doc, focusedId, direction, lastChildByParent)
    if (next !== focusedId) {
      set((state) => ({
        focusedId: next,
        lastChildByParent: rememberChild(state.lastChildByParent, doc, next)
      }))
    }
  },

  createNode(kind) {
    const { doc, focusedId, editingId } = get()
    const keepEditing = editingId !== null

    if (kind === 'parent') {
      const result = insertParent(doc, focusedId)
      if (result.id !== focusedId) get().commitDoc(result.doc, result.id, keepEditing)
      return
    }

    if (kind === 'child') {
      const result = addChild(doc, focusedId)
      if (result.id !== focusedId) get().commitDoc(result.doc, result.id, keepEditing)
      return
    }

    const result = addSibling(doc, focusedId, kind === 'sibling-before' ? 'before' : 'after')
    if (result.id !== focusedId) get().commitDoc(result.doc, result.id, keepEditing)
  },

  deleteFocused() {
    const { doc, focusedId, editingId } = get()
    const keepEditing = editingId !== null
    if (doc.rootId === focusedId) {
      set({ toast: 'The root node cannot be deleted.' })
      return
    }
    const result = deleteSubtree(doc, focusedId)
    get().commitDoc(result.doc, result.focusId, keepEditing)
  },

  startEditing(id) {
    const target = id ?? get().focusedId
    const { doc, lastChildByParent } = get()
    if (!doc.nodes[target]) return
    set({
      focusedId: target,
      editingId: target,
      editBaseline: doc,
      lastChildByParent: rememberChild(lastChildByParent, doc, target)
    })
  },

  stopEditing() {
    const { editingId, editBaseline, doc } = get()
    if (editingId === null) return
    if (editBaseline && !docsEqual(editBaseline, doc)) {
      set((state) => ({
        past: [editBaseline, ...state.past].slice(0, HISTORY_LIMIT),
        future: [],
        editingId: null,
        editBaseline: null
      }))
    } else {
      set({ editingId: null, editBaseline: null })
    }
  },

  updateText(id, text) {
    const { doc } = get()
    if (!doc.nodes[id]) return
    const next = setText(doc, id, text)
    if (next === doc) return
    set({ doc: next, dirty: true })
  },

  undo() {
    if (get().editingId !== null) get().stopEditing()
    const { past, future, doc, focusedId } = get()
    const previous = past[0]
    if (!previous) return
    const focus = previous.nodes[focusedId] ? focusedId : previous.rootId
    set((state) => ({
      doc: previous,
      past: past.slice(1),
      future: [doc, ...future].slice(0, HISTORY_LIMIT),
      focusedId: focus,
      editingId: null,
      editBaseline: null,
      lastChildByParent: rememberChild(state.lastChildByParent, previous, focus),
      dirty: true
    }))
  },

  redo() {
    if (get().editingId !== null) get().stopEditing()
    const { past, future, doc, focusedId } = get()
    const next = future[0]
    if (!next) return
    const focus = next.nodes[focusedId] ? focusedId : next.rootId
    set((state) => ({
      doc: next,
      past: [doc, ...past].slice(0, HISTORY_LIMIT),
      future: future.slice(1),
      focusedId: focus,
      editingId: null,
      editBaseline: null,
      lastChildByParent: rememberChild(state.lastChildByParent, next, focus),
      dirty: true
    }))
  },

  newDoc() {
    const doc = createDoc()
    set({
      doc,
      focusedId: doc.rootId,
      editingId: null,
      editBaseline: null,
      filePath: null,
      dirty: false,
      past: [],
      future: [],
      lastChildByParent: {},
      toast: null
    })
  },

  loadDoc(doc, filePath) {
    set({
      doc,
      focusedId: doc.rootId,
      editingId: null,
      editBaseline: null,
      filePath,
      dirty: false,
      past: [],
      future: [],
      lastChildByParent: {},
      toast: null
    })
  },

  markSaved(filePath) {
    set({ filePath, dirty: false })
  },

  setHelpOpen(open) {
    set({ helpOpen: open })
  },

  setToast(toast) {
    set({ toast })
  },

  setKeybinds(keybinds) {
    set({ keybinds })
  },

  setInsertKeybinds(insertKeybinds) {
    set({ insertKeybinds })
  }
}))
