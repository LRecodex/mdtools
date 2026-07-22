import { ChevronRight, Folder, FolderOpen, FileText, File as FileIcon } from 'lucide-react'
import type { FileNode } from '../../../../shared/types'
import { useAppStore } from '../../store/useAppStore'
import { useTreeUI } from './treeUIContext'
import InlineInput from '../common/InlineInput'

interface FileTreeItemProps {
  node: FileNode
  depth: number
}

export default function FileTreeItem({ node, depth }: FileTreeItemProps): React.JSX.Element {
  const expandedDirs = useAppStore((s) => s.expandedDirs)
  const childrenByDir = useAppStore((s) => s.childrenByDir)
  const activeTabPath = useAppStore((s) => s.activeTabPath)
  const toggleDir = useAppStore((s) => s.toggleDir)
  const openFile = useAppStore((s) => s.openFile)
  const renamePath = useAppStore((s) => s.renamePath)
  const { creating, renaming, setRenaming, setContextMenu } = useTreeUI()

  const isExpanded = expandedDirs.has(node.path)
  const isActive = activeTabPath === node.path
  const isRenaming = renaming === node.path
  const children = childrenByDir[node.path]

  const handleClick = (): void => {
    if (node.isDirectory) toggleDir(node.path)
    else openFile(node.path)
  }

  const handleContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  return (
    <div>
      <div
        role="treeitem"
        aria-selected={isActive}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        onContextMenu={handleContextMenu}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={`group flex h-7 cursor-pointer items-center gap-1 rounded-md pr-2 text-sm ${
          isActive
            ? 'bg-(--color-accent) text-(--color-accent-fg)'
            : 'text-(--color-text) hover:bg-(--color-bg-inset)'
        }`}
      >
        {node.isDirectory ? (
          <ChevronRight
            size={13}
            className={`shrink-0 text-(--color-text-muted) transition-transform ${isExpanded ? 'rotate-90' : ''} ${isActive ? 'text-(--color-accent-fg)' : ''}`}
          />
        ) : (
          <span className="w-[13px] shrink-0" />
        )}
        {node.isDirectory ? (
          isExpanded ? (
            <FolderOpen size={15} className="shrink-0 text-amber-500" />
          ) : (
            <Folder size={15} className="shrink-0 text-amber-500" />
          )
        ) : node.isMarkdown ? (
          <FileText
            size={15}
            className={`shrink-0 ${isActive ? 'text-(--color-accent-fg)' : 'text-(--color-accent)'}`}
          />
        ) : (
          <FileIcon size={15} className="shrink-0 text-(--color-text-muted)" />
        )}
        {isRenaming ? (
          <InlineInput
            initialValue={node.name}
            selectBeforeExtension={!node.isDirectory}
            onSubmit={async (value) => {
              if (value !== node.name) await renamePath(node.path, value, node.isDirectory)
              setRenaming(null)
            }}
            onCancel={() => setRenaming(null)}
          />
        ) : (
          <span className="truncate select-none">{node.name}</span>
        )}
      </div>

      {node.isDirectory && isExpanded && (
        <div>
          {creating && creating.dirPath === node.path && (
            <NewEntryRow depth={depth + 1} dirPath={node.path} type={creating.type} />
          )}
          {children?.map((child) => (
            <FileTreeItem key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function NewEntryRow({
  depth,
  dirPath,
  type
}: {
  depth: number
  dirPath: string
  type: 'file' | 'folder'
}): React.JSX.Element {
  const createFile = useAppStore((s) => s.createFile)
  const createFolder = useAppStore((s) => s.createFolder)
  const { setCreating } = useTreeUI()

  return (
    <div
      style={{ paddingLeft: 8 + depth * 14 }}
      className="flex h-7 items-center gap-1 pr-2 text-sm"
    >
      <span className="w-[13px] shrink-0" />
      {type === 'folder' ? (
        <Folder size={15} className="shrink-0 text-amber-500" />
      ) : (
        <FileText size={15} className="shrink-0 text-(--color-accent)" />
      )}
      <InlineInput
        placeholder={type === 'file' ? 'name.md' : 'folder name'}
        onSubmit={async (value) => {
          if (type === 'file') await createFile(dirPath, value)
          else await createFolder(dirPath, value)
          setCreating(null)
        }}
        onCancel={() => setCreating(null)}
      />
    </div>
  )
}
