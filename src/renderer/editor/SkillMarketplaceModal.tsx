import React, { useEffect, useState } from 'react'
import { Search, Download, Check, Sparkles, X, Loader2, Layers } from 'lucide-react'

export interface SkillMarketplaceModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SkillItem {
  slug: string
  name?: string
  description?: string
  owner?: string
  installed?: boolean
}

export function SkillMarketplaceModal({ isOpen, onClose }: SkillMarketplaceModalProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SkillItem[]>([])
  const [installing, setInstalling] = useState<string | null>(null)
  const [installedSlugs, setInstalledSlugs] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!isOpen) return
    void loadInstalledSkills()
  }, [isOpen])

  const loadInstalledSkills = async () => {
    try {
      const res = await window.electronAPI.skillsList({ source: 'all' })
      if (Array.isArray(res)) {
        const slugs = new Set(res.map((s: any) => s.key || s.name || s.slug))
        setInstalledSlugs(slugs)
      }
    } catch {
      // ignore
    }
  }

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    setNotice('')
    try {
      const res = await window.electronAPI.clawhubSearch({ query: query.trim(), limit: 20 })
      if (res.ok && res.results) {
        setResults(res.results)
      } else {
        setNotice(res.message || 'No skills found matching search query.')
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Marketplace search failed.')
    } finally {
      setLoading(false)
    }
  }

  const installSkill = async (slug: string) => {
    setInstalling(slug)
    setNotice('')
    try {
      const res = await window.electronAPI.clawhubInstall({ skillRef: slug })
      if (res.ok) {
        setInstalledSlugs((prev) => new Set([...prev, slug]))
        setNotice(`Skill "${slug}" installed successfully!`)
      } else {
        setNotice(res.message || `Failed to install ${slug}.`)
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Skill installation failed.')
    } finally {
      setInstalling(null)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-[min(680px,94vw)] rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--color-accent-strong)]" />
            <h2 className="text-sm font-semibold">ClawHub Skill & Extension Marketplace</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[var(--color-ink-2)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search AI skills (e.g. git, refactor, typescript, react, docker)..."
              className="w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper)] pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[var(--color-accent-strong)]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex h-8 items-center gap-1 rounded bg-[var(--color-accent-strong)] px-3 text-xs text-white disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            <span>Search</span>
          </button>
        </form>

        {notice && (
          <div className="mb-3 rounded border border-[var(--color-rule)] bg-[var(--color-paper-3)] p-2 text-xs text-[var(--color-ink)]">
            {notice}
          </div>
        )}

        <div className="flex-1 overflow-y-auto workbench-scroll space-y-2 pr-1 min-h-[240px]">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-xs text-[var(--color-ink-2)]">
              <Layers className="h-8 w-8 mb-2 text-[var(--color-rule)]" />
              <span>Search ClawHub for AI skills to extend OpenClaw Agent capabilities.</span>
            </div>
          ) : (
            results.map((skill) => {
              const isInstalled = installedSlugs.has(skill.slug)
              const isBusy = installing === skill.slug
              return (
                <div
                  key={skill.slug}
                  className="flex items-center justify-between gap-3 p-3 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-[var(--color-paper-4)] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs font-semibold">{skill.name || skill.slug}</strong>
                      {skill.owner && <span className="text-[10px] text-[var(--color-ink-2)]">by @{skill.owner}</span>}
                    </div>
                    <p className="mt-1 text-xs text-[var(--color-ink-2)] line-clamp-2">{skill.description || 'No description provided.'}</p>
                  </div>
                  <button
                    type="button"
                    disabled={isInstalled || isBusy}
                    onClick={() => void installSkill(skill.slug)}
                    className={`flex h-7 shrink-0 items-center gap-1 px-2.5 text-xs rounded transition-colors ${
                      isInstalled
                        ? 'bg-[var(--color-paper-3)] text-[var(--color-success)]'
                        : 'bg-[var(--color-accent-strong)] text-white hover:bg-[var(--color-accent)]'
                    } disabled:opacity-70`}
                  >
                    {isBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isInstalled ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Installed
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" /> Install
                      </>
                    )}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
