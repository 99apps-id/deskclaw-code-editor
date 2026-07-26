import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

type MemoryTab = 'preferences' | 'memory' | 'soul'

/**
 * Transparent Preferences / Memory editor (Command Code–style taste files).
 */
export function MemoryPreferencesSection() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<MemoryTab>('preferences')
  const [preferences, setPreferences] = useState('')
  const [memory, setMemory] = useState('')
  const [soul, setSoul] = useState('')
  const [workspaceDir, setWorkspaceDir] = useState('')
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    setBusy(true)
    setBanner(null)
    try {
      const snap = await window.electronAPI.workspaceMemoryRead()
      setWorkspaceDir(snap.workspaceDir)
      setPreferences(snap.preferences)
      setMemory(snap.memory)
      setSoul(snap.soul)
    } catch (e) {
      setBanner({
        kind: 'err',
        text: e instanceof Error ? e.message : t('shell.memory.loadFailed'),
      })
    } finally {
      setBusy(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const activeValue = tab === 'preferences' ? preferences : tab === 'memory' ? memory : soul
  const setActiveValue =
    tab === 'preferences' ? setPreferences : tab === 'memory' ? setMemory : setSoul

  const save = async () => {
    setBusy(true)
    setBanner(null)
    try {
      await window.electronAPI.workspaceMemoryWrite({ kind: tab, content: activeValue })
      setBanner({ kind: 'ok', text: t('shell.memory.saved') })
    } catch (e) {
      setBanner({
        kind: 'err',
        text: e instanceof Error ? e.message : t('shell.memory.saveFailed'),
      })
    } finally {
      setBusy(false)
    }
  }

  const appendFeedback = async () => {
    const text = feedback.trim()
    if (!text) return
    setBusy(true)
    setBanner(null)
    try {
      const result = await window.electronAPI.workspacePreferenceAppend({
        text,
        section: 'Corrections',
      })
      setFeedback('')
      setBanner({ kind: 'ok', text: t('shell.memory.feedbackSaved', { line: result.appended }) })
      await load()
      setTab('preferences')
    } catch (e) {
      setBanner({
        kind: 'err',
        text: e instanceof Error ? e.message : t('shell.memory.feedbackFailed'),
      })
    } finally {
      setBusy(false)
    }
  }

  const exportPack = async () => {
    setBusy(true)
    setBanner(null)
    try {
      const result = await window.electronAPI.workspaceExportAgentPack()
      setBanner({
        kind: 'ok',
        text: t('shell.memory.exportOk', { path: result.archivePath, count: result.files.length }),
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('shell.memory.exportFailed')
      if (/cancel/i.test(msg)) {
        setBanner(null)
      } else {
        setBanner({ kind: 'err', text: msg })
      }
    } finally {
      setBusy(false)
    }
  }

  const importPack = async () => {
    setBusy(true)
    setBanner(null)
    try {
      const result = await window.electronAPI.workspaceImportAgentPack()
      setBanner({
        kind: 'ok',
        text: t('shell.memory.importOk', { count: result.extracted.length }),
      })
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('shell.memory.importFailed')
      if (/cancel/i.test(msg)) {
        setBanner(null)
      } else {
        setBanner({ kind: 'err', text: msg })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-label={t('shell.memory.aria')}>
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">{t('shell.memory.title')}</h2>
        <p className="text-xs text-muted-foreground">{t('shell.memory.desc')}</p>
        {workspaceDir ? (
          <p className="text-[11px] font-mono text-muted-foreground break-all">{workspaceDir}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="memory-feedback">
          {t('shell.memory.feedbackLabel')}
        </label>
        <div className="flex gap-2">
          <input
            id="memory-feedback"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t('shell.memory.feedbackPlaceholder')}
            disabled={busy}
          />
          <Button type="button" size="sm" onClick={() => void appendFeedback()} disabled={busy || !feedback.trim()}>
            {t('shell.memory.feedbackBtn')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('shell.memory.feedbackHint')}</p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('shell.memory.tabsAria')}>
        {([
          ['preferences', t('shell.memory.tabPreferences')],
          ['memory', t('shell.memory.tabMemory')],
          ['soul', t('shell.memory.tabSoul')],
        ] as const).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={tab === id ? 'default' : 'outline'}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <textarea
        className="min-h-[220px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono leading-relaxed"
        value={activeValue}
        onChange={(e) => setActiveValue(e.target.value)}
        disabled={busy}
        aria-label={t('shell.memory.editorAria', { tab })}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void save()} disabled={busy}>
          {busy ? t('shell.memory.saving') : t('shell.memory.save')}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => void load()} disabled={busy}>
          {t('shell.memory.reload')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void window.electronAPI.workspaceOpenNotes()}
          disabled={busy}
        >
          {t('shell.memory.openNotes')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void exportPack()} disabled={busy}>
          {t('shell.memory.exportPack')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void importPack()} disabled={busy}>
          {t('shell.memory.importPack')}
        </Button>
      </div>

      {banner ? (
        <p
          className={`text-xs break-all ${banner.kind === 'ok' ? 'text-emerald-600' : 'text-destructive'}`}
          role="status"
        >
          {banner.text}
        </p>
      ) : null}
    </section>
  )
}
