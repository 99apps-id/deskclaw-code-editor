import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, ShieldCheck, Smartphone, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ShellLayout } from './ShellLayout'
import type { DevicePairingRequest } from '../../shared/types'

export interface DevicePairingViewProps {
  onBack?: () => void
}

function defaultNavigateBack() {
  window.location.hash = '#settings'
}

function formatTimestamp(value: number | undefined, unknownLabel: string): string {
  if (!value || Number.isNaN(value)) return unknownLabel
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function DevicePairingView({ onBack }: DevicePairingViewProps = {}) {
  const { t } = useTranslation()
  const handleBack = onBack ?? defaultNavigateBack
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [pending, setPending] = useState<DevicePairingRequest[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const refresh = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.devicePairingList()
      setPending(result.pending)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('shell.devicePair.loadFailed'))
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => {
      void refresh(true)
    }, 10_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const pendingCount = pending.length
  const hasPending = pendingCount > 0

  const summaryText = useMemo(() => {
    if (hasPending) {
      return t('shell.devicePair.summaryPending', { count: pendingCount })
    }
    return t('shell.devicePair.summaryEmpty')
  }, [hasPending, pendingCount, t])

  const handleApprove = async (request: DevicePairingRequest) => {
    const requestId = request.requestId
    setBusyKey(`approve:${requestId}`)
    setNotice(null)
    setError(null)
    try {
      await window.electronAPI.devicePairingApprove({ requestId })
      setNotice(t('shell.devicePair.approved', { displayName: request.displayName || request.deviceId }))
      await refresh(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('shell.devicePair.approveFailed'))
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <ShellLayout title={t('shell.devicePair.title')} onBack={handleBack}>
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{t('shell.devicePair.title')}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t('shell.devicePair.subtitle')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refresh(true)} disabled={refreshing || loading}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {t('shell.devicePair.refresh')}
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
            <Smartphone className={`w-4 h-4 mt-0.5 ${hasPending ? 'text-amber-600' : 'text-muted-foreground'}`} />
            <p className="text-sm font-medium">{summaryText}</p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
            <QrCode className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t('shell.devicePair.qrHint')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('shell.devicePair.qrHintDesc')}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  window.location.hash = '#settings'
                  // Navigate to Control UI /nodes for QR code
                  window.setTimeout(() => {
                    window.location.hash = ''
                  }, 100)
                }}
              >
                <QrCode className="w-3.5 h-3.5" />
                {t('shell.devicePair.openNodesQR')}
              </Button>
            </div>
          </div>
        </header>

        {notice && (
          <section className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            {notice}
          </section>
        )}

        {error && (
          <section className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </section>
        )}

        <section className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">{t('shell.devicePair.pendingTitle')}</h2>
              <p className="text-xs text-muted-foreground mt-1">{t('shell.devicePair.pendingDesc')}</p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{pendingCount}</span>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">{t('shell.devicePair.loadingPending')}</p>
          ) : pendingCount === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
              {t('shell.devicePair.noPending')}
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((request) => (
                <article key={request.requestId} className="rounded-lg border border-border px-4 py-3 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-medium">
                        {request.displayName || request.deviceId || t('shell.devicePair.unknownDevice')}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">
                          {t('shell.devicePair.deviceIdLabel')}: {request.deviceId}
                        </span>
                        {request.platform && (
                          <span>
                            {t('shell.devicePair.platformLabel')}: {request.platform}
                          </span>
                        )}
                        {request.remoteIp && (
                          <span>
                            {t('shell.devicePair.remoteIpLabel')}: {request.remoteIp}
                          </span>
                        )}
                        <span>
                          {t('shell.devicePair.requested')}: {formatTimestamp(request.ts, t('shell.devicePair.unknownTime'))}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleApprove(request)}
                        disabled={busyKey === `approve:${request.requestId}`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        {busyKey === `approve:${request.requestId}`
                          ? t('shell.devicePair.approving')
                          : t('shell.devicePair.approve')}
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </ShellLayout>
  )
}
