# MD Tools

A fast, polished desktop app for browsing, viewing, and authoring Markdown files — with live preview and built-in Mermaid diagram rendering.

This is the **source repository** (private). For prebuilt installers, see
[LRecodex/mdtools-releases](https://github.com/LRecodex/mdtools-releases/releases/latest).

![MD Tools — Mermaid diagram rendered live in Preview mode](.github/assets/screenshot-mermaid.png)

## Tech stack

- **Shell:** Electron, built/bundled with `electron-vite`
- **UI:** React + TypeScript, Tailwind CSS, `lucide-react` icons, Zustand for state
- **Editor:** CodeMirror 6 (`@codemirror/lang-markdown`)
- **Rendering:** `markdown-it` (+ `markdown-it-task-lists`) for Markdown, `highlight.js` for code, `mermaid` for diagrams
- **Filesystem:** Node `fs` in the main process, live-reloaded via `chokidar`

## Development

```bash
npm install
npm run dev        # start the app in development mode (electron-vite dev)
npm run typecheck  # type-check main, preload, and renderer
npm run build      # production build (out/)
npm run dist       # package Windows installer + portable build (release/)
npm run dist:dir    # unpacked build only, skips installer packaging — fast iteration
npm run icon       # regenerate app icons from source art (scripts/generate-icon.mjs)
```

`npm run dist` packages via `electron-builder` (see `electron-builder.yml`): an NSIS installer and
a portable `.exe`, both Windows x64. Output lands in `release/`.

## Project structure

```
src/
  main/            Electron main process — window creation, settings persistence,
                    file-system + dialog IPC handlers, chokidar-based file watcher
  preload/         contextBridge API surface exposed to the renderer (window.api)
  renderer/src/
    components/    Sidebar, Editor (Source/Split/Preview + Mode switcher), TitleBar,
                    StatusBar, QuickOpen, Dialogs, common/ (shared primitives)
    store/         Zustand store — workspace tree, open tabs, editor mode, theme
    lib/           markdown-it setup, CodeMirror theme, path helpers
  shared/          Types shared between main and renderer
```

## Features

| | |
| --- | --- |
| **Workspace browsing** | Open a folder and create, rename, and delete files/folders right from the sidebar |
| **Tabs** | Work on several files at once; closing a tab with unsaved changes prompts you first |
| **Source / Split / Preview** | Switch between raw markdown, a live side-by-side split, or a full rendered preview |
| **Autosave** | Changes save automatically shortly after you stop typing, or instantly with `Ctrl+S` |
| **Quick Open** | `Ctrl+P` fuzzy-searches every file in the workspace |
| **Themes** | Light / dark / system, cycled with `Ctrl+,` |
| **Built-in Help** | `Ctrl+/` opens an in-app cheat sheet for syntax, shortcuts, and Mermaid |

## Markdown & Mermaid support

Standard Markdown renders via `markdown-it`: headings, bold/italic, links, blockquotes, task lists
(`- [ ]` / `- [x]`), tables, and fenced code blocks — with syntax highlighting for **JS/TS, Python,
Bash, JSON, HTML, CSS, YAML, C++, Java, and SQL** (registered languages live in
`src/renderer/src/lib/markdown.ts`).

Fence a code block with `mermaid` and it renders live in Preview/Split mode — flowcharts, sequence
diagrams, Gantt charts, state diagrams, and more:

````markdown
```mermaid
graph TD
  A[Write Markdown] --> B{Need a diagram?}
  B -->|Yes| C[Add a mermaid block]
  B -->|No| D[Preview instantly]
  C --> D
```
````

![Source on the left, live preview with syntax highlighting on the right](.github/assets/screenshot-split.png)

### Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+N` | New file |
| `Ctrl+O` | Open folder |
| `Ctrl+S` | Save current file |
| `Ctrl+W` | Close current tab |
| `Ctrl+P` | Quick Open |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Next / previous tab |
| `Ctrl+,` | Cycle theme (system → light → dark) |
| `Ctrl+/` | Toggle in-app help |

Shortcut handling lives in `src/renderer/src/hooks/useKeyboardShortcuts.ts`; the same feature list
and examples are shown in-app via `Ctrl+/` (`HelpDialog.tsx`).

## Releases

Tagged builds are published as installers to
[LRecodex/mdtools-releases](https://github.com/LRecodex/mdtools-releases/releases/latest)
(Setup + Portable, Windows x64, unsigned).
