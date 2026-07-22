export type CodeBlockLanguage =
  | 'text'
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'bash'
  | 'json'
  | 'html'
  | 'css'
  | 'yaml'
  | 'sql'

export type MermaidDiagramType =
  | 'flowchart'
  | 'sequence'
  | 'class'
  | 'state'
  | 'er'
  | 'gantt'
  | 'pie'
  | 'mindmap'
  | 'timeline'
  | 'gitGraph'
  | 'journey'
  | 'quadrant'

export type MarkdownFormat =
  | 'heading'
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'inlineCode'
  | 'link'
  | 'image'
  | 'quote'
  | 'bulletList'
  | 'numberedList'
  | 'taskList'
  | 'table'
  | 'horizontalRule'
  | `codeBlock:${CodeBlockLanguage}`
  | `mermaid:${MermaidDiagramType}`

export interface MarkdownEditorHandle {
  applyFormat: (format: MarkdownFormat) => void
  focus: () => void
}
