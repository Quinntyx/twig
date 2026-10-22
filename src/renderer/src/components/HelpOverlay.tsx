import { useEffect, useRef } from 'react'
import { useMindStore } from '../store'

interface Shortcut {
  keys: string[]
  description: string
}

interface Section {
  title: string
  shortcuts: Shortcut[]
}

const SECTIONS: Section[] = [
  {
    title: 'Navigate',
    shortcuts: [
      { keys: ['h', '←'], description: 'Focus the parent' },
      { keys: ['l', '→'], description: 'Focus the first child' },
      { keys: ['j', '↓'], description: 'Focus the next sibling' },
      { keys: ['k', '↑'], description: 'Focus the previous sibling' }
    ]
  },
  {
    title: 'Edit',
    shortcuts: [
      { keys: ['i'], description: 'Edit the focused node' },
      { keys: ['Enter'], description: 'Finish editing' },
      { keys: ['⇧Enter'], description: 'New line while editing' },
      { keys: ['Esc'], description: 'Cancel editing / close help' }
    ]
  },
  {
    title: 'Structure',
    shortcuts: [
      { keys: ['o'], description: 'New sibling below' },
      { keys: ['⇧Enter'], description: 'New child' },
      { keys: ['⇧h'], description: 'New parent (wraps this node)' },
      { keys: ['x', 'Del'], description: 'Delete node and its subtree' }
    ]
  },
  {
    title: 'History',
    shortcuts: [
      { keys: ['u'], description: 'Undo' },
      { keys: ['Ctrl⇧Z', 'Ctrl Y'], description: 'Redo' }
    ]
  },
  {
    title: 'File',
    shortcuts: [
      { keys: ['Ctrl N'], description: 'New map' },
      { keys: ['Ctrl O'], description: 'Open…' },
      { keys: ['Ctrl S'], description: 'Save' },
      { keys: ['Ctrl⇧S'], description: 'Save as…' }
    ]
  }
]

export function HelpOverlay(): React.JSX.Element {
  const setHelpOpen = useMindStore((state) => state.setHelpOpen)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    dialogRef.current?.focus()
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setHelpOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setHelpOpen])

  return (
    <div
      className="overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setHelpOpen(false)
      }}
    >
      <div
        ref={dialogRef}
        className="help"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        tabIndex={-1}
      >
        <div className="help__header">
          <div>
            <h2 className="help__title">Move fast, stay in flow</h2>
            <p className="help__subtitle">Twig is keyboard-first. Everything here also works from the toolbar.</p>
          </div>
          <button
            type="button"
            className="button button--icon"
            aria-label="Close help"
            onClick={() => setHelpOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="help__grid">
          {SECTIONS.map((section) => (
            <section key={section.title} className="help__section">
              <h3 className="help__section-title">{section.title}</h3>
              <dl className="help__list">
                {section.shortcuts.map((shortcut) => (
                  <div key={`${section.title}-${shortcut.description}`} className="help__row">
                    <dt className="help__keys">
                      {shortcut.keys.map((key) => (
                        <kbd key={key}>{key}</kbd>
                      ))}
                    </dt>
                    <dd className="help__description">{shortcut.description}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <p className="help__note">
          Maps are saved as readable <code>.twig.json</code> files — diffable, portable, yours.
        </p>
      </div>
    </div>
  )
}
