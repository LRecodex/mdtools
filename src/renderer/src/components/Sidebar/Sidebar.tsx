import { useState } from 'react'
import { FolderOpen, FilePlus, FolderPlus, Clock } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { basename } from '../../lib/path'
import IconButton from '../common/IconButton'
import ContextMenu, { type ContextMenuItem } from '../common/ContextMenu'
import ConfirmDialog from '../common/ConfirmDialog'
import InlineInput from '../common/InlineInput'
import FileTreeItem from './FileTreeItem'
import {
  TreeUIContext,
  type CreatingState,
  type ContextMenuState
} from './treeUIContext'
import type { FileNode } from '../../../../shared/types'

export default function Sidebar(): React.JSX.Element {
  const workspaceRoot = useAppStore((s) => s.workspaceRoot)
  const childrenByDir = useAppStore((s) => s.childrenByDir)
  const recentWorkspaces = useAppStore((s) => s.recentWorkspaces)
  const openWorkspace = useAppStore((s) => s.openWorkspace)
  const deletePath = useAppStore((s) => s.deletePath)
  const setTemplateDialog = useAppStore((s) => s.setTemplateDialog)

  const [creating, setCreating] = useState<CreatingState | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<FileNode | null>(null)

  const handleOpenFolder = async (): Promise<void> => {
    const path = await window.api.dialog.openFolder()
    if (path) openWorkspace(path)
  }

  const rootChildren = workspaceRoot ? childrenByDir[workspaceRoot] : undefined

  const menuItems: ContextMenuItem[] = contextMenu
    ? contextMenu.node.isDirectory
      ? [
          {
            label: 'New File',
            onSelect: () => setTemplateDialog({ mode: 'create', dirPath: contextMenu.node.path })
          },
          {
            label: 'New Folder',
            onSelect: () => setCreating({ dirPath: contextMenu.node.path, type: 'folder' })
          },
          { label: 'Rename', onSelect: () => setRenaming(contextMenu.node.path), separatorBefore: true },
          {
            label: 'Reveal in Explorer',
            onSelect: () => window.api.dialog.showItemInFolder(contextMenu.node.path)
          },
          {
            label: 'Delete',
            danger: true,
            separatorBefore: true,
            onSelect: () => setConfirmDelete(contextMenu.node)
          }
        ]
      : [
          { label: 'Rename', onSelect: () => setRenaming(contextMenu.node.path) },
          {
            label: 'Reveal in Explorer',
            onSelect: () => window.api.dialog.showItemInFolder(contextMenu.node.path)
          },
          {
            label: 'Delete',
            danger: true,
            separatorBefore: true,
            onSelect: () => setConfirmDelete(contextMenu.node)
          }
        ]
    : []

  return (
    <TreeUIContext.Provider
      value={{ creating, setCreating, renaming, setRenaming, contextMenu, setContextMenu, confirmDelete, setConfirmDelete }}
    >
      <aside className="flex w-64 shrink-0 flex-col border-r border-(--color-border) bg-(--color-bg-elevated)">
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-(--color-border) px-2">
          <span className="truncate text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
            {workspaceRoot ? basename(workspaceRoot) : 'Explorer'}
          </span>
          <div className="flex items-center gap-0.5">
            <IconButton
              label="New File"
              disabled={!workspaceRoot}
              onClick={() => workspaceRoot && setTemplateDialog({ mode: 'create', dirPath: workspaceRoot })}
            >
              <FilePlus size={15} />
            </IconButton>
            <IconButton
              label="New Folder"
              disabled={!workspaceRoot}
              onClick={() => workspaceRoot && setCreating({ dirPath: workspaceRoot, type: 'folder' })}
            >
              <FolderPlus size={15} />
            </IconButton>
            <IconButton label="Open Folder" onClick={handleOpenFolder}>
              <FolderOpen size={15} />
            </IconButton>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {workspaceRoot ? (
            <>
              {creating?.type === 'folder' && creating.dirPath === workspaceRoot && (
                <RootNewEntryRow dirPath={workspaceRoot} type={creating.type} onDone={() => setCreating(null)} />
              )}
              {rootChildren?.map((node) => (
                <FileTreeItem key={node.path} node={node} depth={0} />
              ))}
              {rootChildren?.length === 0 && !creating && (
                <p className="px-3 py-6 text-center text-xs text-(--color-text-muted)">
                  This folder is empty.
                </p>
              )}
            </>
          ) : (
            <div className="px-3 py-4">
              <button
                type="button"
                onClick={handleOpenFolder}
                className="w-full rounded-md bg-(--color-accent) px-3 py-2 text-sm font-medium text-(--color-accent-fg) hover:opacity-90"
              >
                Open Folder
              </button>
              {recentWorkspaces.length > 0 && (
                <div className="mt-5">
                  <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
                    <Clock size={12} /> Recent
                  </p>
                  {recentWorkspaces.map((path) => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => openWorkspace(path)}
                      className="block w-full truncate rounded-md px-2 py-1.5 text-left text-sm text-(--color-text-muted) hover:bg-(--color-bg-inset) hover:text-(--color-text)"
                      title={path}
                    >
                      {basename(path)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={menuItems} onClose={() => setContextMenu(null)} />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete ${confirmDelete.isDirectory ? 'folder' : 'file'}?`}
          message={`"${confirmDelete.name}" will be moved to the Recycle Bin.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            deletePath(confirmDelete.path)
            setConfirmDelete(null)
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </TreeUIContext.Provider>
  )
}

function RootNewEntryRow({
  dirPath,
  type,
  onDone
}: {
  dirPath: string
  type: 'file' | 'folder'
  onDone: () => void
}): React.JSX.Element {
  const createFile = useAppStore((s) => s.createFile)
  const createFolder = useAppStore((s) => s.createFolder)

  return (
    <div className="flex h-7 items-center gap-1 px-2 pl-3 text-sm">
      <InlineInput
        placeholder={type === 'file' ? 'name.md' : 'folder name'}
        onSubmit={async (value) => {
          if (type === 'file') await createFile(dirPath, value)
          else await createFolder(dirPath, value)
          onDone()
        }}
        onCancel={onDone}
      />
    </div>
  )
}
