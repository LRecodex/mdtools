import { useEffect, useRef } from 'react'
import { EditorSelection } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { GFM } from '@lezer/markdown'
import { editorTheme, markdownHighlighting } from '../../lib/cmTheme'

interface MarkdownEditorProps {
  path: string
  value: string
  onChange: (value: string) => void
  onBoldShortcut?: () => void
  onItalicShortcut?: () => void
  onSaveShortcut?: () => void
  onCursorChange?: (pos: { line: number; col: number }) => void
}

export default function MarkdownEditor({
  path,
  value,
  onChange,
  onBoldShortcut,
  onItalicShortcut,
  onSaveShortcut,
  onCursorChange
}: MarkdownEditorProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const lastEmitted = useRef<string>(value)
  const handlersRef = useRef({ onChange, onBoldShortcut, onItalicShortcut, onSaveShortcut, onCursorChange })
  handlersRef.current = { onChange, onBoldShortcut, onItalicShortcut, onSaveShortcut, onCursorChange }

  useEffect(() => {
    if (!containerRef.current) return

    const wrapSelection = (marker: string) => (view: EditorView): boolean => {
      const { state } = view
      view.dispatch(
        state.changeByRange((range) => ({
          changes: [
            { from: range.from, insert: marker },
            { from: range.to, insert: marker }
          ],
          range: range.empty
            ? range
            : EditorSelection.range(range.from + marker.length, range.to + marker.length)
        }))
      )
      return true
    }

    const view = new EditorView({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        markdown({ extensions: [GFM] }),
        markdownHighlighting,
        editorTheme,
        EditorView.lineWrapping,
        keymap.of([
          {
            key: 'Mod-b',
            run: (v) => {
              handlersRef.current.onBoldShortcut?.()
              return wrapSelection('**')(v)
            }
          },
          {
            key: 'Mod-i',
            run: (v) => {
              handlersRef.current.onItalicShortcut?.()
              return wrapSelection('_')(v)
            }
          },
          {
            key: 'Mod-s',
            run: () => {
              handlersRef.current.onSaveShortcut?.()
              return true
            }
          },
          indentWithTab,
          ...historyKeymap,
          ...defaultKeymap
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const text = update.state.doc.toString()
            lastEmitted.current = text
            handlersRef.current.onChange(text)
          }
          if (update.docChanged || update.selectionSet) {
            const pos = update.state.selection.main.head
            const line = update.state.doc.lineAt(pos)
            handlersRef.current.onCursorChange?.({ line: line.number, col: pos - line.from + 1 })
          }
        })
      ],
      parent: containerRef.current
    })

    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (value !== lastEmitted.current) {
      const currentDoc = view.state.doc.toString()
      if (value !== currentDoc) {
        const cursor = Math.min(view.state.selection.main.head, value.length)
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: value },
          selection: { anchor: cursor }
        })
      }
      lastEmitted.current = value
    }
  }, [value])

  useEffect(() => {
    viewRef.current?.focus()
  }, [path])

  return <div ref={containerRef} className="h-full min-h-0 flex-1 overflow-hidden" />
}
