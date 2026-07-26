/**
 * DeskClaw Code Editor — Debug Panel.
 * Embeds Chrome DevTools frontend for Node.js --inspect debugging.
 * In production, falls back to opening in the system browser.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bug, X, ExternalLink, Terminal } from 'lucide-react'

export interface DebugSessionInfo {
  sessionId: string
  filePath: string
  inspectPort: number
}

export function DebugPanel() {
  const { t } = useTranslation()
  const [session, setSession] = useState<DebugSessionInfo | null>(null)
  const [devtoolsUrl, setDevtoolsUrl] = useState<string | null>(null)
  const [output, setOutput] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'stopped'>('idle')
  const outputEndRef = useRef<HTMLDivElement>(null)

  // Scroll output to bottom
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [output])

  // Listen for debug events
  useEffect(() => {
    const unsubs: Array<() => void> = []
    const api = window.electronAPI

    if (api?.onDebugDevtoolsUrl) {
      unsubs.push(
        api.onDebugDevtoolsUrl((sessionId: string, url: string) => {
          setDevtoolsUrl(url)
          setStatus('running')
        }),
      )
    }

    if (api?.onDebugOutput) {
      unsubs.push(
        api.onDebugOutput((sessionId: string, text: string) => {
          setOutput((prev) => [...prev, text])
        }),
      )
    }

    if (api?.onDebugExit) {
      unsubs.push(
        api.onDebugExit((sessionId: string, code: number) => {
          setStatus('stopped')
          setOutput((prev) => [...prev, `\n[Process exited with code ${code}]\n`])
        }),
      )
    }

    return () => unsubs.forEach((fn) => fn())
  }, [])

  const stopDebug = useCallback(async () => {
    if (!session) return
    try {
      await window.electronAPI.debugStop(session.sessionId)
    } catch { /* ignore */ }
    setSession(null)
    setDevtoolsUrl(null)
    setOutput([])
    setStatus('idle')
  }, [session])

  const openInBrowser = useCallback(() => {
    if (!devtoolsUrl) return
    // Convert devtools:// to chrome://inspect or open in default browser
    const api = window.electronAPI
    if (api?.systemOpenExternal) {
      // Use http://localhost:PORT/json which redirects to devtools
      const httpUrl = `http://127.0.0.1:${session?.inspectPort}/json`
      api.systemOpenExternal(httpUrl).catch(() => {
        // Fallback: open chrome://inspect
        api.systemOpenExternal('chrome://inspect').catch(() => {})
      })
    }
  }, [devtoolsUrl, session])

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--color-paper)] text-[var(--color-ink-2)]">
        <div className="flex flex-col items-center gap-3">
          <Bug className="w-12 h-12 opacity-20" />
          <p className="text-sm">{t('debug.noSession', 'No active debug session')}</p>
          <p className="text-xs opacity-60">{t('debug.hint', 'Use Debug button in editor toolbar to start')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[var(--color-paper)] text-[var(--color-ink)]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-green-500" />
          <span className="text-xs font-medium text-foreground">
            {t('debug.debugging', 'Debugging')}
          </span>
          <span className="text-xs text-muted-foreground max-w-[200px] truncate">
            {session.filePath.split(/[/\\]/).pop()}
          </span>
          {status === 'starting' && (
            <span className="text-xs text-yellow-500 animate-pulse">{t('debug.starting', 'Starting…')}</span>
          )}
          {status === 'running' && (
            <span className="text-xs text-green-500">{t('debug.running', 'Running')}</span>
          )}
          {status === 'stopped' && (
            <span className="text-xs text-[var(--color-danger)]">{t('debug.stopped', 'Stopped')}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-1 text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
            title={t('debug.openInBrowser', 'Open DevTools in browser')}
            onClick={openInBrowser}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-1 text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
            title={t('debug.stop', 'Stop debugging')}
            onClick={stopDebug}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* DevTools webview */}
      {devtoolsUrl && (
        <div className="flex-1 min-h-0">
          <webview
            src={devtoolsUrl}
            className="w-full h-full"
            style={{ backgroundColor: 'var(--color-paper)' }}
          />
        </div>
      )}

      {/* Output console (shown while starting or when devtools not yet loaded) */}
      {(!devtoolsUrl || status === 'starting' || status === 'stopped') && (
        <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs text-[var(--color-ink)]">
          {output.length === 0 && status === 'starting' && (
            <div className="flex items-center gap-2 text-yellow-500 animate-pulse">
              <Terminal className="w-3 h-3" />
              {t('debug.waitingForDevtools', 'Waiting for DevTools connection…')}
            </div>
          )}
          {output.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {line}
            </div>
          ))}
          <div ref={outputEndRef} />
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 py-1 text-[11px] text-[var(--color-ink-2)]">
        <span>Port: {session.inspectPort}</span>
        <span>{session.filePath}</span>
      </div>
    </div>
  )
}
