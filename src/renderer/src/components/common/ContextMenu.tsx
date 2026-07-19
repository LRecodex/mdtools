import { useEffect, useRef } from 'react'

export interface ContextMenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
  separatorBefore?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const maxLeft = typeof window !== 'undefined' ? window.innerWidth - 200 : x
  const maxTop = typeof window !== 'undefined' ? window.innerHeight - items.length * 30 - 16 : y

  return (
    <div
      ref={ref}
      className="text-select fixed z-50 min-w-[180px] rounded-lg border border-(--color-border) bg-(--color-bg-elevated) p-1 shadow-lg"
      style={{ left: Math.min(x, Math.max(maxLeft, 8)), top: Math.min(y, Math.max(maxTop, 8)) }}
    >
      {items.map((item, idx) => (
        <div key={idx}>
          {item.separatorBefore && <div className="my-1 h-px bg-(--color-border)" />}
          <button
            type="button"
            className={`block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-(--color-accent) hover:text-(--color-accent-fg) ${
              item.danger ? 'text-red-500 hover:bg-red-600 hover:text-white' : ''
            }`}
            onClick={() => {
              item.onSelect()
              onClose()
            }}
          >
            {item.label}
          </button>
        </div>
      ))}
    </div>
  )
}
