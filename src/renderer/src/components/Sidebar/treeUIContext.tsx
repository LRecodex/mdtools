import { createContext, useContext } from 'react'
import type { FileNode } from '../../../../shared/types'

export interface CreatingState {
  dirPath: string
  type: 'file' | 'folder'
}

export interface ContextMenuState {
  x: number
  y: number
  node: FileNode
}

export interface TreeUIState {
  creating: CreatingState | null
  setCreating: (state: CreatingState | null) => void
  renaming: string | null
  setRenaming: (path: string | null) => void
  contextMenu: ContextMenuState | null
  setContextMenu: (state: ContextMenuState | null) => void
  confirmDelete: FileNode | null
  setConfirmDelete: (node: FileNode | null) => void
}

export const TreeUIContext = createContext<TreeUIState | null>(null)

export function useTreeUI(): TreeUIState {
  const ctx = useContext(TreeUIContext)
  if (!ctx) throw new Error('useTreeUI must be used within TreeUIContext.Provider')
  return ctx
}
