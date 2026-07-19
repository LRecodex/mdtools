import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

export const editorTheme = EditorView.theme({
  '&': {
    color: 'var(--color-text)',
    backgroundColor: 'var(--color-bg)',
    height: '100%'
  },
  '.cm-content': {
    caretColor: 'var(--color-accent)',
    padding: '16px 0'
  },
  '.cm-gutters': {
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text-muted)',
    border: 'none'
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--color-bg-inset)'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--color-bg-inset)'
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'color-mix(in srgb, var(--color-accent) 30%, transparent)'
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--color-accent)'
  },
  '.cm-line': {
    padding: '0 24px'
  }
})

export const markdownHighlightStyle = HighlightStyle.define([
  { tag: t.heading1, fontSize: '1.6em', fontWeight: '700' },
  { tag: t.heading2, fontSize: '1.35em', fontWeight: '700' },
  { tag: t.heading3, fontSize: '1.15em', fontWeight: '600' },
  { tag: [t.heading4, t.heading5, t.heading6], fontWeight: '600' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: 'var(--color-accent)', textDecoration: 'underline' },
  { tag: t.url, color: 'var(--color-text-muted)' },
  { tag: t.monospace, fontFamily: 'var(--font-mono)', color: '#e06c75' },
  { tag: t.quote, color: 'var(--color-text-muted)', fontStyle: 'italic' },
  { tag: t.list, color: 'var(--color-accent)' },
  { tag: t.processingInstruction, color: 'var(--color-text-muted)' },
  { tag: t.contentSeparator, color: 'var(--color-border)' }
])

export const markdownHighlighting = syntaxHighlighting(markdownHighlightStyle)
