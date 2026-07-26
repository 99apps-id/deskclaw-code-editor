import { ChevronRight, Folder } from 'lucide-react'
import { FileTypeIcon } from './FileTypeIcon'

interface BreadcrumbNavProps {
  filePath: string | null
  onOpenParent?: (path: string) => void
}

export function BreadcrumbNav({ filePath, onOpenParent }: BreadcrumbNavProps) {
  if (!filePath) return null

  // Normalize path separators
  const parts = filePath.split(/[/\\]/).filter(Boolean)
  if (parts.length === 0) return null

  const fileName = parts[parts.length - 1]
  const directoryParts = parts.slice(0, parts.length - 1)

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex h-7 w-full items-center gap-1 border-b border-[var(--color-rule)] bg-[var(--color-paper)] px-3 text-xs text-[var(--color-ink-2)] overflow-x-auto whitespace-nowrap scrollbar-none"
    >
      {directoryParts.map((part, index) => {
        const currentPath = parts.slice(0, index + 1).join('/')
        return (
          <div key={`${part}-${index}`} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOpenParent?.(currentPath)}
              className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] transition-colors"
            >
              <Folder className="h-3.5 w-3.5 text-[var(--color-warning)]" />
              <span>{part}</span>
            </button>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
          </div>
        )
      })}
      <div className="flex items-center gap-1 font-medium text-[var(--color-ink)]">
        <FileTypeIcon name={fileName} />
        <span>{fileName}</span>
      </div>
    </nav>
  )
}
