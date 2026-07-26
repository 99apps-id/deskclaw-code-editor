import { useEffect, useRef, useState } from 'react'
import { Command, Search, X } from 'lucide-react'

export interface CommandItem {
  id: string
  label: string
  shortcut?: string
  category?: string
  action: () => void
}

interface CommandPaletteModalProps {
  isOpen: boolean
  onClose: () => void
  commands: CommandItem[]
}

export function CommandPaletteModal({ isOpen, onClose, commands }: CommandPaletteModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredCommands = commands.filter((cmd) => {
    const q = searchTerm.toLowerCase().trim()
    if (!q) return true
    return cmd.label.toLowerCase().includes(q) || (cmd.category && cmd.category.toLowerCase().includes(q))
  })

  useEffect(() => {
    if (!isOpen) return
    setSearchTerm('')
    setSelectedIndex(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [searchTerm])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (filteredCommands.length > 0 ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action()
        onClose()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 bg-black/40 backdrop-blur-xs">
      <div className="w-[min(640px,92vw)] rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-3 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-2 mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Command className="h-4 w-4 text-[var(--color-accent-strong)]" />
            <span>Command Palette</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-1.5 rounded-[var(--radius-control)]">
          <Search className="h-3.5 w-3.5 text-[var(--color-ink-2)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="w-full bg-transparent text-xs text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-2)]"
          />
        </div>

        <div className="mt-3 max-h-80 overflow-y-auto workbench-scroll border-t border-[var(--color-rule)] pt-2 space-y-0.5">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--color-ink-2)]">No matching commands found.</div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const selected = idx === selectedIndex
              return (
                <button
                  key={cmd.id}
                  type="button"
                  onClick={() => {
                    cmd.action()
                    onClose()
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs rounded transition-colors ${
                    selected ? 'bg-[var(--color-accent)] text-[var(--color-ink)] font-semibold' : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    {cmd.category && (
                      <span className="text-[10px] uppercase font-semibold text-[var(--color-accent-strong)] opacity-80 shrink-0">
                        [{cmd.category}]
                      </span>
                    )}
                    <span className="truncate">{cmd.label}</span>
                  </div>
                  {cmd.shortcut && (
                    <span className="text-[10px] font-mono opacity-70 border border-[var(--color-rule)] px-1.5 py-0.5 rounded shrink-0">
                      {cmd.shortcut}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
