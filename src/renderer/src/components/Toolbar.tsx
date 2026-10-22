import { useMindStore } from '../store'
import { newFlowCommand, openFlowCommand, saveFlowCommand } from '../lib/commands'
import { displayName } from '../lib/parse'

export function Toolbar(): React.JSX.Element {
  const filePath = useMindStore((state) => state.filePath)
  const dirty = useMindStore((state) => state.dirty)
  const setHelpOpen = useMindStore((state) => state.setHelpOpen)

  return (
    <header className="toolbar">
      <div className="toolbar__brand">
        <span className="toolbar__mark" aria-hidden="true">
          ⌁
        </span>
        <span className="toolbar__name">Twig</span>
      </div>

      <div className="toolbar__file" title={filePath ?? 'Not saved yet'}>
        <span className={`toolbar__dot${dirty ? ' toolbar__dot--dirty' : ''}`} aria-hidden="true" />
        <span className="toolbar__filename">{displayName(filePath)}</span>
      </div>

      <nav className="toolbar__actions" aria-label="File actions">
        <button type="button" className="button" onClick={newFlowCommand}>
          New
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            void openFlowCommand()
          }}
        >
          Open
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            void saveFlowCommand(false)
          }}
        >
          Save
        </button>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => {
            void saveFlowCommand(true)
          }}
        >
          Save as
        </button>
        <button
          type="button"
          className="button button--icon"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
          onClick={() => setHelpOpen(true)}
        >
          ?
        </button>
      </nav>
    </header>
  )
}
