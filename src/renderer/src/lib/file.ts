import type { TwigBridge } from '../../../shared/ipc'

/**
 * File layer. In Electron this goes through the preload bridge and native
 * dialogs; in a browser (Vite preview / tests) it falls back to an <input>
 * picker and a download, so the renderer stays runnable without Electron.
 */

export interface OpenedFile {
  content: string
  filePath: string | null
}

function bridge(): TwigBridge | undefined {
  return typeof window !== 'undefined' ? window.twig : undefined
}

export async function openFlowFile(): Promise<OpenedFile | null> {
  const electron = bridge()
  if (electron) {
    const result = await electron.openFlow()
    if (result.canceled) return null
    if (result.error) throw new Error(result.error)
    if (result.content === undefined) return null
    return { content: result.content, filePath: result.filePath ?? null }
  }

  return new Promise<OpenedFile | null>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.twig.json,application/json'
    input.style.display = 'none'
    let settled = false
    const finish = (value: OpenedFile | null): void => {
      if (settled) return
      settled = true
      input.remove()
      resolve(value)
    }
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) return finish(null)
      file
        .text()
        .then((content) => finish({ content, filePath: file.name }))
        .catch(() => finish(null))
    })
    input.addEventListener('cancel', () => finish(null))
    document.body.appendChild(input)
    input.click()
  })
}

/**
 * Persist the document. Returns the resulting path/name, or null if the user
 * canceled the dialog.
 */
export async function saveFlowFile(
  content: string,
  filePath: string | null,
  forceDialog: boolean
): Promise<string | null> {
  const electron = bridge()
  if (electron) {
    const result = await electron.saveFlow(content, filePath, forceDialog)
    if (result.canceled) return null
    if (result.error) throw new Error(result.error)
    return result.filePath ?? filePath
  }

  const name = (filePath ?? 'Untitled.twig.json').split(/[\\/]/).pop() ?? 'Untitled.twig.json'
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name.endsWith('.json') ? name : `${name}.twig.json`
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return anchor.download
}
