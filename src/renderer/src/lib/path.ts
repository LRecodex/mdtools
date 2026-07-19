export function dirname(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '')
  const idx = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'))
  return idx <= 0 ? normalized : normalized.slice(0, idx)
}

export function basename(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '')
  const idx = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'))
  return idx === -1 ? normalized : normalized.slice(idx + 1)
}

export function join(...parts: string[]): string {
  const sep = parts[0]?.includes('\\') ? '\\' : '/'
  return parts
    .map((p, i) => (i === 0 ? p.replace(/[\\/]+$/, '') : p.replace(/^[\\/]+|[\\/]+$/g, '')))
    .join(sep)
}
