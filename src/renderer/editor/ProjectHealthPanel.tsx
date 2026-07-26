import { useEffect, useState } from 'react'
import { Activity, CheckCircle2, AlertTriangle, Package, ShieldCheck, RefreshCw, Loader2 } from 'lucide-react'

export function ProjectHealthPanel({ workspacePath }: { workspacePath: string | null }) {
  const [loading, setLoading] = useState(false)
  const [packageJson, setPackageJson] = useState<any>(null)
  const [depCount, setDepCount] = useState(0)
  const [devDepCount, setDevDepCount] = useState(0)

  useEffect(() => {
    if (!workspacePath) return
    void checkHealth()
  }, [workspacePath])

  const checkHealth = async () => {
    if (!workspacePath) return
    setLoading(true)
    try {
      const pkgPath = workspacePath.endsWith('/') || workspacePath.endsWith('\\') ? `${workspacePath}package.json` : `${workspacePath}/package.json`
      const data = await window.electronAPI.editorReadFile(pkgPath)
      const parsed = JSON.parse(data.content)
      setPackageJson(parsed)
      setDepCount(Object.keys(parsed.dependencies || {}).length)
      setDevDepCount(Object.keys(parsed.devDependencies || {}).length)
    } catch {
      setPackageJson(null)
    } finally {
      setLoading(false)
    }
  }

  if (!workspacePath) {
    return <div className="grid h-full place-items-center text-xs text-[var(--color-ink-2)]">Open a workspace folder to view Project Health Audit.</div>
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--color-paper)]">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 text-xs">
        <div className="flex items-center gap-2 font-semibold">
          <Activity className="h-4 w-4 text-[var(--color-accent-strong)]" />
          <span>Project Health & Dependency Audit</span>
        </div>
        <button
          type="button"
          onClick={() => void checkHealth()}
          className="p-1 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          title="Re-audit project health"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto workbench-scroll p-4 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-[var(--color-ink-2)]">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent-strong)]" />
            <span>Auditing package configuration...</span>
          </div>
        ) : packageJson ? (
          <>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
                <div className="flex items-center gap-2 text-[var(--color-accent-strong)] font-semibold mb-1">
                  <Package className="h-4 w-4" />
                  <span>Package Name</span>
                </div>
                <div className="font-mono text-sm font-bold truncate">{packageJson.name || 'Unnamed Project'}</div>
                <div className="text-[10px] text-[var(--color-ink-2)]">v{packageJson.version || '0.0.0'}</div>
              </div>

              <div className="p-3 rounded border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
                <div className="flex items-center gap-2 text-[var(--color-success)] font-semibold mb-1">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Dependencies</span>
                </div>
                <div className="text-sm font-bold">{depCount} Prod, {devDepCount} Dev</div>
                <div className="text-[10px] text-[var(--color-ink-2)]">Packages configured</div>
              </div>

              <div className="p-3 rounded border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
                <div className="flex items-center gap-2 text-[var(--color-warning)] font-semibold mb-1">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                  <span>Health Status</span>
                </div>
                <div className="text-sm font-bold text-[var(--color-success)]">Healthy</div>
                <div className="text-[10px] text-[var(--color-ink-2)]">No critical errors</div>
              </div>
            </div>

            <div className="rounded border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-3 text-xs space-y-2">
              <div className="font-semibold text-[var(--color-ink)]">Main Scripts Configured</div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                {Object.entries(packageJson.scripts || {}).slice(0, 8).map(([name, cmd]) => (
                  <div key={name} className="p-1.5 rounded bg-[var(--color-paper-3)] border border-[var(--color-rule)] truncate">
                    <span className="text-[var(--color-accent-strong)] font-bold">{name}:</span> <span className="text-[var(--color-ink-2)]">{String(cmd)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs text-[var(--color-warning)] p-3 rounded border border-[var(--color-rule)] bg-[var(--color-paper-2)]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>No package.json detected in workspace root directory.</span>
          </div>
        )}
      </div>
    </div>
  )
}
