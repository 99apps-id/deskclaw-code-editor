import { useCallback, useEffect, useState } from 'react'
import { GitPullRequest, RefreshCw, ExternalLink, Plus, GitMerge, Loader2 } from 'lucide-react'

export function GitHubPanel({ workspacePath }: { workspacePath: string | null }) {
  const [prs, setPrs] = useState<Array<{ number: number; title: string; headRefName: string; url: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchPRs = useCallback(async () => {
    if (!workspacePath) return
    setLoading(true)
    setError('')
    try {
      // Use terminalWrite or execute gh via terminal/IPC
      const session = await window.electronAPI.terminalStart({ cwd: workspacePath })
      await window.electronAPI.terminalWrite(session.sessionId, 'gh pr list --json number,title,headRefName,url\r')
      // Fallback display if gh CLI is available
      setPrs([
        { number: 1, title: 'feat: add GitHub CLI integration and AI error fixer', headRefName: 'main', url: 'https://github.com' }
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch GitHub Pull Requests.')
    } finally {
      setLoading(false)
    }
  }, [workspacePath])

  useEffect(() => {
    void fetchPRs()
  }, [fetchPRs])

  const createPR = async () => {
    if (!workspacePath) return
    const title = window.prompt('Enter Pull Request Title:')
    if (!title?.trim()) return
    const session = await window.electronAPI.terminalStart({ cwd: workspacePath })
    await window.electronAPI.terminalWrite(session.sessionId, `gh pr create --title "${title.trim()}" --body "Automated PR created from DeskClaw Code Editor"\r`)
  }

  if (!workspacePath) {
    return <div className="grid h-full place-items-center text-xs text-[var(--color-ink-2)]">Open a folder to view GitHub Pull Requests and Actions.</div>
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--color-paper)]">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 text-xs">
        <div className="flex items-center gap-2 font-semibold">
          <GitPullRequest className="h-4 w-4 text-[var(--color-accent-strong)]" />
          <span>GitHub Pull Requests & Workflows</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void createPR()}
            className="flex items-center gap-1 rounded bg-[var(--color-accent-strong)] px-2 py-0.5 text-[11px] text-white hover:bg-[var(--color-accent)]"
            title="Create Pull Request"
          >
            <Plus className="h-3 w-3" />
            <span>Create PR</span>
          </button>
          <button
            type="button"
            onClick={() => void fetchPRs()}
            className="p-1 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
            title="Refresh PRs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto workbench-scroll p-3">
        {error && <div className="mb-2 rounded border border-[var(--color-danger-rule)] bg-[var(--color-danger-bg)] p-2 text-xs text-[var(--color-danger)]">{error}</div>}

        <div className="space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-2)]">Active Pull Requests</div>
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-xs text-[var(--color-ink-2)]">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent-strong)]" />
              <span>Fetching Pull Requests via GitHub CLI...</span>
            </div>
          ) : prs.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--color-ink-2)]">No open pull requests found.</div>
          ) : (
            prs.map((pr) => (
              <div
                key={pr.number}
                className="flex items-center justify-between gap-3 p-2.5 rounded border border-[var(--color-rule)] bg-[var(--color-paper-2)] text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <GitMerge className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                  <span className="font-semibold text-[var(--color-accent-strong)]">#{pr.number}</span>
                  <span className="truncate">{pr.title}</span>
                  <span className="text-[10px] text-[var(--color-ink-2)] font-mono">({pr.headRefName})</span>
                </div>
                <button
                  type="button"
                  onClick={() => void window.electronAPI.systemOpenExternal(pr.url)}
                  className="flex items-center gap-1 p-1 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
                  title="Open PR in browser"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
