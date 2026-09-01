import { useRef, useState } from 'react'
import { FolderOpen, FilePlus, FolderPlus, Clock, RotateCcw, ChevronsUp } from 'lucide-react'
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
  const selectedFolderPath = useAppStore((s) => s.selectedFolderPath)
  const recentWorkspaces = useAppStore((s) => s.recentWorkspaces)
  const openWorkspace = useAppStore((s) => s.openWorkspace)
  const deletePath = useAppStore((s) => s.deletePath)
  const setTemplateDialog = useAppStore((s) => s.setTemplateDialog)
  const selectFolder = useAppStore((s) => s.selectFolder)
  const revealFolder = useAppStore((s) => s.revealFolder)
  const collapseAllFolders = useAppStore((s) => s.collapseAllFolders)
  const sidebarWidth = useAppStore((s) => s.sidebarWidth)
  const setSidebarWidth = useAppStore((s) => s.setSidebarWidth)
  const copiedPath = useAppStore((s) => s.copiedPath)
  const copyPath = useAppStore((s) => s.copyPath)
  const pastePath = useAppStore((s) => s.pastePath)

  const [creating, setCreating] = useState<CreatingState | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<FileNode | null>(null)
  const resizeStart = useRef<{ x: number; width: number } | null>(null)

  const handleOpenFolder = async (): Promise<void> => {
    const path = await window.api.dialog.openFolder()
    if (path) openWorkspace(path)
  }

  const beginResize = (event: React.PointerEvent<HTMLDivElement>): void => {
    resizeStart.current = { x: event.clientX, width: sidebarWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const resize = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!resizeStart.current) return
    setSidebarWidth(resizeStart.current.width + event.clientX - resizeStart.current.x)
  }

  const endResize = (event: React.PointerEvent<HTMLDivElement>): void => {
    resizeStart.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const rootChildren = workspaceRoot ? childrenByDir[workspaceRoot] : undefined
  const createTarget = selectedFolderPath ?? workspaceRoot
  const isWorkspaceRootMenu = Boolean(contextMenu && contextMenu.node.path === workspaceRoot)
  const beginCreatingFolder = (dirPath: string): void => {
    revealFolder(dirPath)
    setCreating({ dirPath, type: 'folder' })
  }

  const menuItems: ContextMenuItem[] = contextMenu
    ? contextMenu.node.isDirectory
      ? [
          {
            label: 'New File',
            onSelect: () => setTemplateDialog({ mode: 'create', dirPath: contextMenu.node.path })
          },
          {
            label: 'New Folder',
            onSelect: () => beginCreatingFolder(contextMenu.node.path)
          },
          {
            label: 'Paste',
            disabled: !copiedPath,
            onSelect: () => void pastePath(contextMenu.node.path),
            separatorBefore: true
          },
          {
            label: 'Copy Folder',
            onSelect: () => copyPath(contextMenu.node.path, true)
          },
          {
            label: 'Copy Folder Path',
            onSelect: () => window.api.clipboard.writeText(contextMenu.node.path)
          },
          ...(!isWorkspaceRootMenu
            ? [{ label: 'Rename', onSelect: () => setRenaming(contextMenu.node.path), separatorBefore: true }]
            : []),
          {
            label: 'Reveal in Explorer',
            onSelect: () => window.api.dialog.showItemInFolder(contextMenu.node.path)
          },
          ...(!isWorkspaceRootMenu
            ? [{
                label: 'Delete',
                danger: true,
                separatorBefore: true,
                onSelect: () => setConfirmDelete(contextMenu.node)
              }]
            : [])
        ]
      : [
          {
            label: 'Copy File',
            onSelect: () => copyPath(contextMenu.node.path, false)
          },
          {
            label: 'Copy File Path',
            onSelect: () => window.api.clipboard.writeText(contextMenu.node.path)
          },
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
      <aside
        className="relative flex shrink-0 flex-col border-r border-(--color-border) bg-(--color-bg-elevated)"
        style={{ width: sidebarWidth }}
      >
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-(--color-border) px-2">
          <span className="truncate text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
            {workspaceRoot ? basename(workspaceRoot) : 'Explorer'}
          </span>
          <div className="flex items-center gap-0.5">
            <IconButton
              label={`New File${createTarget ? ` in ${basename(createTarget)}` : ''}`}
              disabled={!workspaceRoot}
              onClick={() => createTarget && setTemplateDialog({ mode: 'create', dirPath: createTarget })}
            >
              <FilePlus size={15} />
            </IconButton>
            <IconButton
              label={`New Folder${createTarget ? ` in ${basename(createTarget)}` : ''}`}
              disabled={!workspaceRoot}
              onClick={() => createTarget && beginCreatingFolder(createTarget)}
            >
              <FolderPlus size={15} />
            </IconButton>
            <IconButton label="Collapse All Folders" disabled={!workspaceRoot} onClick={collapseAllFolders}>
              <ChevronsUp size={15} />
            </IconButton>
            <IconButton label="Open Folder" onClick={handleOpenFolder}>
              <FolderOpen size={15} />
            </IconButton>
          </div>
        </div>

        {workspaceRoot && createTarget && (
          <div className="flex h-7 shrink-0 items-center gap-1.5 border-b border-(--color-border) px-2 text-[11px] text-(--color-text-muted)" title={createTarget}>
            <span className="shrink-0">Create in</span>
            <FolderOpen size={12} className="shrink-0 text-amber-500" />
            <span className="min-w-0 flex-1 truncate font-medium text-(--color-text)">{basename(createTarget)}</span>
            {createTarget !== workspaceRoot && (
              <button
                type="button"
                aria-label="Reset creation folder to workspace root"
                title={`Create in ${basename(workspaceRoot)} instead`}
                onClick={() => selectFolder(workspaceRoot)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-(--color-bg-inset) hover:text-(--color-text)"
              >
                <RotateCcw size={11} />
              </button>
            )}
          </div>
        )}

        <div
          className="min-h-0 flex-1 overflow-y-auto py-1"
          onContextMenu={(event) => {
            if (!workspaceRoot) return
            event.preventDefault()
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              node: {
                name: basename(workspaceRoot),
                path: workspaceRoot,
                isDirectory: true,
                isMarkdown: false,
                kind: 'unsupported'
              }
            })
          }}
        >
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
        <div className="flex h-7 shrink-0 items-center justify-between gap-2 border-t border-(--color-border) px-2 text-[11px] text-(--color-text-muted)">
          <span className="truncate">Current version: v1.6.0</span>
          <span className="shrink-0">Made by LRecodex</span>
        </div>
        <div
          role="separator"
          aria-label="Resize sidebar"
          title="Drag to resize sidebar. Double-click to reset."
          onPointerDown={beginResize}
          onPointerMove={resize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          onDoubleClick={() => setSidebarWidth(256)}
          className="absolute -right-1 top-0 z-10 h-full w-2 cursor-col-resize touch-none hover:bg-(--color-accent)/30"
        />
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
