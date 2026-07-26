import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Blocks,
  Braces,
  ChevronDown,
  CircleHelp,
  CloudCog,
  Code2,
  Cpu,
  Files,
  GitBranch,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  TerminalSquare,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { AgentChatPanel } from '../editor/AgentChatPanel'
import { CodeEditorPanel } from '../editor/CodeEditorPanel'
import { AboutView } from './AboutView'
import { DashboardView } from './DashboardView'
import { ModelsView } from './ModelsView'
import { ProviderView } from './ProviderView'
import { SettingsView } from './SettingsView'
import { SkillsView } from './SkillsView'
import { UpdateView } from './UpdateView'
import type { GatewayStatusValue } from '../../shared/types'

export type EmbeddedPanel =
  | ''
  | 'settings'
  | 'about'
  | 'dashboard'
  | 'llm-api'
  | 'skills'
  | 'updates'
  | 'models'
  | 'ai-chat'

export interface EmbeddedShellLayoutProps {
  activePanel: EmbeddedPanel
  onPanelChange: (panel: EmbeddedPanel) => void
}

type NavItem = {
  id: EmbeddedPanel
  label: string
  description: string
  icon: typeof Files
  placement?: 'bottom'
}

const NAV_ITEMS: NavItem[] = [
  { id: '', label: 'Explorer', description: 'Files and editor', icon: Files },
  { id: 'dashboard', label: 'OpenClaw', description: 'Runtime and connections', icon: CloudCog },
  { id: 'ai-chat', label: 'OpenClaw Agent', description: 'OpenClaw coding agent for this workspace', icon: Braces },
  { id: 'models', label: 'Models', description: 'Routing and fallbacks', icon: Cpu },
  { id: 'llm-api', label: 'Providers', description: 'Authentication and API access', icon: ShieldCheck },
  { id: 'skills', label: 'Skills', description: 'OpenClaw capabilities', icon: Blocks },
  { id: 'updates', label: 'Updates', description: 'Runtime and app releases', icon: RefreshCw, placement: 'bottom' },
  { id: 'settings', label: 'Settings', description: 'DeskClaw preferences', icon: Settings, placement: 'bottom' },
  { id: 'about', label: 'About', description: 'Versions and licenses', icon: CircleHelp, placement: 'bottom' },
]

function ActivityButton({
  item,
  active,
  onSelect,
}: {
  item: NavItem
  active: boolean
  onSelect: () => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      title={`${item.label} — ${item.description}`}
      onClick={onSelect}
      className={`group relative grid h-11 w-11 place-items-center text-[var(--color-ink-2)] transition-colors ${
        active ? 'bg-[var(--color-paper-3)] text-[var(--color-ink)]' : 'hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)]'
      }`}
    >
      {active && <span className="absolute inset-y-2 left-0 w-0.5 bg-[var(--color-accent-strong)]" />}
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
    </button>
  )
}

