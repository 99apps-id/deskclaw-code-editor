import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

/**
 * Create OpenClaw state backup via bundled CLI (`openclaw backup create --verify`).
 */
export function BackupSettingsSection() {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const runBackup = async (onlyConfig: boolean) => {
    setBusy(true)
    setBanner(null)
    try {
      const result = await window.electronAPI.backupCreate({
        includeWorkspace: !onlyConfig,
        onlyConfig,
        verify: true,
      })
      setBanner({
        kind: 'ok',
        text: t('shell.backup.saved', {
          path: result.archivePath,
          count: result.assets?.length ?? 0,
        }),
      })
    } catch (e) {
      setBanner({
        kind: 'err',
        text: e instanceof Error ? e.message : t('shell.backup.failed'),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-label={t('shell.backup.aria')}>
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">{t('shell.backup.title')}</h2>
        <p className="text-xs text-muted-foreground">{t('shell.backup.desc')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void runBackup(false)} disabled={busy}>
          {busy ? t('shell.backup.working') : t('shell.backup.full')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void runBackup(true)}
          disabled={busy}
        >
          {t('shell.backup.configOnly')}
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
