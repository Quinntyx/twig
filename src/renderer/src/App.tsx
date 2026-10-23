import { useEffect } from 'react'
import { Canvas } from './components/Canvas'
import { HelpOverlay } from './components/HelpOverlay'
import { StatusBar } from './components/StatusBar'
import { Toolbar } from './components/Toolbar'
import { useKeyboard } from './lib/keyboard'
import { displayName } from './lib/parse'
import { newFlowCommand, openFlowCommand, saveFlowCommand } from './lib/commands'
import { useMindStore } from './store'

export default function App(): React.JSX.Element {
  useKeyboard()

  const dirty = useMindStore((state) => state.dirty)
  const filePath = useMindStore((state) => state.filePath)
  const helpOpen = useMindStore((state) => state.helpOpen)
  const toast = useMindStore((state) => state.toast)
  const setToast = useMindStore((state) => state.setToast)

  useEffect(() => {
    document.title = `${dirty ? '● ' : ''}${displayName(filePath)} — Twig`
  }, [dirty, filePath])

  useEffect(() => {
    window.twig?.setDirty(dirty)
  }, [dirty])

  useEffect(() => {
    if (!window.twig) return
    let cancelled = false
    void window.twig
      .getConfig()
      .then((result) => {
        if (cancelled) return
        useMindStore.getState().setKeybinds(result.config.keybinds)
        if (result.error) setToast(result.error)
      })
      .catch((error: unknown) => {
        if (!cancelled) setToast(`Could not load config: ${String(error)}`)
      })
    return () => {
      cancelled = true
    }
  }, [setToast])

  useEffect(() => {
    if (!window.twig) return
    return window.twig.onMenuAction((action) => {
      if (action === 'new') newFlowCommand()
      else if (action === 'open') void openFlowCommand()
      else if (action === 'save') void saveFlowCommand(false)
      else void saveFlowCommand(true)
    })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [toast, setToast])

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent): void => {
      if (!useMindStore.getState().dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])

  return (
    <div className="app">
      <Toolbar />
      <Canvas />
      <StatusBar />
      {helpOpen ? <HelpOverlay /> : null}
      {toast ? (
        <div className="toast" role="alert">
          <span>{toast}</span>
          <button type="button" className="toast__close" aria-label="Dismiss" onClick={() => setToast(null)}>
            ✕
          </button>
        </div>
      ) : null}
    </div>
  )
}
