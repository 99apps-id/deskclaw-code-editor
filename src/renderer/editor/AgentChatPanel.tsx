import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Braces,
  ArrowUp,
  Check,
  CheckCheck,
  ChevronDown,
  CircleUserRound,
  Copy,
  Download,
  FileCode2,
  FileText,
  LoaderCircle,
  Paperclip,
  Plus,
  SearchCode,
  ShieldAlert,
  ShieldCheck,
  TerminalSquare,
  TextSelect,
  Trash2,
  X,
} from 'lucide-react'
import type { AgentAction, AgentDiff } from '../../shared/electron-api'
import { formatEditSummary, useAgentActivityStore, type AgentPhase } from '../stores/agent-activity-store'

type ApprovalPolicy = 'ask' | 'full-access'

type ChatAttachment = {
  path: string
  name: string
  content: string
  truncated?: boolean
  size: number
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: string[]
  actions?: AgentAction[]
  streaming?: boolean
  editSummary?: string
}

function AnimatedStatus({ phase }: { phase: AgentPhase }) {
  const label = phase === 'editing' ? 'Editing' : phase === 'running' ? 'Running' : 'Working'
  return (
    <span className="agent-status" aria-label={label}>
      {label.split('').map((letter, index) => (
        <span key={`${letter}-${index}`} style={{ animationDelay: `${index * 65}ms` }}>{letter}</span>
      ))}
    </span>
  )
}

