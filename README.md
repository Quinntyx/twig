# Twig

A keyboard-first mind mapping editor. Small documents, plain JSON, no accounts.

Twig is a tree on a canvas: type an idea, fan it out with `o`, wrap it with
`⇧h`, navigate with `hjkl`. Everything is one keystroke away, and the map is
saved as a readable `.twig.json` file you can diff, grep, and keep forever.

## Quick start

```bash
bun install
bun run dev          # Electron app with hot reload
bun run preview:web  # renderer only, in a browser (file dialogs fall back to downloads)
```

Other scripts:

```bash
bun run typecheck    # strict TypeScript, main + renderer
bun test             # unit tests (document ops, file format, layout, keys)
bun run build        # typecheck + production bundles in out/
bun run dist         # packaged installers via electron-builder
```

## Keyboard

| Key | Action |
| --- | --- |
| `h` `j` `k` `l` / arrows | Focus parent, next sibling, previous sibling, first child |
| `i` | Edit the focused node |
| `Enter` | Finish editing (`⇧Enter` inserts a line break) |
| `o` | New sibling below |
| `⇧Enter` | New child |
| `⇧h` | New parent: wrap the focused node in a new one |
| `x` / `Del` | Delete the node and its subtree |
| `u` | Undo (`Ctrl⇧z` / `Ctrl y` to redo) |
| `Ctrl n` / `Ctrl o` / `Ctrl s` / `Ctrl⇧s` | New / open / save / save as |
| `?` | Shortcut reference |
| `Esc` | Cancel editing, close help |

Clicking focuses a node; double-clicking edits it.

## File format

Files are UTF-8 JSON with a `.twig.json` suffix:

```json
{
  "format": "twig",
  "version": 1,
  "rootId": "n1",
  "nodes": [
    { "id": "n1", "text": "Central idea", "children": ["n2"] },
    { "id": "n2", "text": "First branch", "children": [] }
  ]
}
```

Parent links are derived from `children`, so files stay compact and readable.
Loading is strict: malformed files, duplicate ids, multiple parents, cycles and
unreachable nodes are rejected with a message instead of rendering a corrupt map.

## Architecture

```
src/
  shared/        types + IPC contract shared by all processes
  main/          Electron main process: window, menu, open/save dialogs
  preload/       contextBridge API exposed as window.twig
  renderer/
    index.html
    src/
      components/  Canvas (React Flow), MindNode, Toolbar, StatusBar, HelpOverlay
      lib/         doc (pure tree ops), layout, measure, parse, keyboard, file, commands
      store.ts     Zustand store: document, focus, edit mode, undo/redo
```

The document is an immutable tree (`MindMapDoc`). Every structural edit returns
a new tree; the store keeps a bounded undo/redo stack and pushes a snapshot once
per edit session rather than per keystroke. Layout is a pure function of the
document: columns per depth, subtree extents for vertical packing, and node
sizes estimated from a glyph-width table so tests run without a DOM.

React Flow renders the tree; nodes are deliberately non-draggable — the layout
owns positions. Focus is application state, not React Flow selection, so
keyboard navigation works while the canvas is not focused. In Electron, file
operations go through IPC; in the browser preview they degrade to an `<input>`
picker and a download.

## Status

Version 0.1.0. The core loop (create, edit, restructure, undo, save/open) is
implemented. Not yet present: drag-to-reparent, multi-select, notes/links,
images, search, or collaborative editing.
