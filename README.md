# Twig

A keyboard-first mind mapping editor. Small documents, plain JSON, no accounts.

Twig is a tree on a canvas: type an idea, fan it out with `o`, wrap it with
`⇧h`, navigate with `hjkl`. Everything is one keystroke away, and the map is
saved as a readable `.twig.json` file you can diff, grep, and keep forever.

A new map starts empty. The first creation key makes the root node, and if you
delete the root the next creation key starts a new tree.

## Quick start

```bash
bun install
bun run dev          # Electron app with hot reload
bun run preview:web  # renderer only, in a browser (file dialogs fall back to downloads)
```

Other scripts:

```bash
bun run typecheck    # strict TypeScript, main + renderer
bun run test         # unit tests (document ops, file format, layout, keys, Markdown)
bun run build        # typecheck + production bundles in out/
bun run dist         # packaged installers via electron-builder
```

## Keyboard

| Key | Action |
| --- | --- |
| `h` `j` `k` `l` / arrows | Focus parent, next sibling, previous sibling, most recently visited child |
| `i` | Edit the focused node |
| `Enter` | Insert a new paragraph while editing |
| `⇧Enter` | Insert a line break while editing; new child in normal mode |
| `o` | New sibling below |
| `⇧h` | New parent: wrap the focused node in a new one |
| `d` / `Del` | Delete the node and its subtree |
| `u` | Undo (`Ctrl⇧z` / `Ctrl y` to redo) |
| `Ctrl n` / `Ctrl o` / `Ctrl s` / `Ctrl⇧s` | New / open / save / save as |
| `?` | Shortcut reference |
| `Esc` | Finish editing, close help |

Clicking focuses a node; double-clicking edits it. Moving left remembers which
child you came from, so moving right returns there instead of jumping to the
first child. That memory is per document session and never written to the file.

## Markdown

Node text is Markdown. Viewing a node renders it; editing opens a small
WYSIWYG editor in place, so the formatting is visible while you type. The saved
`.twig.json` still contains the Markdown source.

Inline formatting and links are supported through Markdown input rules:
`**bold**`, `*italic*`, `~~strikethrough~~`, `` `code` ``, and links. While
editing, `Ctrl+b`, `Ctrl+i`, `Ctrl+Shift+x`, and `Ctrl+e` toggle the
corresponding inline marks (Command on macOS). Headings, lists, task lists,
block quotes, fenced code blocks, tables, images, and horizontal rules are
supported too. `Enter` inserts a new paragraph, `Shift+Enter` inserts a line
break, and `Esc` finishes editing. Layout measures the rendered block structure
(heading scale, list indentation, task checkboxes, tables, code blocks, image
height) so nodes size to their content.

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
An empty map is `{ "format": "twig", "version": 1, "rootId": null, "nodes": [] }`.
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
      components/  Canvas (React Flow), MindNode, NodeMarkdownEditor, Toolbar, StatusBar, HelpOverlay
      lib/         doc (pure tree ops), layout, measure, parse, keyboard, markdown, markdownEditor, file, commands
      store.ts     Zustand store: document, focus, edit mode, undo/redo
```

The document is an immutable tree (`MindMapDoc`), or empty with no root. Every
structural edit returns a new tree; the store keeps a bounded undo/redo stack
and pushes a snapshot once per edit session rather than per keystroke. Deleting
the root clears the document. Layout is a pure function of the document:
columns per depth, subtree extents for vertical packing, and node sizes
estimated from a glyph-width table so tests run without a DOM.

React Flow renders the tree; nodes are deliberately non-draggable — the layout
owns positions. Focus is application state, not React Flow selection, so
keyboard navigation works while the canvas is not focused. In Electron, file
operations go through IPC; in the browser preview they degrade to an `<input>`
picker and a download.

## Configuration

Twig creates `~/.config/twig/twig.json` on first launch (or
`$XDG_CONFIG_HOME/twig/twig.json`) with every configurable key binding. The
file is plain JSON and is never rewritten once it exists; missing or malformed
fields fall back to the built-in defaults in memory.

```json
{
  "version": 1,
  "keybinds": {
    "focusLeft": ["y", "ArrowLeft"],
    "focusRight": ["o", "ArrowRight"],
    "focusUp": ["e", "ArrowUp"],
    "focusDown": ["n", "ArrowDown"],
    "createParent": ["Shift+y"],
    "createChild": ["Shift+Enter", "Shift+o"],
    "createSiblingBefore": ["Shift+e"],
    "createSiblingAfter": ["p", "Shift+n"]
  },
  "insertKeybinds": {
    "createParent": ["Ctrl+y"],
    "createChild": ["Ctrl+o"],
    "createSiblingBefore": ["Ctrl+e"],
    "createSiblingAfter": ["Ctrl+n"]
  }
}
```

Each action takes a string or an array of chords. The file written on first
launch includes every action; the example above only shows the movement and
creation keys with their Workman positions. Chords use `+` (`Shift+h`,
`Ctrl+Shift+z`) and accept `Ctrl` (also Cmd on macOS), `Alt`, and `Shift`. The
unshifted movement keys focus neighbours; the shifted versions create a node in
that direction: `Shift+h`/`Shift+y` parent, `Shift+l`/`Shift+o` child,
`Shift+j`/`Shift+n` sibling below, `Shift+k`/`Shift+e` sibling above.

`insertKeybinds` adds aliases for the shifted creation keys that work while a
node is being edited, so you can make a new node without pressing Escape. They
only apply in insert mode and win over normal bindings there: the defaults are
`Ctrl+h` parent, `Ctrl+j` sibling below, `Ctrl+k` sibling above, and `Ctrl+l`
child. The example uses the Workman positions (`Ctrl+y`, `Ctrl+n`, `Ctrl+e`,
`Ctrl+o`). Shifted letters stay available for typing capitals. On macOS these
aliases use Command rather than Control, and the help overlay displays ⌘.

Creating or deleting a node preserves the current mode: from normal mode the
new node is focused but not opened for editing; from insert mode the new node
stays in insert mode so you can keep typing. Focus navigation follows the
remembered child per parent, and that memory resets when a document is opened
or created.

## Building installers

`bun run dist` builds a DMG on macOS. On Linux, electron-builder cannot create
a DMG (`hdiutil`/`sips` are macOS-only), so CI uses the small pure-Go helper in
`tools/mkdmg` to wrap the packaged `Twig.app` in an HFS+ disk image with an
`Applications` drag-link.

The Forgejo build workflow produces:

- `Twig-x64.dmg` and `Twig-arm64.dmg` (drag `Twig` onto `Applications`)
- `Twig-<version>-x86_64.AppImage`

The macOS builds are unsigned and unnotarized. After dragging Twig to
Applications, either right-click → Open the first time, or clear the quarantine
flag:

```bash
xattr -dr com.apple.quarantine /Applications/Twig.app
```

## Status

Version 0.1.0. The core loop (create, edit, restructure, undo, save/open) is
implemented. Not yet present: drag-to-reparent, multi-select, notes/links,
search, or collaborative editing.
