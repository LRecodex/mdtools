import { useEffect, useRef, useState } from 'react'

interface InlineInputProps {
  initialValue?: string
  placeholder?: string
  onSubmit: (value: string) => void
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
  const ref = useRef<HTMLInputElement>(null)

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
    const trimmed = value.trim()
    if (trimmed) onSubmit(trimmed)
    else onCancel()
  }

  return (
    <input
      ref={ref}
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
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
      className="text-select w-full rounded border border-(--color-accent) bg-(--color-bg) px-1 py-0.5 text-sm outline-none"
    />
  )
}
