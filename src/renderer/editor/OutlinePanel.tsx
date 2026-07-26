import { useMemo } from 'react'
import { Code2, FunctionSquare, ListTree, Variable, X } from 'lucide-react'

export interface SymbolItem {
  id: string
  name: string
  kind: 'function' | 'class' | 'interface' | 'variable'
  line: number
}

interface OutlinePanelProps {
  content: string
  language: string
  onSelectSymbol: (line: number) => void
  onClose: () => void
}

export function OutlinePanel({ content, language: _language, onSelectSymbol, onClose }: OutlinePanelProps) {
  const symbols = useMemo(() => {
    const list: SymbolItem[] = []
    const lines = content.split('\n')

    lines.forEach((line, idx) => {
      const lineNum = idx + 1
      const trimmed = line.trim()

      // Function detection (JS/TS/Python)
      const funcMatch = trimmed.match(/(?:function|const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>|(?:async\s+)?function\s+([A-Za-z0-9_]+)|def\s+([A-Za-z0-9_]+)/)
      if (funcMatch) {
        const name = funcMatch[1] || funcMatch[2] || funcMatch[3]
        if (name) list.push({ id: `func-${lineNum}`, name, kind: 'function', line: lineNum })
        return
      }

      // Class / Interface detection
      const classMatch = trimmed.match(/(?:class|interface|type)\s+([A-Za-z0-9_]+)/)
      if (classMatch) {
        const kind = trimmed.startsWith('interface') || trimmed.startsWith('type') ? 'interface' : 'class'
        list.push({ id: `class-${lineNum}`, name: classMatch[1], kind, line: lineNum })
        return
      }

      // Exported constants
      const varMatch = trimmed.match(/^export\s+(?:const|let|var)\s+([A-Za-z0-9_]+)/)
      if (varMatch) {
        list.push({ id: `var-${lineNum}`, name: varMatch[1], kind: 'variable', line: lineNum })
      }
    })

    return list
  }, [content])

  return (
    <div className="flex h-full w-60 flex-col bg-[var(--color-paper-2)] border-l border-[var(--color-rule)] shrink-0 overflow-hidden">
      <div className="flex h-8 items-center justify-between border-b border-[var(--color-rule)] px-3 text-xs font-semibold text-[var(--color-ink-2)] bg-[var(--color-paper-2)] shrink-0">
        <div className="flex items-center gap-1.5">
          <ListTree className="h-4 w-4 text-[var(--color-accent-strong)]" />
          <span>Outline</span>
        </div>
        <button type="button" onClick={onClose} className="p-1 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto workbench-scroll p-1 space-y-0.5">
        {symbols.length === 0 ? (
          <div className="p-4 text-center text-xs text-[var(--color-ink-2)]">No symbols detected in file.</div>
        ) : (
          symbols.map((sym) => (
            <button
              key={sym.id}
              type="button"
              onClick={() => onSelectSymbol(sym.line)}
              className="flex w-full items-center justify-between gap-2 px-2 py-1 text-left text-xs rounded hover:bg-[var(--color-paper-3)] transition-colors group"
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                {sym.kind === 'function' ? (
                  <FunctionSquare className="h-3.5 w-3.5 text-[var(--color-warning)] shrink-0" />
                ) : sym.kind === 'class' || sym.kind === 'interface' ? (
                  <Code2 className="h-3.5 w-3.5 text-[var(--color-accent-strong)] shrink-0" />
                ) : (
                  <Variable className="h-3.5 w-3.5 text-[var(--color-success)] shrink-0" />
                )}
                <span className="truncate text-[var(--color-ink)] font-mono text-[11px]">{sym.name}</span>
              </div>
              <span className="text-[10px] opacity-60 font-mono shrink-0">L{sym.line}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
