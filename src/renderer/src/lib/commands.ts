import { displayName, parseDoc, serializeDoc } from './parse'
import { openFlowFile, saveFlowFile } from './file'
import { useMindStore } from '../store'

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function newFlowCommand(): void {
  const state = useMindStore.getState()
  if (state.dirty && !window.confirm('Discard unsaved changes?')) return
  state.newDoc()
  state.setToast(null)
}

export async function openFlowCommand(): Promise<void> {
  const state = useMindStore.getState()
  if (state.dirty && !window.confirm('Discard unsaved changes?')) return
  try {
    const opened = await openFlowFile()
    if (!opened) return
    const doc = parseDoc(opened.content)
    useMindStore.getState().loadDoc(doc, opened.filePath)
  } catch (error) {
    useMindStore.getState().setToast(message(error))
  }
}

export async function saveFlowCommand(forceDialog = false): Promise<void> {
  const state = useMindStore.getState()
  try {
    const target = await saveFlowFile(serializeDoc(state.doc), state.filePath, forceDialog)
    if (!target) return
    useMindStore.getState().markSaved(target)
    useMindStore.getState().setToast(null)
  } catch (error) {
    useMindStore.getState().setToast(message(error))
  }
}

export { displayName }
