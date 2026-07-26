import { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { FileTypeIcon } from './FileTypeIcon'

interface QuickOpenModalProps {
  isOpen: boolean
  onClose: () => void
  workspacePath: string | null
  onOpenFile: (path: string) => void
}

interface QuickFileItem {
  name: string
  path: string
  relative: string
}

export function QuickOpenModal({ isOpen, onClose, workspacePath, onOpenFile }: QuickOpenModalProps) {
  const [query, setQuery] = useState('')
  const [fileList, setFileList] = useState<QuickFileItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const scanFiles = useCallback(async (dirPath: string, rootDir: string, depth = 0): Promise<QuickFileItem[]> => {
    if (depth > 5) return [] // Prevent deep recursive slowdowns
    try {
      const res = await window.electronAPI.editorListDir(dirPath)
      let items: QuickFileItem[] = []
      for (const item of res.items) {
        if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist' || item.name === 'out') {
          continue
        }
        const rel = item.path.startsWith(rootDir) ? item.path.slice(rootDir.length).replace(/^[/\\]/, '') : item.path
        if (item.isDirectory) {
          const subItems = await scanFiles(item.path, rootDir, depth + 1)
          items = items.concat(subItems)
        } else {
          items.push({ name: item.name, path: item.path, relative: rel })
        }
      }
      return items
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    if (!isOpen || !workspacePath) return
    setQuery('')
    setSelectedIndex(0)
    setLoading(true)
    let mounted = true

    scanFiles(workspacePath, workspacePath).then((files) => {
      if (mounted) {
        setFileList(files)
        setLoading(false)
      }
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [isOpen, scanFiles, workspacePath])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const filtered = fileList.filter((item) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return item.name.toLowerCase().includes(q) || item.relative.toLowerCase().includes(q)
  }).slice(0, 50)

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, filtered.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(0, prev - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = filtered[selectedIndex]
      if (target) {
        onOpenFile(target.path)
        onClose()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40 backdrop-blur-xs">
      <div className="w-[min(600px,90vw)] rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-2 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center gap-2 border-b border-[var(--color-rule)] px-3 py-2 bg-[var(--color-paper)] rounded-[var(--radius-control)]">
          <Search className="h-4 w-4 text-[var(--color-ink-2)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a file name to open... (e.g. App.tsx)"
            className="w-full bg-transparent text-xs text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-2)]"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="p-0.5 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="mt-2 max-h-80 overflow-y-auto workbench-scroll">
          {loading ? (
            <div className="p-4 text-center text-xs text-[var(--color-ink-2)]">Scanning workspace files…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--color-ink-2)]">No matching files found.</div>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  onOpenFile(item.path)
                  onClose()
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-xs rounded transition-colors ${
                  index === selectedIndex
                    ? 'bg-[var(--color-accent)] text-[var(--color-ink)] font-medium'
                    : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]'
                }`}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <FileTypeIcon name={item.name} />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="text-[10px] opacity-60 font-[var(--font-code)] truncate shrink-0 max-w-[240px]">
                  {item.relative}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
