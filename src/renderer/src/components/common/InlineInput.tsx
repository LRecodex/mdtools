import { useEffect, useRef, useState } from 'react'

interface InlineInputProps {
  initialValue?: string
  placeholder?: string
  onSubmit: (value: string) => void | Promise<void>
  onCancel: () => void
  selectBeforeExtension?: boolean
}

export default function InlineInput({
  initialValue = '',
  placeholder,
  onSubmit,
  onCancel,
  selectBeforeExtension
}: InlineInputProps): React.JSX.Element {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  const committedRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    if (selectBeforeExtension && initialValue.includes('.')) {
      el.setSelectionRange(0, initialValue.lastIndexOf('.'))
    } else {
      el.select()
    }
  }, [initialValue, selectBeforeExtension])

  const commit = (): void => {
    if (committedRef.current) return
    const trimmed = value.trim()
    if (!trimmed) {
      committedRef.current = true
      onCancel()
      return
    }
    if (trimmed === '.' || trimmed === '..' || /[\\/:*?"<>|]/.test(trimmed)) {
      setError('Use a valid name without \\ / : * ? " < > or |')
      requestAnimationFrame(() => ref.current?.focus())
      return
    }
    committedRef.current = true
    Promise.resolve(onSubmit(trimmed)).catch((caught) => {
      committedRef.current = false
      const message = caught instanceof Error ? caught.message : String(caught)
      setError(message.includes('EEXIST') ? 'That name is already in use' : 'Could not save this name')
      requestAnimationFrame(() => ref.current?.focus())
    })
  }

  return (
    <input
      ref={ref}
      value={value}
      placeholder={placeholder}
      title={error ?? undefined}
      aria-invalid={Boolean(error)}
      onChange={(e) => {
        setValue(e.target.value)
        setError(null)
      }}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
        e.stopPropagation()
      }}
      className={`text-select w-full rounded border bg-(--color-bg) px-1 py-0.5 text-sm outline-none ${error ? 'border-red-500' : 'border-(--color-accent)'}`}
    />
  )
}