function GatewayBadge({ status }: { status: GatewayStatusValue }) {
  const online = status === 'running'
  return (
    <div className="flex items-center gap-1.5" title={`OpenClaw Gateway: ${status}`}>
      {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      <span>{online ? 'OpenClaw connected' : status === 'starting' ? 'Starting OpenClaw…' : 'OpenClaw offline'}</span>
    </div>
  )
}

export function EmbeddedShellLayout({ activePanel, onPanelChange }: EmbeddedShellLayoutProps) {
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatusValue>('starting')
  const [gatewayError, setGatewayError] = useState('')
  const [agentVisible, setAgentVisible] = useState(activePanel === 'ai-chat')
  const [agentWidth, setAgentWidth] = useState(() => {
    const stored = Number(window.localStorage.getItem('deskclaw.agentWidth'))
    return Number.isFinite(stored) && stored >= 280 ? stored : 380
  })
  const [commandOpen, setCommandOpen] = useState(false)
  const agentResizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const selected = useMemo(
    () => NAV_ITEMS.find((item) => item.id === activePanel) ?? NAV_ITEMS[0],
    [activePanel],
  )

  const connectGateway = useCallback(async () => {
    setGatewayError('')
    setGatewayStatus('starting')
    try {
      const current = await window.electronAPI.gatewayStatus()
      if (current.status === 'running') {
        setGatewayStatus('running')
        return
      }
      await window.electronAPI.gatewayStart()
    } catch (error) {
      setGatewayStatus('error')
      setGatewayError(error instanceof Error ? error.message : 'OpenClaw could not start.')
    }
  }, [])

  useEffect(() => {
    void connectGateway()
    return window.electronAPI.onGatewayStatusChange((next) => {
      setGatewayStatus(next.status)
      if (next.status === 'running') setGatewayError('')
    })
  }, [connectGateway])

  useEffect(() => {
    if (activePanel === 'ai-chat') {
      setAgentVisible(true)
      onPanelChange('')
    }
  }, [activePanel, onPanelChange])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        setCommandOpen((value) => !value)
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        setAgentVisible(true)
      }
      if (event.key === 'Escape') setCommandOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const resize = agentResizeRef.current
      if (!resize) return
      const maxWidth = Math.max(320, Math.floor(window.innerWidth * 0.6))
      setAgentWidth(Math.max(280, Math.min(maxWidth, resize.startWidth + resize.startX - event.clientX)))
    }
    const onUp = () => {
      if (!agentResizeRef.current) return
      agentResizeRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setAgentWidth((width) => {
        window.localStorage.setItem('deskclaw.agentWidth', String(width))
        return width
      })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const renderSurface = () => {
    switch (activePanel) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigateToSettings={() => onPanelChange('settings')}
            onNavigateToLlmApi={() => onPanelChange('llm-api')}
            onNavigateToUpdates={() => onPanelChange('updates')}
            updateAvailable={false}
          />
        )
      case 'models':
        return <ModelsView onBack={() => onPanelChange('')} />
      case 'llm-api':
        return <ProviderView onBack={() => onPanelChange('')} />
      case 'skills':
        return <SkillsView onBack={() => onPanelChange('')} />
      case 'updates':
        return <UpdateView onBack={() => onPanelChange('')} />
      case 'settings':
        return <SettingsView onBack={() => onPanelChange('')} onOpenModels={() => onPanelChange('models')} />
      case 'about':
        return <AboutView onBack={() => onPanelChange('')} />
      default:
        return <CodeEditorPanel />
    }
  }

  const primaryItems = NAV_ITEMS.filter((item) => item.placement !== 'bottom')
  const utilityItems = NAV_ITEMS.filter((item) => item.placement === 'bottom')

  return (
    <main className="workbench-surface grid h-full max-h-full min-h-0 grid-rows-[34px_minmax(0,1fr)_22px] overflow-hidden bg-[var(--color-paper)] text-[var(--color-ink)]">
      <header className="flex items-center border-b border-[var(--color-rule)] bg-[var(--color-paper-2)]">
        <button
          type="button"
          onClick={() => onPanelChange('')}
          title="DeskClaw Code Editor — Kembali ke Editor"
          className="flex h-full w-12 items-center justify-center border-r border-[var(--color-rule)] hover:bg-[var(--color-paper-3)] transition-colors"
        >
          <Code2 className="h-4 w-4 text-[var(--color-accent-strong)]" strokeWidth={2.1} />
        </button>
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="mx-auto flex h-6 w-[min(520px,44vw)] items-center gap-2 border border-[var(--color-rule)] bg-[var(--color-paper)] px-2 text-xs text-[var(--color-ink-2)] hover:border-[var(--color-ink-2)]"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="truncate">Search files, commands, models, and skills</span>
          <kbd className="ml-auto font-[var(--font-code)] text-[10px]">Ctrl Shift P</kbd>
        </button>
        <button
          type="button"
          onClick={() => setAgentVisible((value) => !value)}
          className="mr-1 flex h-7 items-center gap-2 px-2 text-xs text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
          title="Toggle OpenClaw Agent (Ctrl+L)"
        >
          <Braces className="h-3.5 w-3.5" />
          OpenClaw Agent
          {agentVisible ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
        </button>
      </header>

      <div className="grid min-h-0 overflow-hidden grid-cols-[48px_minmax(0,1fr)]">
        <nav aria-label="Workbench" className="flex min-h-0 flex-col items-center border-r border-[var(--color-rule)] bg-[var(--color-paper-2)] py-1">
          {primaryItems.map((item) => (
            <ActivityButton key={item.label} item={item} active={item.id === activePanel} onSelect={() => onPanelChange(item.id)} />
          ))}
          <div className="mt-auto">
            {utilityItems.map((item) => (
              <ActivityButton key={item.label} item={item} active={item.id === activePanel} onSelect={() => onPanelChange(item.id)} />
            ))}
          </div>
        </nav>

        <div
          className="grid min-h-0 overflow-hidden"
          style={{ gridTemplateColumns: agentVisible ? `minmax(0, 1fr) 4px ${agentWidth}px` : 'minmax(0, 1fr)' }}
        >
          <section aria-label={selected.label} className="min-h-0 min-w-0 overflow-hidden">
            {renderSurface()}
          </section>
          {agentVisible && (
            <>
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize OpenClaw Agent panel"
                className="panel-splitter panel-splitter--vertical relative"
                onMouseDown={(event) => {
                  agentResizeRef.current = { startX: event.clientX, startWidth: agentWidth }
                  document.body.style.cursor = 'col-resize'
                  document.body.style.userSelect = 'none'
                }}
              />
              <aside aria-label="OpenClaw Agent" className="collaborator-panel min-h-0 min-w-0 overflow-hidden bg-[var(--color-paper-2)]">
              <div className="h-full min-h-0">
                <AgentChatPanel onClose={() => setAgentVisible(false)} />
              </div>
              </aside>
            </>
          )}
        </div>
      </div>

      <footer className="relative z-30 flex min-h-[22px] items-center justify-between overflow-hidden bg-[var(--color-accent-strong)] px-2 text-[10px] text-white">
        <div className="flex items-center gap-3">
          <GatewayBadge status={gatewayStatus} />
          <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> workspace</span>
          <span className="flex items-center gap-1"><TerminalSquare className="h-3 w-3" /> PowerShell</span>
        </div>
        <div className="flex items-center gap-3">
          {gatewayError && <button type="button" onClick={() => void connectGateway()}>Retry connection</button>}
          <span className="flex items-center gap-1"><SlidersHorizontal className="h-3 w-3" /> DeskClaw</span>
        </div>
      </footer>

      {commandOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 pt-[9vh]" onMouseDown={() => setCommandOpen(false)}>
          <div className="mx-auto w-[min(680px,calc(100vw-32px))] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-[var(--color-rule)] px-3">
              <ChevronDown className="h-4 w-4 text-[var(--color-accent-strong)]" />
              <input autoFocus aria-label="Command palette" placeholder="Type a command or search DeskClaw…" className="h-10 flex-1 border-0! bg-transparent! outline-none!" />
            </div>
            <div className="p-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => {
                      if (item.id === 'ai-chat') setAgentVisible(true)
                      else onPanelChange(item.id)
                      setCommandOpen(false)
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--color-paper-3)]"
                  >
                    <Icon className="h-4 w-4 text-[var(--color-ink-2)]" />
                    <span>{item.label}</span>
                    <span className="ml-auto text-xs text-[var(--color-ink-2)]">{item.description}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