function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false)
  const [inserted, setInserted] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const codeString = String(children ?? '').replace(/\n$/, '')
  const language = match ? match[1] : ''

  const copyCode = () => {
    void navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const insertAtCursor = () => {
    const event = new CustomEvent('deskclaw-insert-code', { detail: { code: codeString } })
    window.dispatchEvent(event)
    setInserted(true)
    setTimeout(() => setInserted(false), 2000)
  }

  if (!match) {
    return <code className={className}>{children}</code>
  }

  return (
    <div className="relative group my-2.5 rounded border border-[var(--color-rule)] bg-[var(--color-paper)] overflow-hidden">
      <div className="flex items-center justify-between px-2.5 py-1 bg-[var(--color-paper-3)] border-b border-[var(--color-rule)] text-[10px] font-mono text-[var(--color-ink-2)]">
        <span>{language}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={insertAtCursor}
            className="flex items-center gap-1 hover:text-[var(--color-ink)] transition-colors"
            title="Insert code at current cursor position in Monaco editor"
          >
            {inserted ? <CheckCheck className="h-3 w-3 text-[var(--color-success)]" /> : <FileCode2 className="h-3 w-3" />}
            <span>{inserted ? 'Inserted!' : 'Insert'}</span>
          </button>
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-1 hover:text-[var(--color-ink)] transition-colors"
            title="Copy code"
          >
            {copied ? <CheckCheck className="h-3 w-3 text-[var(--color-success)]" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <pre className="p-2.5 overflow-x-auto text-xs font-mono leading-normal bg-[var(--color-paper)]">
        <code className={className}>{children}</code>
      </pre>
    </div>
  )
}

export function AgentChatPanel({ onClose }: { onClose?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string>()
  const [models, setModels] = useState<Array<{ id: string; name?: string; provider?: string }>>([])
  const [model, setModel] = useState('')
  const [modelOpen, setModelOpen] = useState(false)
  const [policy, setPolicy] = useState<ApprovalPolicy>('ask')
  const [policyOpen, setPolicyOpen] = useState(false)
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [pendingDiffs, setPendingDiffs] = useState<AgentDiff[]>([])
  const [notice, setNotice] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const composerRef = useRef<HTMLDivElement>(null)
  const phase = useAgentActivityStore((state) => state.phase)
  const beginActivity = useAgentActivityStore((state) => state.begin)
  const recordAction = useAgentActivityStore((state) => state.recordAction)
  const recordDiff = useAgentActivityStore((state) => state.recordDiff)
  const finishActivity = useAgentActivityStore((state) => state.finish)
  const resetActivity = useAgentActivityStore((state) => state.reset)

  useEffect(() => {
    void Promise.all([
      window.electronAPI.modelsList(),
      window.electronAPI.configRead(),
    ]).then(([catalog, config]) => {
      setModels(catalog.models ?? [])
      const configured = config.agents?.defaults?.model
      setModel(typeof configured === 'string' ? configured : configured?.primary ?? catalog.models?.[0]?.id ?? '')
    }).catch(() => setNotice('Model catalog could not be loaded. Check Providers.'))
  }, [])

  useEffect(() => {
    const unsubscribers = [
      window.electronAPI.onAgentChatChunk((nextConversationId, _chunk, fullText) => {
        if (nextConversationId) setConversationId(nextConversationId)
        setMessages((current) => current.map((message, index) =>
          index === current.length - 1 && message.role === 'assistant'
            ? { ...message, content: fullText, streaming: true }
            : message))
      }),
      window.electronAPI.onAgentChatDone((nextConversationId, fullText) => {
        const summary = formatEditSummary(useAgentActivityStore.getState().changes)
        if (nextConversationId) setConversationId(nextConversationId)
        setMessages((current) => current.map((message, index) =>
          index === current.length - 1 && message.role === 'assistant'
            ? { ...message, content: fullText, streaming: false, editSummary: summary ?? undefined }
            : message))
        setSending(false)
        finishActivity()
      }),
      window.electronAPI.onAgentAction((action) => {
        recordAction(action)
        if (!action.message && !action.filePath) return
        setMessages((current) => current.map((message, index) =>
          index === current.length - 1 && message.role === 'assistant'
            ? { ...message, actions: [...(message.actions ?? []), action] }
            : message))
      }),
      window.electronAPI.onAgentDiff((diff) => {
        recordDiff(diff)
        setPendingDiffs((current) => [...current, diff])
      }),
    ]
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [finishActivity, recordAction, recordDiff])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pendingDiffs])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) {
        setModelOpen(false)
        setPolicyOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const textarea = inputRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(180, Math.max(64, textarea.scrollHeight))}px`
  }, [input])

  const pickContext = async () => {
    try {
      const picked = await window.electronAPI.agentPickContext()
      setAttachments((current) => {
        const byPath = new Map([...current, ...picked].map((item) => [item.path, item]))
        return [...byPath.values()].slice(0, 12)
      })
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Files could not be attached.')
    }
  }

  const attachActiveFile = async () => {
    const activePath = window.localStorage.getItem('deskclaw.activePath')
    if (!activePath) {
      setNotice('No active editor file open.')
      return
    }
    try {
      const { content } = await window.electronAPI.editorReadFile(activePath)
      const name = activePath.split(/[\\/]/).pop() ?? activePath
      setAttachments((current) => {
        const filtered = current.filter((item) => item.path !== activePath)
        return [{ path: activePath, name, content, truncated: content.length > 30000, size: content.length }, ...filtered].slice(0, 12)
      })
      setNotice('')
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not attach active file.')
    }
  }

  const attachSelection = async () => {
    const activePath = window.localStorage.getItem('deskclaw.activePath')
    if (!activePath) {
      setNotice('No active editor file open.')
      return
    }
    const name = activePath.split(/[\\/]/).pop() ?? activePath
    const selection = (window as unknown as Record<string, string>).deskclawActiveSelection ?? ''
    if (!selection || !selection.trim()) {
      setNotice('No code currently selected in editor. Select code in editor first.')
      return
    }
    setAttachments((current) => [
      {
        path: `${activePath}#selection`,
        name: `${name} (selection)`,
        content: selection,
        size: selection.length,
      },
      ...current,
    ].slice(0, 12))
    setNotice('')
  }

  const exportChatHistory = () => {
    if (messages.length === 0) return
    const mdContent = `# OpenClaw Agent Chat History\n\nDate: ${new Date().toLocaleString()}\n\n` +
      messages.map((m) => `## ${m.role === 'user' ? '👤 User' : '🤖 OpenClaw Agent'}\n\n${m.content}\n`).join('\n---\n\n')
    const blob = new Blob([mdContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `openclaw-chat-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return
    const selectedAttachments = attachments
    setInput('')
    setAttachments([])
    setNotice('')
    setSending(true)
    beginActivity()
    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        attachments: selectedAttachments.map((attachment) => attachment.name),
      },
      { id: `assistant-${Date.now()}`, role: 'assistant', content: '', streaming: true },
    ])
    try {
      const result = await window.electronAPI.agentChat({
        message: text,
        conversationId,
        model: model || undefined,
        approvalPolicy: policy,
        attachments: selectedAttachments,
      })
      if (!result.ok) throw new Error(result.error || 'OpenClaw did not return a response.')
      if (result.conversationId) setConversationId(result.conversationId)
    } catch (error) {
      const description = error instanceof Error ? error.message : String(error)
      setMessages((current) => current.map((message, index) =>
        index === current.length - 1 && message.role === 'assistant'
          ? { ...message, content: `Unable to continue: ${description}`, streaming: false }
          : message))
      setSending(false)
      finishActivity()
    }
  }, [attachments, beginActivity, conversationId, finishActivity, input, model, policy, sending])

  const applyDiff = async (diff: AgentDiff, index: number) => {
    const result = await window.electronAPI.agentDiffApply({ filePath: diff.filePath, content: diff.modified })
    if (result.ok) setPendingDiffs((current) => current.filter((_, currentIndex) => currentIndex !== index))
    else setNotice(result.error || 'The file change could not be applied.')
  }

  const newChat = () => {
    if (sending) return
    setMessages([])
    setConversationId(undefined)
    setPendingDiffs([])
    setNotice('')
    resetActivity()
    inputRef.current?.focus()
  }

  return (
    <div className="vscode-chat grid h-full min-h-0 overflow-hidden grid-rows-[35px_auto_minmax(0,1fr)_auto] bg-[var(--color-paper-2)]">
      <header className="vscode-chat__header flex items-center gap-2 border-b border-[var(--color-rule)] px-2">
        <Braces className="h-4 w-4 text-[var(--color-accent-strong)]" />
        <strong className="text-xs">OpenClaw Agent</strong>
        {sending && <AnimatedStatus phase={phase} />}
        <div className="ml-auto flex items-center gap-0.5">
          {messages.length > 0 && (
            <button type="button" onClick={exportChatHistory} className="grid h-7 w-7 place-items-center text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]" title="Export chat history as Markdown">
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
          {messages.length > 0 && (
            <button type="button" onClick={newChat} className="grid h-7 w-7 place-items-center text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-danger)]" title="Clear chat">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" onClick={newChat} disabled={sending} className="grid h-7 w-7 place-items-center text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]" title="New chat">
            <Plus className="h-4 w-4" />
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]" title="Close OpenClaw Agent">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {pendingDiffs.length > 0 && (
        <section className="vscode-chat__approvals border-b border-[var(--color-rule)] bg-[var(--color-paper)] p-2">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-2)]">Changes awaiting approval</div>
          {pendingDiffs.map((diff, index) => (
            <div key={`${diff.filePath}-${diff.timestamp}`} className="flex h-7 items-center gap-2 text-xs">
              <FileCode2 className="h-3.5 w-3.5 text-[var(--color-warning)]" />
              <span className="min-w-0 flex-1 truncate">{diff.filePath}</span>
              <button type="button" onClick={() => void applyDiff(diff, index)} className="p-1 text-[var(--color-success)]" title="Apply change"><Check className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => setPendingDiffs((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="p-1 text-[var(--color-danger)]" title="Reject change"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </section>
      )}

      <div className="vscode-chat__transcript workbench-scroll min-h-0 overflow-y-auto" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-end p-3 pb-5">
            <Braces className="mb-3 h-7 w-7 text-[var(--color-rule)]" />
            <h2 className="text-sm font-semibold">Work with your codebase</h2>
            <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--color-ink-2)]">
              Attach relevant files, choose a model, then ask for a change, explanation, review, or terminal task.
            </p>
          </div>
        ) : (
          <div>
            {messages.map((message) => {
              const isUser = message.role === 'user'
              return (
                <article
                  key={message.id}
                  className={`vscode-chat__message my-2.5 mx-2 p-3 rounded-lg transition-colors ${
                    isUser
                      ? 'border border-[var(--color-accent-strong)]/30 bg-[var(--color-accent)]/15 text-[var(--color-ink)]'
                      : 'border-l-3 border-l-[var(--color-accent-strong)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[var(--color-ink)]'
                  }`}
                >
                  <div
                    className={`vscode-chat__message-label mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                      isUser ? 'text-[var(--color-accent-strong)]' : 'text-[var(--color-ink)]'
                    }`}
                  >
                    {isUser ? (
                      <CircleUserRound className="h-3.5 w-3.5 text-[var(--color-accent-strong)]" />
                    ) : (
                      <Braces className="h-3.5 w-3.5 text-[var(--color-accent-strong)]" />
                    )}
                    <span>{isUser ? 'You' : 'OpenClaw Agent'}</span>
                  </div>
                  {message.attachments?.length ? (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {message.attachments.map((name) => (
                        <span key={name} className="rounded-[var(--radius-control)] bg-[var(--color-paper-3)] px-1.5 py-0.5 text-[10px] font-mono">
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {message.role === 'assistant' ? (
                    message.content ? (
                      <div className="vscode-chat__markdown max-w-none text-xs leading-5">
                        <ReactMarkdown components={{ code: CodeBlock }}>{message.content}</ReactMarkdown>
                        {message.streaming && <span className="vscode-chat__caret ml-1 inline-block h-3 w-1 bg-[var(--color-accent-strong)]" />}
                      </div>
                    ) : (
                      <div className="vscode-chat__progress flex items-center gap-2 text-xs text-[var(--color-ink-2)]">
                        <span className="agent-status__pulse" />
                        <AnimatedStatus phase={phase} />
                      </div>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap text-xs leading-5 font-medium">{message.content}</p>
                  )}
                  {message.actions?.length ? (
                    <div className="mt-2 space-y-1">
                      {message.actions
                        .filter((action) => action.message || action.filePath)
                        .map((action, index) => (
                          <div key={`${action.timestamp}-${index}`} className="flex items-center gap-2 border-l border-[var(--color-rule)] py-1 pl-2 text-[11px] text-[var(--color-ink-2)]">
                            {action.type === 'exec' || action.type === 'command' ? (
                              <TerminalSquare className="h-3.5 w-3.5" />
                            ) : action.type === 'search' ? (
                              <SearchCode className="h-3.5 w-3.5" />
                            ) : (
                              <FileText className="h-3.5 w-3.5" />
                            )}
                            <span className="truncate">{action.message || action.filePath || action.type}</span>
                          </div>
                        ))}
                    </div>
                  ) : null}
                  {message.editSummary ? <div className="mt-2 text-[11px] font-medium text-[var(--color-ink-2)]">{message.editSummary}</div> : null}
                </article>
              )
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <footer ref={composerRef} className="vscode-chat__composer-region relative z-10 min-h-0 shrink-0 p-2">
        {notice && <div className="mb-2 border border-[var(--color-danger-rule)] bg-[var(--color-danger-bg)] p-2 text-[11px] text-[var(--color-danger)]">{notice}</div>}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {attachments.map((attachment) => (
              <span key={attachment.path} className="flex max-w-full items-center gap-1 rounded-[var(--radius-control)] bg-[var(--color-paper-3)] px-2 py-1 text-[10px]">
                <FileText className="h-3 w-3" />
                <span className="truncate">{attachment.name}</span>
                {attachment.truncated && <span className="text-[var(--color-warning)]">partial</span>}
                <button type="button" onClick={() => setAttachments((current) => current.filter((item) => item.path !== attachment.path))}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
        <div className="vscode-chat__composer rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus-within:border-[var(--color-focus)]">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void sendMessage()
              }
            }}
            rows={1}
            disabled={sending}
            placeholder="Ask about the workspace or request a change…"
            className="vscode-chat__input w-full resize-none overflow-y-auto border-0! bg-transparent! px-3 py-2 text-xs outline-none!"
          />
          <div className="flex flex-col border-t border-[var(--color-rule)] p-1.5 gap-1.5">
            {/* Context attachment buttons (scrollable horizontally if needed) */}
            <div className="flex items-center gap-1 overflow-x-auto workbench-scroll pb-0.5 min-w-0">
              <button type="button" onClick={() => void attachActiveFile()} className="flex h-6 shrink-0 items-center gap-1 px-1.5 text-[10px] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] rounded" title="Attach active file">
                <FileCode2 className="h-3.5 w-3.5 text-[var(--color-accent-strong)]" /> + Active file
              </button>
              <button type="button" onClick={() => void attachSelection()} className="flex h-6 shrink-0 items-center gap-1 px-1.5 text-[10px] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] rounded" title="Attach selected code in editor">
                <TextSelect className="h-3.5 w-3.5 text-[var(--color-warning)]" /> + Selection
              </button>
              <button type="button" onClick={() => void pickContext()} className="flex h-6 shrink-0 items-center gap-1 px-1.5 text-[10px] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] rounded" title="Add files">
                <Paperclip className="h-3.5 w-3.5" /> Add context
              </button>
            </div>

            {/* Model Selector, Policy & Send Button (Always visible on bottom row) */}
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-[var(--color-rule)]/50">
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <div className="relative min-w-0 flex-1 max-w-[180px]">
                  <button type="button" onClick={() => setModelOpen((value) => !value)} className="flex h-6 w-full items-center gap-1 px-1.5 text-[10px] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] rounded">
                    <Braces className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{model || 'Choose model'}</span><ChevronDown className="h-3 w-3 shrink-0" />
                  </button>
                  {modelOpen && (
                    <div className="absolute bottom-full left-0 z-30 mb-1 max-h-72 w-72 overflow-auto rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-1 shadow-xl">
                      {models.map((item) => (
                        <button type="button" key={item.id} onClick={() => { setModel(item.id); setModelOpen(false) }} className={`flex w-full items-center gap-2 p-2 text-left text-xs hover:bg-[var(--color-paper-3)] ${model === item.id ? 'text-[var(--color-accent-strong)]' : ''}`}>
                          <span className="min-w-0 flex-1 truncate">{item.name || item.id}</span><span className="text-[10px] text-[var(--color-ink-2)]">{item.provider}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative shrink-0">
                  <button type="button" onClick={() => setPolicyOpen((value) => !value)} className={`flex h-6 items-center gap-1 px-1.5 text-[10px] rounded hover:bg-[var(--color-paper-3)] ${policy === 'full-access' ? 'text-[var(--color-warning)]' : 'text-[var(--color-ink-2)]'}`}>
                    {policy === 'ask' ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{policy === 'ask' ? 'Ask approval' : 'Full access'}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {policyOpen && (
                    <div className="absolute bottom-full left-0 z-30 mb-1 w-64 rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-1 shadow-xl">
                      <button type="button" onClick={() => { setPolicy('ask'); setPolicyOpen(false) }} className="w-full p-2 text-left hover:bg-[var(--color-paper-3)]"><strong className="block text-xs">Ask approval</strong><span className="text-[10px] text-[var(--color-ink-2)]">Review file changes and important actions.</span></button>
                      <button type="button" onClick={() => { setPolicy('full-access'); setPolicyOpen(false) }} className="w-full p-2 text-left hover:bg-[var(--color-paper-3)]"><strong className="block text-xs text-[var(--color-warning)]">Full access</strong><span className="text-[10px] text-[var(--color-ink-2)]">Allow workspace writes and commands for this chat.</span></button>
                    </div>
                  )}
                </div>
              </div>

              <button type="button" onClick={() => void sendMessage()} disabled={sending || !input.trim()} className="chat-send-button shrink-0 grid h-7 w-7 place-items-center rounded-[7px] bg-[var(--color-accent-strong)] text-white disabled:opacity-40" title="Send (Enter)">
                {sending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-4 w-4" strokeWidth={2.4} />}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
