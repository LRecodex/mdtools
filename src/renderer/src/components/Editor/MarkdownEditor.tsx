import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { EditorSelection, StateEffect } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { json } from '@codemirror/lang-json'
import { bracketMatching, foldGutter, indentOnInput, LanguageDescription } from '@codemirror/language'
import { languages } from '@codemirror/language-data'
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { GFM } from '@lezer/markdown'
import { editorTheme, markdownHighlighting } from '../../lib/cmTheme'
import type { MarkdownEditorHandle, MarkdownFormat } from './formatting'

const CODE_TEMPLATES: Record<string, string> = {
  text: 'code here',
  javascript: "const greeting = 'Hello, world!'\nconsole.log(greeting)",
  typescript: "const greeting: string = 'Hello, world!'\nconsole.log(greeting)",
  python: "name = 'myname'\nage = 2\nprint(f'{name}{age}')",
  java: 'public class Main {\n  public static void main(String[] args) {\n    String name = "myname";\n    int age = 2;\n    System.out.println(name + age);\n  }\n}',
  cpp: '#include <iostream>\n\nint main() {\n  std::cout << "Hello, world!" << std::endl;\n  return 0;\n}',
  bash: '#!/usr/bin/env bash\necho "Hello, world!"',
  json: '{\n  "name": "myname",\n  "age": 2\n}',
  html: '<h1>Hello, world!</h1>',
  css: '.example {\n  color: royalblue;\n}',
  yaml: 'name: myname\nage: 2',
  sql: 'SELECT name, age\nFROM users;'
}

const MERMAID_TEMPLATES: Record<string, { body: string; selection: string }> = {
  flowchart: {
    body: 'flowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[Success]\n  B -->|No| D[Try again]',
    selection: 'Start'
  },
  sequence: {
    body: 'sequenceDiagram\n  participant A as Alice\n  participant B as Bob\n  A->>B: Hello Bob\n  B-->>A: Hello Alice',
    selection: 'Hello Bob'
  },
  class: {
    body: 'classDiagram\n  class Animal {\n    +String name\n    +makeSound()\n  }\n  Animal <|-- Dog',
    selection: 'Animal'
  },
  state: {
    body: 'stateDiagram-v2\n  [*] --> Idle\n  Idle --> Active: Start\n  Active --> Idle: Stop\n  Idle --> [*]',
    selection: 'Idle'
  },
  er: {
    body: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places\n  CUSTOMER {\n    string name\n    string email\n  }\n  ORDER {\n    int orderNumber\n  }',
    selection: 'CUSTOMER'
  },
  gantt: {
    body: 'gantt\n  title Project plan\n  dateFormat YYYY-MM-DD\n  section Planning\n  Design :a1, 2026-01-01, 7d\n  section Delivery\n  Build :after a1, 14d',
    selection: 'Project plan'
  },
  pie: {
    body: 'pie title Project effort\n  "Development" : 60\n  "Testing" : 25\n  "Documentation" : 15',
    selection: 'Project effort'
  },
  mindmap: {
    body: 'mindmap\n  root((Project))\n    Planning\n      Requirements\n      Design\n    Delivery\n      Build\n      Test',
    selection: 'Project'
  },
  timeline: {
    body: 'timeline\n  title Product roadmap\n  2026 Q1 : Plan\n  2026 Q2 : Build\n  2026 Q3 : Launch',
    selection: 'Product roadmap'
  },
  gitGraph: {
    body: 'gitGraph\n  commit id: "Initial"\n  branch develop\n  checkout develop\n  commit id: "Feature"\n  checkout main\n  merge develop\n  commit id: "Release"',
    selection: 'Initial'
  },
  journey: {
    body: 'journey\n  title User journey\n  section Discover\n    Find the product: 5: User\n    Read reviews: 4: User\n  section Buy\n    Checkout: 3: User',
    selection: 'User journey'
  },
  quadrant: {
    body: 'quadrantChart\n  title Reach and engagement\n  x-axis Low reach --> High reach\n  y-axis Low engagement --> High engagement\n  quadrant-1 Expand\n  quadrant-2 Promote\n  quadrant-3 Re-evaluate\n  quadrant-4 Improve\n  Campaign A: [0.65, 0.75]\n  Campaign B: [0.35, 0.45]',
    selection: 'Reach and engagement'
  }
}

interface MarkdownEditorProps {
  path: string
  value: string
  onChange: (value: string) => void
  onSaveShortcut?: () => void
  onCursorChange?: (pos: { line: number; col: number }) => void
  documentType?: 'markdown' | 'text' | 'json' | 'code'
}

