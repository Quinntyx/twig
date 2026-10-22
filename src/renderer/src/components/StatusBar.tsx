import { useMindStore } from '../store'
import { countNodes } from '../lib/doc'

export function StatusBar(): React.JSX.Element {
  const editing = useMindStore((state) => state.editingId !== null)
  const nodeCount = useMindStore((state) => countNodes(state.doc))
  const focusedText = useMindStore((state) => {
    const node = state.doc.nodes[state.focusedId]
    return node?.text ?? ''
  })

  return (
    <footer className="status">
      <span className={`status__mode${editing ? ' status__mode--insert' : ''}`}>
        {editing ? 'INSERT' : 'NORMAL'}
      </span>
      <span className="status__separator" aria-hidden="true" />
      <span className="status__focus" title={focusedText}>
        {focusedText.length > 0 ? focusedText : 'Untitled idea'}
      </span>
      <span className="status__spacer" />
      <span className="status__hint">
        <kbd>i</kbd> edit
        <kbd>o</kbd> sibling
        <kbd>⇧↵</kbd> child
        <kbd>⇧h</kbd> parent
        <kbd>u</kbd> undo
        <kbd>?</kbd> help
      </span>
      <span className="status__count">
        {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
      </span>
    </footer>
  )
}
