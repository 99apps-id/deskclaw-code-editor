import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { LoadingView } from '@/shell/LoadingView'
import { EmbeddedShellLayout, type EmbeddedPanel } from '@/shell/EmbeddedShellLayout'
import { WizardLayout } from './wizard/WizardLayout'
import { syncNativeWindowTitle } from '@/i18n'
import type { GatewayStatusValue } from '../shared/types'
import { applyShellTheme } from './utils/theme'

function getHashRoute(): string {
  return window.location.hash.replace(/^#/, '')
}

const VALID_HASH_PANELS = new Set<string>([
  'settings',
  'about',
  'dashboard',
  'llm-api',
  'skills',
  'updates',
  'models',
  'ai-chat',
])

/** Map legacy hashes and drop unknown fragments (e.g. pasted gateway #token=…) so we don't open a bogus “panel”. */
function normalizeShellRoute(route: string): string {
  if (!route) return ''
  if (!VALID_HASH_PANELS.has(route)) return ''
  return route
}

function App() {
  const { t, i18n } = useTranslation()
  const [route, setRoute] = useState<string | null>(null)
  const [configExists, setConfigExists] = useState<boolean | null>(null)
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatusValue>('stopped')
  const [gatewayError, setGatewayError] = useState('')
  const [gatewayVerified, setGatewayVerified] = useState(false)
  const [gatewayAttempt, setGatewayAttempt] = useState(0)

  useEffect(() => {
    if (typeof window.electronAPI === 'undefined') return
    void window.electronAPI.shellGetConfig().then((config) => applyShellTheme(config.theme)).catch(() => {})
    window.electronAPI
      .configExists()
      .then((exists) => {
        setConfigExists(exists)
        if (!exists) {
          setRoute('wizard')
          return
        }
        setRoute(normalizeShellRoute(getHashRoute() || ''))
      })
      .catch((err) => {
        console.warn('[OpenClaw] configExists failed:', err)
        setConfigExists(false)
        setRoute('wizard')
      })
  }, [])

  useEffect(() => {
    if (configExists !== true) return
    let mounted = true
    let verifying = false
    setGatewayError('')
    setGatewayVerified(false)

    const verifyWhenReady = async () => {
      if (verifying || !mounted) return
      verifying = true
      setGatewayError('')
      for (let attempt = 0; mounted && attempt < 90; attempt += 1) {
        try {
          await window.electronAPI.gatewayVerify()
          if (mounted) {
            setGatewayStatus('running')
            setGatewayVerified(true)
            setGatewayError('')
          }
          verifying = false
          return
        } catch (error) {
          if (!mounted) return
          const message = error instanceof Error ? error.message : String(error)
          // Authentication/protocol failures will continue to be retried while
          // the gateway completes plugin and channel initialization.
          setGatewayError(`Gateway is running; waiting for RPC handshake (${message})`)
          await new Promise((resolve) => window.setTimeout(resolve, 2_000))
        }
      }
      verifying = false
      if (mounted) {
        setGatewayStatus('error')
        setGatewayError('OpenClaw started, but its RPC handshake did not become ready.')
      }
    }

    const ensureConnected = async () => {
      try {
        const status = await window.electronAPI.gatewayStatus()
        if (!mounted) return
        setGatewayStatus(status.status)
        if (status.status === 'running') {
          void verifyWhenReady()
        } else if (status.status !== 'starting') {
          await window.electronAPI.gatewayStart()
        }
      } catch (error) {
        if (!mounted) return
        setGatewayStatus('error')
        setGatewayError(error instanceof Error ? error.message : 'OpenClaw Gateway failed to start.')
      }
    }

    const unsubscribe = window.electronAPI.onGatewayStatusChange((status) => {
      if (!mounted) return
      setGatewayStatus(status.status)
      if (status.status === 'running') {
        setGatewayError('')
        void verifyWhenReady()
      } else {
        setGatewayVerified(false)
      }
      if (status.status === 'error') setGatewayError('OpenClaw Gateway exited before the workbench was ready.')
    })
    void ensureConnected()
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [configExists, gatewayAttempt])

  useEffect(() => {
    if (configExists !== true) return
    const handler = () => setRoute(normalizeShellRoute(getHashRoute() || ''))
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [configExists])

  const handlePanelChange = useCallback((panel: EmbeddedPanel) => {
    const hash = panel === '' ? '' : `#${panel}`
    if (window.location.hash !== hash) {
      window.location.hash = hash
    }
    setRoute(panel)
  }, [])

  /** Native title + document.title: wizard uses app name only (no "Setup Wizard" in the title bar). */
  useEffect(() => {
    if (route === null || configExists === null) {
      syncNativeWindowTitle(t('app.name'))
      return
    }
    if (route === 'wizard') {
      syncNativeWindowTitle(t('app.name'))
      return
    }
    if (configExists) {
      const panelTitles: Record<string, string> = {
        '': 'DeskClaw',
        dashboard: t('shell.dashboard.title'),
        settings: t('shell.settings.title'),
        about: t('shell.about.title'),
        'llm-api': t('shell.dashboard.llmApi'),
        skills: 'Skills',
        updates: t('shell.updates.title'),
        models: t('shell.models.title'),
        'ai-chat': 'AI Chat',
      }
      const segment = panelTitles[route] ?? t('shell.dashboard.title')
      syncNativeWindowTitle(`${segment} - ${t('app.name')}`)
    }
  }, [route, configExists, t, i18n.language])

  if (typeof window.electronAPI === 'undefined') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{t('shell.error.preloadTitle')}</h1>
        <p className="text-sm text-muted-foreground max-w-sm">{t('shell.error.preloadBody')}</p>
        <p className="text-xs text-muted-foreground max-w-sm">{t('shell.error.preloadHint')}</p>
      </main>
    )
  }

  if (route === null || configExists === null) {
    return <LoadingView statusText={t('shell.loading.checkingConfig')} />
  }
  if (route === 'wizard') return <WizardLayout />
  if (configExists && (gatewayStatus !== 'running' || !gatewayVerified)) {
    return (
      <LoadingView
        statusText={
          gatewayStatus === 'error'
            ? 'OpenClaw Gateway could not connect'
            : 'Connecting to OpenClaw Gateway…'
        }
        timedOut={gatewayStatus === 'error'}
        hintText={gatewayError || 'DeskClaw will open after the local OpenClaw runtime is ready.'}
        onRetry={() => setGatewayAttempt((value) => value + 1)}
      />
    )
  }
  if (configExists) {
    const panel: EmbeddedPanel =
      route === 'settings' ||
      route === 'about' ||
      route === 'dashboard' ||
      route === 'llm-api' ||
      route === 'skills' ||
      route === 'updates' ||
      route === 'models' ||
      route === 'ai-chat'
        ? route
        : ''
    return <EmbeddedShellLayout activePanel={panel} onPanelChange={handlePanelChange} />
  }
  return <LoadingView statusText={t('shell.loading.checkingConfig')} />
}

export default App
