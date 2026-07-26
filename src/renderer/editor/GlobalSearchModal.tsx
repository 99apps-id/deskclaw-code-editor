import { useCallback, useEffect, useRef, useState } from 'react'
import { CaseSensitive, Replace, Search, X } from 'lucide-react'
import { FileTypeIcon } from './FileTypeIcon'

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
  workspacePath: string | null
  onOpenFile: (path: string) => void
}

interface MatchResult {
  filePath: string
  relative: string
  fileName: string
  lineNumber: number
  lineContent: string
  matchIndex: number
}

export function GlobalSearchModal({ isOpen, onClose, workspacePath, onOpenFile }: GlobalSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [replaceCount, setReplaceCount] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scanAndSearch = useCallback(async (dirPath: string, rootDir: string, query: string, isCase: boolean, depth = 0): Promise<MatchResult[]> => {
    if (depth > 5 || !query.trim()) return []
    try {
      const res = await window.electronAPI.editorListDir(dirPath)
      let results: MatchResult[] = []

      for (const item of res.items) {
        if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist' || item.name === 'out') {
          continue
        }
        if (item.isDirectory) {
          const subResults = await scanAndSearch(item.path, rootDir, query, isCase, depth + 1)
          results = results.concat(subResults)
        } else {
          // Read file and search lines
          try {
            const fileData = await window.electronAPI.editorReadFile(item.path)
            const lines = fileData.content.split('\n')
            const rel = item.path.startsWith(rootDir) ? item.path.slice(rootDir.length).replace(/^[/\\]/, '') : item.path
            lines.forEach((line, index) => {
              const target = isCase ? line : line.toLowerCase()
              const q = isCase ? query : query.toLowerCase()
              const matchIdx = target.indexOf(q)
              if (matchIdx !== -1) {
                results.push({
                  filePath: item.path,
                  relative: rel,
                  fileName: item.name,
                  lineNumber: index + 1,
                  lineContent: line.trim(),
                  matchIndex: matchIdx,
                })
              }
            })
          } catch {
            /* ignore binary or unreadable files */
          }
        }
        if (results.length >= 200) break // Limit max matches for performance
      }
      return results
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    setReplaceCount(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !workspacePath || !searchTerm.trim()) {
      setMatches([])
      return
    }

    let mounted = true
    setSearching(true)
    const timer = setTimeout(() => {
      scanAndSearch(workspacePath, workspacePath, searchTerm, caseSensitive).then((res) => {
        if (mounted) {
          setMatches(res)
          setSearching(false)
        }
      }).catch(() => {
        if (mounted) setSearching(false)
      })
    }, 250)

    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [searchTerm, caseSensitive, isOpen, scanAndSearch, workspacePath])

  const handleReplaceAll = async () => {
    if (!workspacePath || !searchTerm.trim() || matches.length === 0) return
    let count = 0
    // Group matches by file path
    const filePaths = Array.from(new Set(matches.map((m) => m.filePath)))
    for (const p of filePaths) {
      try {
        const fileData = await window.electronAPI.editorReadFile(p)
        const flags = caseSensitive ? 'g' : 'gi'
        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags)
        const newContent = fileData.content.replace(regex, replaceTerm)
        if (newContent !== fileData.content) {
          await window.electronAPI.editorWriteFile(p, newContent)
          count++
        }
      } catch {
        /* ignore write errors */
      }
    }
    setReplaceCount(count)
    // Re-run search
    const updated = await scanAndSearch(workspacePath, workspacePath, searchTerm, caseSensitive)
    setMatches(updated)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 bg-black/40 backdrop-blur-xs">
      <div className="w-[min(680px,92vw)] rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-3 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-2 mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Search className="h-4 w-4 text-[var(--color-accent-strong)]" />
            <span>Search in Files</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-1.5 rounded-[var(--radius-control)]">
            <Search className="h-3.5 w-3.5 text-[var(--color-ink-2)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search across all files (Ctrl+Shift+F)..."
              className="w-full bg-transparent text-xs text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-2)]"
            />
            <button
              type="button"
              onClick={() => setCaseSensitive((prev) => !prev)}
              className={`p-1 rounded text-xs transition-colors ${caseSensitive ? 'bg-[var(--color-accent)] text-[var(--color-ink)] font-bold' : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]'}`}
              title="Match Case"
            >
              <CaseSensitive className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowReplace((prev) => !prev)}
              className={`p-1 rounded text-xs transition-colors ${showReplace ? 'bg-[var(--color-accent)] text-[var(--color-ink)]' : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]'}`}
              title="Toggle Replace"
            >
              <Replace className="h-3.5 w-3.5" />
            </button>
          </div>

          {showReplace && (
            <div className="flex items-center gap-2 border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-1.5 rounded-[var(--radius-control)]">
              <Replace className="h-3.5 w-3.5 text-[var(--color-ink-2)] shrink-0" />
              <input
                type="text"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Replace with..."
                className="w-full bg-transparent text-xs text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-2)]"
              />
              <button
                type="button"
                onClick={() => void handleReplaceAll()}
                disabled={matches.length === 0}
                className="flex items-center gap-1 bg-[var(--color-accent-strong)] px-2 py-0.5 text-[11px] text-white rounded disabled:opacity-40"
              >
                Replace All
              </button>
            </div>
          )}
        </div>

        {replaceCount !== null && (
          <div className="mt-2 text-[11px] text-[var(--color-success)]">Replaced matches in {replaceCount} file(s).</div>
        )}

        <div className="mt-3 max-h-80 overflow-y-auto workbench-scroll border-t border-[var(--color-rule)] pt-2">
          {searching ? (
            <div className="p-4 text-center text-xs text-[var(--color-ink-2)]">Searching files…</div>
          ) : !searchTerm.trim() ? (
            <div className="p-4 text-center text-xs text-[var(--color-ink-2)]">Enter a search term to find occurrences across your project.</div>
          ) : matches.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--color-ink-2)]">No matches found for &quot;{searchTerm}&quot;.</div>
          ) : (
            <div className="space-y-1">
              <div className="px-2 text-[10px] text-[var(--color-ink-2)] uppercase font-semibold">Found {matches.length} match(es)</div>
              {matches.map((match, idx) => (
                <button
                  key={`${match.filePath}:${match.lineNumber}:${idx}`}
                  type="button"
                  onClick={() => {
                    onOpenFile(match.filePath)
                    onClose()
                  }}
                  className="flex w-full items-center justify-between gap-3 px-2 py-1.5 text-left text-xs rounded hover:bg-[var(--color-paper-3)] transition-colors group"
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <FileTypeIcon name={match.fileName} />
                    <span className="font-mono text-[11px] text-[var(--color-accent-strong)] shrink-0">L{match.lineNumber}:</span>
                    <span className="truncate text-[var(--color-ink)]">{match.lineContent}</span>
                  </div>
                  <span className="text-[10px] opacity-60 font-[var(--font-code)] truncate shrink-0 max-w-[200px]">
                    {match.relative}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