function applyMarkdownFormat(view: EditorView, format: MarkdownFormat): void {
  const range = view.state.selection.main
  const selected = view.state.sliceDoc(range.from, range.to)

  const replace = (text: string, selectionFrom: number, selectionTo = selectionFrom): void => {
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: text },
      selection: EditorSelection.range(range.from + selectionFrom, range.from + selectionTo),
      scrollIntoView: true
    })
    view.focus()
  }

  const wrap = (before: string, after: string, placeholder: string): void => {
    const inner = selected || placeholder
    replace(`${before}${inner}${after}`, before.length, before.length + inner.length)
  }

  const prefixLines = (prefix: string, numbered = false): void => {
    const fromLine = view.state.doc.lineAt(range.from)
    const toLine = view.state.doc.lineAt(range.empty ? range.to : Math.max(range.from, range.to - 1))
    const from = fromLine.from
    const to = toLine.to
    const source = view.state.sliceDoc(from, to)
    const transformed = source
      .split('\n')
      .map((line, index) => `${numbered ? `${index + 1}. ` : prefix}${line}`)
      .join('\n')
    view.dispatch({
      changes: { from, to, insert: transformed },
      selection: range.empty
        ? EditorSelection.cursor(range.head + (numbered ? 3 : prefix.length))
        : EditorSelection.range(from, from + transformed.length),
      scrollIntoView: true
    })
    view.focus()
  }

  const insertBlock = (body: string, selectionText: string): void => {
    const beforeBreak = range.from > 0 && view.state.sliceDoc(range.from - 1, range.from) !== '\n'
    const afterBreak = range.to < view.state.doc.length && view.state.sliceDoc(range.to, range.to + 1) !== '\n'
    const prefix = beforeBreak ? '\n\n' : ''
    const suffix = afterBreak ? '\n\n' : ''
    const text = `${prefix}${body}${suffix}`
    const target = text.indexOf(selectionText)
    replace(text, target, target + selectionText.length)
  }

  if (format.startsWith('codeBlock:')) {
    const language = format.slice('codeBlock:'.length)
    const code = selected || CODE_TEMPLATES[language] || 'code here'
    insertBlock(`\`\`\`${language}\n${code}\n\`\`\``, code)
    return
  }

  if (format.startsWith('mermaid:')) {
    const diagramType = format.slice('mermaid:'.length)
    const template = MERMAID_TEMPLATES[diagramType] || MERMAID_TEMPLATES.flowchart
    insertBlock(`\`\`\`mermaid\n${template.body}\n\`\`\``, template.selection)
    return
  }

  switch (format) {
    case 'bold': wrap('**', '**', 'bold text'); break
    case 'italic': wrap('*', '*', 'italic text'); break
    case 'strikethrough': wrap('~~', '~~', 'strikethrough text'); break
    case 'inlineCode': wrap('`', '`', 'code'); break
    case 'link': {
      const label = selected || 'link text'
      replace(`[${label}](https://example.com)`, 1, 1 + label.length)
      break
    }
    case 'image': replace('![alt text](image.png)', 2, 10); break
    case 'heading': prefixLines('## '); break
    case 'quote': prefixLines('> '); break
    case 'bulletList': prefixLines('- '); break
    case 'numberedList': prefixLines('', true); break
    case 'taskList': prefixLines('- [ ] '); break
    case 'table':
      insertBlock('| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |', 'Column 1')
      break
    case 'horizontalRule': insertBlock('---', '---'); break
  }
}

const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(function MarkdownEditor({
  path,
  value,
  onChange,
  onSaveShortcut,
  onCursorChange,
  documentType = 'markdown'
}, ref): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const lastEmitted = useRef<string>(value)
  const handlersRef = useRef({ onChange, onSaveShortcut, onCursorChange })
  handlersRef.current = { onChange, onSaveShortcut, onCursorChange }

  useImperativeHandle(ref, () => ({
    applyFormat: (format) => {
      const view = viewRef.current
      if (view) applyMarkdownFormat(view, format)
    },
    focus: () => viewRef.current?.focus()
  }), [])

  useEffect(() => {
    if (!containerRef.current) return

    const view = new EditorView({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        ...(documentType === 'markdown'
          ? [markdown({ extensions: [GFM] })]
          : documentType === 'json'
            ? [json()]
            : []),
        ...(documentType === 'code'
          ? [foldGutter(), indentOnInput(), bracketMatching(), closeBrackets(), autocompletion()]
          : []),
        markdownHighlighting,
        editorTheme,
        EditorView.lineWrapping,
        keymap.of([
          {
            key: 'Mod-b',
            run: (v) => {
              if (documentType !== 'markdown') return false
              applyMarkdownFormat(v, 'bold')
              return true
            }
          },
          {
            key: 'Mod-i',
            run: (v) => {
              if (documentType !== 'markdown') return false
              applyMarkdownFormat(v, 'italic')
              return true
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
          ...(documentType === 'code' ? [...closeBracketsKeymap, ...completionKeymap] : []),
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
    if (documentType === 'code') {
      const language = LanguageDescription.matchFilename(languages, path)
      language?.load().then((support) => {
        if (viewRef.current === view) view.dispatch({ effects: StateEffect.appendConfig.of(support) })
      }).catch(() => {
        // Unknown or unavailable modes remain fully editable as plain text.
      })
    }
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
})

export default MarkdownEditor
