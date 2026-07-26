import { useCallback, useEffect, useRef, useState } from 'react'
import { Columns, Maximize2, Minimize2, Plus, Terminal, X } from 'lucide-react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface TerminalSession {
  id: string
  title: string
}

interface TerminalPanelProps {
  onEmpty?: () => void
}

function terminalTheme() {
  const light = document.documentElement.classList.contains('light')
  return light
    ? { background: '#f7f8fb', foreground: '#273043', cursor: '#3157b7', selectionBackground: '#cbdcff' }
    : { background: '#17191f', foreground: '#d9dce5', cursor: '#d9dce5', selectionBackground: '#294b7a' }
}

export function TerminalPanel({ onEmpty }: TerminalPanelProps) {
  const [sessions, setSessions] = useState<TerminalSession[]>([{ id: crypto.randomUUID(), title: 'terminal' }])
  const [activeSession, setActiveSession] = useState('')
  const [maximized, setMaximized] = useState(false)
  const [splitTerminal, setSplitTerminal] = useState(false)
  const activeRef = useRef(activeSession)
  const terminals = useRef<Record<string, XTerm>>({})
  const fitAddons = useRef<Record<string, FitAddon>>({})
  const shells = useRef<Record<string, string>>({})
  const pendingInput = useRef<Record<string, string[]>>({})
  const observers = useRef<Record<string, ResizeObserver>>({})

  activeRef.current = activeSession || sessions[0]?.id || ''

  useEffect(() => {
    if (!activeSession && sessions[0]) setActiveSession(sessions[0].id)
  }, [activeSession, sessions])

  const fit = useCallback((id: string) => {
    const addon = fitAddons.current[id]
    const terminal = terminals.current[id]
    if (!addon || !terminal) return
    try {
      addon.fit()
      const shell = shells.current[id]
      if (shell) void window.electronAPI.terminalResize(shell, terminal.cols, terminal.rows)
    } catch {
      // Hidden or detached terminal.
    }
  }, [])

  const mountTerminal = useCallback((id: string, element: HTMLDivElement | null) => {
    if (!element || terminals.current[id]) return
    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
      theme: terminalTheme(),
      allowTransparency: false,
    })
    const addon = new FitAddon()
    terminal.loadAddon(addon)
    terminal.open(element)
    terminals.current[id] = terminal
    fitAddons.current[id] = addon
    terminal.onData((data) => {
      const shell = shells.current[id]
      if (shell) {
        void window.electronAPI.terminalWrite(shell, data)
      } else {
        pendingInput.current[id] = [...(pendingInput.current[id] ?? []), data]
      }
    })
    const observer = new ResizeObserver(() => fit(id))
    observer.observe(element)
    observers.current[id] = observer
    void window.electronAPI.terminalStart().then((result) => {
      if (!terminals.current[id]) {
        void window.electronAPI.terminalKill(result.sessionId)
        return
      }
      shells.current[id] = result.sessionId
      const queuedInput = pendingInput.current[id]?.join('') ?? ''
      delete pendingInput.current[id]
      if (queuedInput) void window.electronAPI.terminalWrite(result.sessionId, queuedInput)
      fit(id)
      terminal.focus()
    }).catch((error) => terminal.writeln(`\x1b[31mCould not start terminal: ${String(error)}\x1b[0m`))
  }, [fit])

  useEffect(() => {
    const shellMap = shells.current
    const observerMap = observers.current
    const terminalMap = terminals.current
    const offData = window.electronAPI.onTerminalData((shellId, data) => {
      const id = Object.keys(shells.current).find((key) => shells.current[key] === shellId)
      if (id) terminals.current[id]?.write(data)
    })
    const offExit = window.electronAPI.onTerminalExit((shellId, code) => {
      const id = Object.keys(shells.current).find((key) => shells.current[key] === shellId)
      if (id) {
        terminals.current[id]?.writeln(`\r\n\x1b[33mProcess exited with code ${code}\x1b[0m`)
        delete shells.current[id]
      }
    })
    const updateTheme = () => Object.values(terminals.current).forEach((terminal) => { terminal.options.theme = terminalTheme() })
    document.documentElement.addEventListener('deskclaw-theme-change', updateTheme)
    return () => {
      offData()
      offExit()
      document.documentElement.removeEventListener('deskclaw-theme-change', updateTheme)
      Object.values(shellMap).forEach((shell) => { void window.electronAPI.terminalKill(shell) })
      Object.values(observerMap).forEach((observer) => observer.disconnect())
      Object.values(terminalMap).forEach((terminal) => terminal.dispose())
      shells.current = {}
      observers.current = {}
      terminals.current = {}
      fitAddons.current = {}
      pendingInput.current = {}
    }
  }, [])

  const addSession = () => {
    const id = crypto.randomUUID()
    setSessions((current) => [...current, { id, title: `terminal ${current.length + 1}` }])
    setActiveSession(id)
  }

  const closeSession = async (id: string) => {
    const shell = shells.current[id]
    delete shells.current[id]
    if (shell) await window.electronAPI.terminalKill(shell).catch(() => ({ ok: false }))
    observers.current[id]?.disconnect()
    terminals.current[id]?.dispose()
    delete observers.current[id]
    delete terminals.current[id]
    delete fitAddons.current[id]
    delete pendingInput.current[id]
    setSessions((current) => {
      const index = current.findIndex((session) => session.id === id)
      const next = current.filter((session) => session.id !== id)
      if (activeRef.current === id) setActiveSession(next[Math.max(0, index - 1)]?.id ?? '')
      if (next.length === 0) queueMicrotask(() => onEmpty?.())
      return next
    })
  }

  return (
    <div className={`flex min-h-0 flex-col bg-[var(--color-paper)] ${maximized ? 'h-[70vh]' : 'h-full'}`}>
      <div className="flex h-8 shrink-0 items-center border-b border-[var(--color-rule)] bg-[var(--color-paper-2)]">
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {sessions.map((session) => (
            <button key={session.id} type="button" onClick={() => setActiveSession(session.id)}
              className={`group flex h-8 items-center gap-1.5 border-r border-[var(--color-rule)] px-2.5 text-xs ${session.id === activeRef.current ? 'bg-[var(--color-paper)] text-[var(--color-ink)]' : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]'}`}>
              <Terminal className="h-3.5 w-3.5" />
              <span>{session.title}</span>
              <span role="button" tabIndex={0} aria-label={`Close ${session.title}`} title="Close terminal"
                onClick={(event) => { event.stopPropagation(); void closeSession(session.id) }}
                onKeyDown={(event) => { if (event.key === 'Enter') void closeSession(session.id) }}
                className="ml-1 grid h-5 w-5 place-items-center rounded opacity-70 hover:bg-[var(--color-paper-3)] group-hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 mx-2 border-l border-r border-[var(--color-rule)] px-2">
          <button
            type="button"
            onClick={() => {
              const shell = shells.current[activeRef.current]
              if (shell) void window.electronAPI.terminalWrite(shell, 'pnpm dev\r')
            }}
            className="rounded bg-[var(--color-paper-3)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
            title="Run pnpm dev"
          >
            pnpm dev
          </button>
          <button
            type="button"
            onClick={() => {
              const shell = shells.current[activeRef.current]
              if (shell) void window.electronAPI.terminalWrite(shell, 'pnpm build\r')
            }}
            className="rounded bg-[var(--color-paper-3)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
            title="Run pnpm build"
          >
            pnpm build
          </button>
          <button
            type="button"
            onClick={() => {
              const shell = shells.current[activeRef.current]
              if (shell) void window.electronAPI.terminalWrite(shell, 'git status\r')
            }}
            className="rounded bg-[var(--color-paper-3)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
            title="Run git status"
          >
            git status
          </button>
          <button
            type="button"
            onClick={() => {
              const shell = shells.current[activeRef.current]
              if (shell) void window.electronAPI.terminalWrite(shell, 'clear\r')
            }}
            className="rounded bg-[var(--color-paper-3)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
            title="Clear terminal"
          >
            clear
          </button>
        </div>
        <select
          aria-label="Select default shell profile"
          defaultValue="powershell"
          className="mx-1 h-6 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-1 text-[11px] text-[var(--color-ink-2)] outline-none"
        >
          <option value="powershell">PowerShell</option>
          <option value="cmd">Command Prompt</option>
          <option value="bash">Git Bash</option>
        </select>
        <button type="button" onClick={() => setSplitTerminal((prev) => !prev)} title={splitTerminal ? 'Single Terminal' : 'Split Terminal Side-by-Side'} className={`grid h-8 w-8 place-items-center ${splitTerminal ? 'text-[var(--color-accent-strong)]' : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]'}`}>
          <Columns className="h-4 w-4" />
        </button>
        <button type="button" onClick={addSession} title="New terminal" className="grid h-8 w-8 place-items-center text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"><Plus className="h-4 w-4" /></button>
        <button type="button" onClick={() => setMaximized((value) => !value)} title={maximized ? 'Restore panel' : 'Maximize panel'} className="grid h-8 w-8 place-items-center text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">
          {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
      <div className={`min-h-0 flex-1 ${splitTerminal ? 'flex divide-x divide-[var(--color-rule)]' : ''}`}>
        {sessions.map((session, index) => {
          const isActive = session.id === activeRef.current
          const isSecondary = splitTerminal && sessions.length > 1 && (isActive ? index === 0 ? 1 : 0 : index === 0)
          const visible = isActive || isSecondary
          return (
            <div
              key={session.id}
              ref={(element) => mountTerminal(session.id, element)}
              className={`terminal-host h-full p-1 ${splitTerminal ? (visible ? 'flex-1 block' : 'hidden') : (isActive ? 'block flex-1' : 'hidden')}`}
              onPointerDown={() => terminals.current[session.id]?.focus()}
            />
          )
        })}
      </div>
    </div>
  )
}
