import { useEffect, useRef } from 'react'
import { formatKeybinds, type KeybindAction } from '../../../shared/config'
import { useMindStore } from '../store'

interface Shortcut {
  keys: string[]
  description: string
}

interface Section {
  title: string
  shortcuts: Shortcut[]
}

export function HelpOverlay(): React.JSX.Element {
  const setHelpOpen = useMindStore((state) => state.setHelpOpen)
  const keybinds = useMindStore((state) => state.keybinds)
  const dialogRef = useRef<HTMLDivElement>(null)

  const keys = (action: KeybindAction): string[] => formatKeybinds(keybinds[action])

  const sections: Section[] = [
    {
      title: 'Navigate',
      shortcuts: [
        { keys: keys('focusLeft'), description: 'Focus the parent' },
        { keys: keys('focusRight'), description: 'Focus the first child' },
        { keys: keys('focusDown'), description: 'Focus the next sibling' },
        { keys: keys('focusUp'), description: 'Focus the previous sibling' }
      ]
    },
    {
      title: 'Edit',
      shortcuts: [
        { keys: keys('edit'), description: 'Edit the focused node' },
        { keys: ['Enter'], description: 'Finish editing' },
        { keys: ['⇧Enter'], description: 'New line while editing' },
        { keys: ['Esc'], description: 'Cancel editing / close help' }
      ]
    },
    {
      title: 'Structure',
      shortcuts: [
        { keys: keys('createSiblingAfter'), description: 'New sibling below' },
        { keys: keys('createSiblingBefore'), description: 'New sibling above' },
        { keys: keys('createChild'), description: 'New child' },
        { keys: keys('createParent'), description: 'New parent (wraps this node)' },
        { keys: keys('delete'), description: 'Delete node and its subtree' }
      ]
    },
    {
      title: 'History',
      shortcuts: [
        { keys: keys('undo'), description: 'Undo' },
        { keys: keys('redo'), description: 'Redo' }
      ]
    },
    {
      title: 'File',
      shortcuts: [
        { keys: keys('newMap'), description: 'New map' },
        { keys: keys('openMap'), description: 'Open…' },
        { keys: keys('saveMap'), description: 'Save' },
        { keys: keys('saveMapAs'), description: 'Save as…' }
      ]
    }
  ]

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
          {sections.map((section) => (
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
          Keybindings live in <code>~/.config/twig/twig.json</code>. Maps are saved as readable{' '}
          <code>.twig.json</code> files — diffable, portable, yours.
        </p>
      </div>
    </div>
  )
}
