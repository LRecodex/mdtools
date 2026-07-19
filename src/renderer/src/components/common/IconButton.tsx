import type { ButtonHTMLAttributes } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  label: string
}

export default function IconButton({
  active,
  label,
  className = '',
  children,
  ...rest
}: IconButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`app-region-no-drag flex h-7 w-7 items-center justify-center rounded-md text-(--color-text-muted) transition-colors hover:bg-(--color-bg-inset) hover:text-(--color-text) disabled:pointer-events-none disabled:opacity-40 ${
        active ? 'bg-(--color-bg-inset) text-(--color-text)' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
