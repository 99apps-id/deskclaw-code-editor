import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AgentModelDefaults, OpenClawConfig } from '../../shared/types'

function modelRefToString(value: string | AgentModelDefaults | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return typeof value.primary === 'string' ? value.primary : ''
}

/**
 * Update primary while preserving structured `{ primary, fallbacks, … }` when present.
 * Empty primary → undefined (caller deletes the key).
 */
function mergeModelRef(
  existing: string | AgentModelDefaults | undefined,
  primary: string,
): string | AgentModelDefaults | undefined {
  const trimmed = primary.trim()
  if (!trimmed) return undefined
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    const next: AgentModelDefaults = { ...existing, primary: trimmed }
    return next
  }
  return trimmed
}

/**
 * Configure agents.defaults.imageModel / pdfModel so Control UI attachments
 * (images, PDFs) are understood when the primary chat model is text-only.
 */
export function VisionModelSettingsSection() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imageModel, setImageModel] = useState('')
  const [pdfModel, setPdfModel] = useState('')
  const [autoImageModel, setAutoImageModel] = useState(true)
  const [autoPdfModel, setAutoPdfModel] = useState(true)
  const [restartGateway, setRestartGateway] = useState(true)
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const cfg = await window.electronAPI.configRead()
      const defaults = cfg?.agents?.defaults
      const imgRaw = modelRefToString(defaults?.imageModel)
      const pdfRaw = modelRefToString(defaults?.pdfModel)
      setImageModel(imgRaw)
      setPdfModel(pdfRaw)
      setAutoImageModel(!imgRaw)
      setAutoPdfModel(!pdfRaw)
    } catch (e) {
      setBanner({ kind: 'err', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = async () => {
    setSaving(true)
    setBanner(null)
    try {
      // Re-read immediately before write to reduce RMW races with other panels.
      const cfg = (await window.electronAPI.configRead()) as OpenClawConfig
      const prevDefaults = cfg.agents?.defaults ?? {}
      const nextDefaults: Record<string, unknown> = { ...prevDefaults }

      const effectiveImageModel = autoImageModel ? '' : imageModel
      const effectivePdfModel = autoPdfModel ? '' : pdfModel

      const nextImage = mergeModelRef(prevDefaults.imageModel, effectiveImageModel)
      if (nextImage === undefined) delete nextDefaults.imageModel
      else nextDefaults.imageModel = nextImage

      const nextPdf = mergeModelRef(prevDefaults.pdfModel, effectivePdfModel)
      if (nextPdf === undefined) delete nextDefaults.pdfModel
      else nextDefaults.pdfModel = nextPdf

      await window.electronAPI.configWrite({
        ...cfg,
        agents: {
          ...(cfg.agents ?? {}),
          defaults: nextDefaults as typeof prevDefaults,
        },
      })

      let restarted = false
      if (restartGateway) {
        try {
          await window.electronAPI.gatewayRestart()
          restarted = true
        } catch {
          /* config saved; restart best-effort */
        }
      }

      setBanner({
        kind: 'ok',
        text: restarted ? t('shell.vision.savedRestarted') : t('shell.vision.saved'),
      })
      await reload()
    } catch (e) {
      setBanner({ kind: 'err', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('shell.settings.loading')}</p>
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border p-4" aria-label={t('shell.vision.aria')}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold">{t('shell.vision.title')}</h2>
        <p className="text-xs text-muted-foreground">{t('shell.vision.desc')}</p>
      </div>

      <fieldset className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="vision-image-model">
          {t('shell.vision.imageModel')}
        </label>
        <div className="flex items-center gap-3">
          <Input
            id="vision-image-model"
            className="font-mono flex-1"
            value={autoImageModel ? '' : imageModel}
            onChange={(e) => setImageModel(e.target.value)}
            placeholder={autoImageModel ? t('shell.vision.autoPlaceholder') : 'openrouter/google/gemini-2.5-flash'}
            autoComplete="off"
            disabled={autoImageModel}
          />
          <label className="flex items-center gap-2 text-sm whitespace-nowrap cursor-pointer">
            <input
              type="checkbox"
              checked={autoImageModel}
              onChange={(e) => {
                setAutoImageModel(e.target.checked)
                if (e.target.checked) setImageModel('')
              }}
              className="rounded border-input"
            />
            <span className="text-xs">{t('shell.vision.autoUsePrimary')}</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">{t('shell.vision.imageModelHint')}</p>
      </fieldset>

      <fieldset className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="vision-pdf-model">
          {t('shell.vision.pdfModel')}
        </label>
        <div className="flex items-center gap-3">
          <Input
            id="vision-pdf-model"
            className="font-mono flex-1"
            value={autoPdfModel ? '' : pdfModel}
            onChange={(e) => setPdfModel(e.target.value)}
            placeholder={autoPdfModel ? t('shell.vision.autoPlaceholder') : t('shell.vision.pdfModelPlaceholder')}
            autoComplete="off"
            disabled={autoPdfModel}
          />
          <label className="flex items-center gap-2 text-sm whitespace-nowrap cursor-pointer">
            <input
              type="checkbox"
              checked={autoPdfModel}
              onChange={(e) => {
                setAutoPdfModel(e.target.checked)
                if (e.target.checked) setPdfModel('')
              }}
              className="rounded border-input"
            />
            <span className="text-xs">{t('shell.vision.autoUsePrimary')}</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">{t('shell.vision.pdfModelHint')}</p>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={restartGateway}
          onChange={(e) => setRestartGateway(e.target.checked)}
          className="rounded border-input"
        />
        {t('shell.vision.restartGateway')}
      </label>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? t('shell.vision.saving') : t('shell.vision.save')}
        </Button>
        {banner && (
          <p className={`text-xs ${banner.kind === 'ok' ? 'text-muted-foreground' : 'text-destructive'}`}>
            {banner.text}
          </p>
        )}
      </div>
    </section>
  )
}
