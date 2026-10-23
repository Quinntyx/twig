import { formatChord } from '../../../shared/config'
import { useMindStore } from '../store'
import { countNodes } from '../lib/doc'
import { markdownToPlainText } from '../lib/markdown'

export function StatusBar(): React.JSX.Element {
  const editing = useMindStore((state) => state.editingId !== null)
  const keybinds = useMindStore((state) => state.keybinds)
  const nodeCount = useMindStore((state) => countNodes(state.doc))
  const focusedText = useMindStore((state) => {
    const node = state.focusedId === null ? undefined : state.doc.nodes[state.focusedId]
    return node ? markdownToPlainText(node.text).replace(/\s+/g, ' ').trim() : ''
  })

  const key = (action: keyof typeof keybinds): string =>
    formatChord(keybinds[action][0] ?? '')

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
        <kbd>{key('edit')}</kbd> edit
        <kbd>{key('createSiblingAfter')}</kbd> sibling
        <kbd>{key('createChild')}</kbd> child
        <kbd>{key('createParent')}</kbd> parent
        <kbd>{key('undo')}</kbd> undo
        <kbd>{key('toggleHelp')}</kbd> help
      </span>
      <span className="status__count">
        {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
      </span>
    </footer>
  )
}
