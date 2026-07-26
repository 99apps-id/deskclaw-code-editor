import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Check, GitBranch, Loader2, Minus, Plus, RefreshCw, Sparkles } from 'lucide-react'

type GitChange = { path: string; index: string; workingTree: string }
type GitState = {
  branch: string
  remote?: string
  ahead: number
  behind: number
  changes: GitChange[]
}

export function GitPanel({ workspacePath }: { workspacePath: string | null }) {
  const [state, setState] = useState<GitState | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [generating, setGenerating] = useState(false)

  const refresh = useCallback(async () => {
    if (!workspacePath) return
    try {
      setError('')
      setState(await window.electronAPI.gitStatus(workspacePath))
    } catch (nextError) {
      setState(null)
      setError(nextError instanceof Error ? nextError.message : 'This folder is not a Git repository.')
    }
  }, [workspacePath])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const act = async (operation: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await operation()
      await refresh()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Git operation failed.')
    } finally {
      setBusy(false)
    }
  }

  const generateCommitMessage = async () => {
    if (!state?.changes || state.changes.length === 0) {
      setError('No changes found in working tree.')
      return
    }
    setGenerating(true)
    setError('')
    try {
      const fileList = state.changes.map((c) => `${c.index !== ' ' ? '[staged]' : '[unstaged]'} ${c.path}`).join('\n')
      const prompt = `Write a concise conventional git commit message (e.g. feat: ..., fix: ..., refactor: ...) for these changed files:
${fileList}

Return ONLY the single-line commit message string.`

      const result = await window.electronAPI.agentChat({ message: prompt })
      if (result.ok && result.response) {
        setMessage(result.response.trim().replace(/^`+|`+$/g, ''))
      } else {
        setError(result.error || 'Failed to generate commit message.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  const switchBranch = async () => {
    if (!workspacePath) return
    const branchName = window.prompt('Enter branch name to checkout or create:', state?.branch ?? 'main')
    if (!branchName?.trim() || branchName.trim() === state?.branch) return
    try {
      const session = await window.electronAPI.terminalStart({ cwd: workspacePath })
      await window.electronAPI.terminalWrite(session.sessionId, `git checkout "${branchName.trim()}" || git checkout -b "${branchName.trim()}"\r`)
      setTimeout(() => void refresh(), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch branch.')
    }
  }

  if (!workspacePath) {
    return <div className="grid h-full place-items-center text-xs text-[var(--color-ink-2)]">Open a folder to use source control.</div>
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(220px,320px)_minmax(0,1fr)]">
      <div className="border-r border-[var(--color-rule)] p-2">
        <div className="mb-2 flex items-center gap-2 text-xs">
          <GitBranch className="h-3.5 w-3.5 text-[var(--color-accent-strong)]" />
          <button
            type="button"
            onClick={() => void switchBranch()}
            className="truncate font-semibold text-[var(--color-ink)] hover:text-[var(--color-accent-strong)] hover:underline"
            title="Click to switch or create branch"
          >
            {state?.branch ?? 'Source control'}
          </button>
          {state?.ahead ? <span>↑{state.ahead}</span> : null}
          {state?.behind ? <span>↓{state.behind}</span> : null}
          <button type="button" className="ml-auto p-1" onClick={() => void refresh()} title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="relative">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Commit message"
            rows={3}
            className="w-full resize-none p-2 text-xs border border-[var(--color-rule)] rounded"
          />
          <button
            type="button"
            disabled={generating || busy}
            onClick={() => void generateCommitMessage()}
            className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-[var(--color-paper-3)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-2)] hover:text-[var(--color-ink)] disabled:opacity-40"
            title="Generate commit message with OpenClaw AI"
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-[var(--color-accent-strong)]" />}
            <span>{generating ? 'AI' : 'AI Msg'}</span>
          </button>
        </div>
        <button
          type="button"
          disabled={busy || !message.trim()}
          onClick={() => void act(async () => {
            await window.electronAPI.gitCommit(workspacePath, message.trim())
            setMessage('')
          })}
          className="mt-2 flex h-7 w-full items-center justify-center gap-1 bg-[var(--color-accent-strong)] px-2 text-xs text-white disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" /> Commit staged
        </button>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <button type="button" disabled={busy} onClick={() => void act(() => window.electronAPI.gitPull(workspacePath))} className="flex h-7 items-center justify-center gap-1 bg-[var(--color-paper-3)] text-xs">
            <ArrowDown className="h-3.5 w-3.5" /> Pull
          </button>
          <button type="button" disabled={busy} onClick={() => void act(() => window.electronAPI.gitPush(workspacePath))} className="flex h-7 items-center justify-center gap-1 bg-[var(--color-paper-3)] text-xs">
            <ArrowUp className="h-3.5 w-3.5" /> Push
          </button>
        </div>
      </div>
      <div className="min-h-0 overflow-auto p-1">
        {error && <div className="m-2 border border-[var(--color-danger-rule)] bg-[var(--color-danger-bg)] p-2 text-xs text-[var(--color-danger)]">{error}</div>}
        {state?.changes.length === 0 && <div className="grid h-full place-items-center text-xs text-[var(--color-ink-2)]">Working tree clean</div>}
        {state?.changes.map((change) => {
          const staged = change.index !== ' ' && change.index !== '?'
          return (
            <div key={`${change.index}${change.workingTree}${change.path}`} className="group flex h-7 items-center gap-2 px-2 text-xs hover:bg-[var(--color-paper-3)]">
              <span className={`w-4 font-[var(--font-code)] ${staged ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
                {staged ? change.index : change.workingTree}
              </span>
              <span className="min-w-0 flex-1 truncate">{change.path}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void act(() => staged
                  ? window.electronAPI.gitUnstage(workspacePath, change.path)
                  : window.electronAPI.gitStage(workspacePath, change.path))}
                className="invisible p-1 group-hover:visible"
                title={staged ? 'Unstage' : 'Stage'}
              >
                {staged ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
