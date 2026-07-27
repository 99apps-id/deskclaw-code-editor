import { useCallback, useEffect, useRef, useState } from 'react'
import Editor, { loader, type OnMount } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { Activity, AlertTriangle, ArrowLeft, ArrowRight, Bug, Columns, Command, FileCode2, FileText, FolderOpen, GitBranch, GitPullRequest, Layers, ListTree, MapPin, MoreHorizontal, Settings, PanelBottomClose, PanelLeftOpen, Play, Save, Search, Square, TerminalSquare, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react'
import type { editor } from 'monaco-editor'
import { DebugPanel } from './DebugPanel'
import { FileExplorer } from './FileExplorer'
import { GitPanel } from './GitPanel'
import { TerminalPanel } from './TerminalPanel'
import { FileTypeIcon } from './FileTypeIcon'
import { BreadcrumbNav } from './BreadcrumbNav'
import { QuickOpenModal } from './QuickOpenModal'
import { GlobalSearchModal } from './GlobalSearchModal'
import { CommandPaletteModal, type CommandItem } from './CommandPaletteModal'
import { MarkdownPreviewPanel } from './MarkdownPreviewPanel'
import { ProblemsPanel, type DiagnosticItem } from './ProblemsPanel'
import { OutlinePanel } from './OutlinePanel'
import { SettingsPanel } from './SettingsPanel'
import { InlineEditWidget } from './InlineEditWidget'
import { SkillMarketplaceModal } from './SkillMarketplaceModal'
import { MemoryEditorModal } from './MemoryEditorModal'
import { GitHubPanel } from './GitHubPanel'
import { ProjectHealthPanel } from './ProjectHealthPanel'
import { ProjectStarterModal } from './ProjectStarterModal'
import { SnippetExporterModal } from './SnippetExporterModal'

loader.config({ monaco })

export interface EditorFile {
  path: string
  name: string
  language: string
  content: string
  savedContent: string
}


const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  c: 'c',
  cpp: 'cpp',
  css: 'css',
  go: 'go',
  html: 'html',
  java: 'java',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  md: 'markdown',
  mjs: 'javascript',
  ps1: 'powershell',
  py: 'python',
  rs: 'rust',
  scss: 'scss',
  sh: 'shell',
  sql: 'sql',
  ts: 'typescript',
  tsx: 'typescript',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
}

function languageFor(name: string) {
  return LANGUAGE_BY_EXTENSION[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'plaintext'
}

export function CodeEditorPanel() {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [files, setFiles] = useState<EditorFile[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [explorerVisible, setExplorerVisible] = useState(true)
  const [explorerWidth, setExplorerWidth] = useState(() => {
    const stored = Number(window.localStorage.getItem('deskclaw.explorerWidth'))
    return Number.isFinite(stored) && stored >= 180 ? stored : 248
  })
  type BottomPanel = 'terminal' | 'git' | 'debug' | 'problems' | 'github' | 'health'
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>('terminal')
  const [bottomVisible, setBottomVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [bottomHeight, setBottomHeight] = useState(() => {
    const stored = Number(window.localStorage.getItem('deskclaw.bottomHeight'))
    return Number.isFinite(stored) && stored >= 120 ? stored : 210
  })
  const [debugSessionId, setDebugSessionId] = useState<string | null>(null)
  const [debugStarting, setDebugStarting] = useState(false)
  const [editorError, setEditorError] = useState('')
  const [quickOpenVisible, setQuickOpenVisible] = useState(false)
  const [globalSearchVisible, setGlobalSearchVisible] = useState(false)
  // Reference to Monaco editor instance for status bar
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  // Opened editors list popup state
  const [showOpenedEditorsList, setShowOpenedEditorsList] = useState(false)
  const [commandPaletteVisible, setCommandPaletteVisible] = useState(false)
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)
  const [showOutline, setShowOutline] = useState(false)
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([])
  const [_autoSave, _setAutoSave] = useState<'off' | 'afterDelay'>('afterDelay')

  const [splitView, setSplitView] = useState(false)
  const [secondaryPath, _setSecondaryPath] = useState<string | null>(null)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })
  const [fontSize, setFontSize] = useState(13)
  const [showMinimap, setShowMinimap] = useState(true)
  const [selectionInfo, setSelectionInfo] = useState({ chars: 0, lines: 0 })
  const [historyStack, setHistoryStack] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [moreActionsOpen, setMoreActionsOpen] = useState(false)
  const [showInlineEdit, setShowInlineEdit] = useState(false)
  const [marketplaceVisible, setMarketplaceVisible] = useState(false)
  const [memoryEditorVisible, setMemoryEditorVisible] = useState(false)
  const [projectStarterVisible, setProjectStarterVisible] = useState(false)
  const [snippetExporterVisible, setSnippetExporterVisible] = useState(false)
  const [selectedSnippetCode, setSelectedSnippetCode] = useState('')
  const filesRef = useRef(files)
  filesRef.current = files

  const activeFile = files.find((file) => file.path === activePath) ?? null
  const secondaryFile = files.find((file) => file.path === secondaryPath) ?? files.find((file) => file.path !== activePath) ?? activeFile
  const dirty = activeFile ? activeFile.content !== activeFile.savedContent : false

  // Auto Save timer effect (1s debounce)
  useEffect(() => {
    if (_autoSave !== 'afterDelay' || !activeFile || !dirty) return
    const timer = setTimeout(() => {
      const saveBtn = filesRef.current.find((f) => f.path === activePath)
      if (saveBtn) {
        window.electronAPI.editorWriteFile(saveBtn.path, saveBtn.content).then(() => {
          setFiles((current) => current.map((candidate) =>
            candidate.path === saveBtn.path ? { ...candidate, savedContent: candidate.content } : candidate))
        }).catch(() => { /* ignore autosave fail */ })
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [activeFile, dirty, _autoSave, activePath])

  // Track file navigation history & activePath storage
  useEffect(() => {
    if (!activePath) return
    window.localStorage.setItem('deskclaw.activePath', activePath)
    setHistoryStack((prev) => {
      if (prev[historyIndex] === activePath) return prev
      const newStack = [...prev.slice(0, historyIndex + 1), activePath]
      setHistoryIndex(newStack.length - 1)
      return newStack
    })
  }, [activePath, historyIndex])

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const prevPath = historyStack[historyIndex - 1]
      setHistoryIndex(historyIndex - 1)
      setActivePath(prevPath)
    }
  }, [historyIndex, historyStack])

  const goForward = useCallback(() => {
    if (historyIndex < historyStack.length - 1) {
      const nextPath = historyStack[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      setActivePath(nextPath)
    }
  }, [historyIndex, historyStack])

  const closeSaved = () => {
    const unsaved = files.filter((f) => f.content !== f.savedContent)
    setFiles(unsaved)
    if (unsaved.length > 0 && (!activePath || !unsaved.some((f) => f.path === activePath))) {
      setActivePath(unsaved[0].path)
    } else if (unsaved.length === 0) {
      setActivePath(null)
    }
    setMoreActionsOpen(false)
  }

  const closeAll = () => {
    setFiles([])
    setActivePath(null)
    setMoreActionsOpen(false)
  }

  const closeOthers = () => {
    if (!activePath) return
    const activeOnly = files.filter((f) => f.path === activePath)
    setFiles(activeOnly)
    setMoreActionsOpen(false)
  }

  const saveFile = useCallback(async () => {
    const file = filesRef.current.find((candidate) => candidate.path === activePath)
    if (!file) return
    setEditorError('')
    // Basic Auto-Format on Save for JSON
    let formattedContent = file.content
    if (file.language === 'json') {
      try {
        formattedContent = JSON.stringify(JSON.parse(file.content), null, 2)
      } catch {
        // not valid JSON — save as-is
      }
    }
    try {
      await window.electronAPI.editorWriteFile(file.path, formattedContent)
      setFiles((prev) => prev.map((f) => (f.path === file.path ? { ...f, content: formattedContent, savedContent: formattedContent } : f)))
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Failed to save file')
    }
  }, [activePath])

  const commandItems: CommandItem[] = [
    { id: 'quick-open', label: 'Quick Open File', shortcut: 'Ctrl+P', category: 'File', action: () => setQuickOpenVisible(true) },
    { id: 'global-search', label: 'Search in Files', shortcut: 'Ctrl+Shift+F', category: 'Edit', action: () => setGlobalSearchVisible(true) },
    { id: 'inline-ai-edit', label: 'Inline AI Code Edit', shortcut: 'Ctrl+K', category: 'AI', action: () => setShowInlineEdit(true) },
    { id: 'project-starter', label: 'Create New Project from Template', category: 'Project', action: () => setProjectStarterVisible(true) },
    { id: 'skill-marketplace', label: 'ClawHub Skill Marketplace', category: 'AI', action: () => setMarketplaceVisible(true) },
    { id: 'project-memory', label: 'Edit Project Memory & Rules', category: 'AI', action: () => setMemoryEditorVisible(true) },
    { id: 'command-palette', label: 'Command Palette', shortcut: 'Ctrl+Shift+P', category: 'General', action: () => setCommandPaletteVisible(true) },
    { id: 'save-file', label: 'Save Current File', shortcut: 'Ctrl+S', category: 'File', action: () => void saveFile() },
    { id: 'split-editor', label: 'Toggle Split Dual View', category: 'View', action: () => setSplitView((p) => !p) },
    { id: 'toggle-minimap', label: 'Toggle Minimap', category: 'View', action: () => setShowMinimap((p) => !p) },
    { id: 'markdown-preview', label: 'Toggle Markdown Live Preview', category: 'View', action: () => setShowMarkdownPreview((p) => !p) },
    { id: 'toggle-outline', label: 'Toggle Document Symbol Outline', category: 'View', action: () => setShowOutline((p) => !p) },
    { id: 'terminal', label: 'Toggle Terminal Panel', shortcut: 'Ctrl+`', category: 'Terminal', action: () => { setBottomPanel('terminal'); setBottomVisible((v) => !v) } },
    { id: 'problems', label: 'Show Problems & Diagnostics', category: 'View', action: () => { setBottomPanel('problems'); setBottomVisible(true) } },
    { id: 'close-all', label: 'Close All Editors', category: 'Tab', action: closeAll },
    { id: 'close-saved', label: 'Close Saved Editors', category: 'Tab', action: closeSaved },
  ]

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveFile()
      }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        setCommandPaletteVisible(true)
      } else if (event.key === 'F1') {
        event.preventDefault()
        setCommandPaletteVisible(true)
      } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        setGlobalSearchVisible(true)
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p' && !event.shiftKey) {
        event.preventDefault()
        setQuickOpenVisible(true)
      }
      if ((event.ctrlKey || event.metaKey) && (event.key === '=' || event.key === '+')) {
        event.preventDefault()
        setFontSize((prev) => Math.min(32, prev + 1))
      }
      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault()
        goBack()
      }
      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault()
        goForward()
      }
      if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault()
        setFontSize((prev) => Math.max(9, prev - 1))
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setShowInlineEdit((prev) => !prev)
      }
      if ((event.ctrlKey || event.metaKey) && event.key === '`') {
        event.preventDefault()
        setBottomPanel('terminal')
        setBottomVisible((value) => !value)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [saveFile, goBack, goForward])

  // Listen for insert code event from AI Chat
  useEffect(() => {
    const handleInsert = (e: Event) => {
      const customEvent = e as CustomEvent<{ code: string }>
      if (!editorRef.current || !customEvent.detail?.code) return
      const editorInstance = editorRef.current
      const selection = editorInstance.getSelection()
      if (selection) {
        editorInstance.executeEdits('ai-chat', [{
          range: selection,
          text: customEvent.detail.code,
          forceMoveMarkers: true,
        }])
      }
    }
    window.addEventListener('deskclaw-insert-code', handleInsert)
    return () => window.removeEventListener('deskclaw-insert-code', handleInsert)
  }, [])

  const handleEditorMount: OnMount = (editorInstance, monacoInstance) => {
    editorRef.current = editorInstance
    editorInstance.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column })
    })
    monacoInstance.editor.onDidChangeMarkers(() => {
      const markers = monacoInstance.editor.getModelMarkers({})
      const diagItems: DiagnosticItem[] = markers.map((m: monaco.editor.IMarker, idx: number) => ({
        id: `diag-${idx}`,
        filePath: m.resource.path,
        fileName: m.resource.path.split('/').pop() ?? 'File',
        message: m.message,
        severity: m.severity === monacoInstance.MarkerSeverity.Error ? 'error' : 'warning',
        lineNumber: m.startLineNumber,
        column: m.startColumn,
      }))
      setDiagnostics(diagItems)
    })
    editorInstance.onDidChangeCursorSelection((e) => {
      const model = editorInstance.getModel()
      if (!model) return
      const selectedText = model.getValueInRange(e.selection)
      ;(window as unknown as Record<string, string>).deskclawActiveSelection = selectedText
      if (selectedText) {
        const lineCount = e.selection.endLineNumber - e.selection.startLineNumber + 1
        setSelectionInfo({ chars: selectedText.length, lines: lineCount })
      } else {
        setSelectionInfo({ chars: 0, lines: 0 })
      }
    })

    editorInstance.addAction({
      id: 'deskclaw-explain-code',
      label: '✨ OpenClaw: Explain Code',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1,
      run: (ed) => {
        const selection = ed.getSelection()
        const text = selection ? ed.getModel()?.getValueInRange(selection) : ''
        const activePath = window.localStorage.getItem('deskclaw.activePath') || ''
        const prompt = text
          ? `Explain the following code from ${activePath}:\n\n\`\`\`\n${text}\n\`\`\``
          : `Explain the structure and functionality of file ${activePath}.`
        void window.electronAPI.agentChat({ message: prompt })
      },
    })

    editorInstance.addAction({
      id: 'deskclaw-refactor-code',
      label: '✨ OpenClaw: Refactor Selection',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 2,
      run: (ed) => {
        const selection = ed.getSelection()
        const text = selection ? ed.getModel()?.getValueInRange(selection) : ''
        if (!text) return
        const activePath = window.localStorage.getItem('deskclaw.activePath') || ''
        const prompt = `Refactor and improve the following code from ${activePath} for better readability, performance, and best practices:\n\n\`\`\`\n${text}\n\`\`\``
        void window.electronAPI.agentChat({ message: prompt })
      },
    })

    editorInstance.addAction({
      id: 'deskclaw-export-snippet',
      label: '✨ OpenClaw: Export Code Snippet Card',
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 3,
      run: (ed) => {
        const selection = ed.getSelection()
        const text = selection ? ed.getModel()?.getValueInRange(selection) : ed.getModel()?.getValue()
        setSelectedSnippetCode(text || '')
        setSnippetExporterVisible(true)
      },
    })
    
    // Theme setup logic omitted for brevity, assumed existing
  }

  const openFile = async (path: string) => {
    const existing = filesRef.current.find((f) => f.path === path)
    if (existing) {
      setActivePath(path)
      return
    }
    try {
      const { content } = await window.electronAPI.editorReadFile(path)
      const name = path.split(/[\\/]/).pop() ?? path
      const language = languageFor(name)
      setFiles((prev) => [...prev, { path, name, language, content, savedContent: content }])
      setActivePath(path)
    } catch (err) {
      setEditorError(err instanceof Error ? err.message : 'Failed to open file')
    }
  }

  const closeFile = (filePath: string) => {
    const index = files.findIndex((file) => file.path === filePath)
    const closing = files[index]
    if (closing && closing.content !== closing.savedContent && !window.confirm(`Close ${closing.name} without saving?`)) return
    const next = files.filter((file) => file.path !== filePath)
    setFiles(next)
    if (activePath === filePath) {
      const newActive = next[Math.max(0, index - 1)] ?? null
      setActivePath(newActive?.path ?? null)
    }
  }

  const runActiveFile = async () => {
    if (!activeFile) return
    await saveFile()
    const directory = activeFile.path.slice(0, Math.max(activeFile.path.lastIndexOf('/'), activeFile.path.lastIndexOf('\\')))
    const session = await window.electronAPI.terminalStart({ cwd: directory || undefined })
    const extension = activeFile.name.split('.').pop()?.toLowerCase()
    const command = extension === 'py'
      ? `python "${activeFile.path}"\r`
      : extension === 'ps1'
        ? `powershell -File "${activeFile.path}"\r`
        : extension === 'sh'
          ? `bash "${activeFile.path}"\r`
          : `node "${activeFile.path}"\r`
    await window.electronAPI.terminalWrite(session.sessionId, command)
    setBottomPanel('terminal')
    setBottomVisible(true)
  }

  const debugActiveFile = async () => {
    if (!activeFile) return
    setDebugStarting(true)
    try {
      await saveFile()
      const result = await window.electronAPI.debugLaunch({ filePath: activeFile.path })
      setDebugSessionId(result.sessionId)
      setBottomPanel('debug')
      setBottomVisible(true)
    } finally {
      setDebugStarting(false)
    }
  }

  const stopDebug = async () => {
    if (debugSessionId) await window.electronAPI.debugStop(debugSessionId)
    setDebugSessionId(null)
  }

  const switchBottomPanel = (panel: BottomPanel) => {
    if (bottomPanel === panel) setBottomVisible((value) => !value)
    else {
      setBottomPanel(panel)
      setBottomVisible(true)
    }
  }

  const editorOptions = {
    automaticLayout: true,
    readOnly: false,
    bracketPairColorization: { enabled: true },
    'semanticHighlighting.enabled': true,
    cursorSmoothCaretAnimation: 'on',
    fontFamily: "'Cascadia Code', 'Cascadia Mono', Consolas, monospace",
    fontLigatures: true,
    fontSize,
    minimap: { enabled: showMinimap, showSlider: 'mouseover' },
    multiCursorModifier: 'alt',
    padding: { top: 10 },
    renderWhitespace: 'selection',
    guides: { bracketPairs: true, indentation: true },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    tabSize: 2,
  } as const

  return (
    <div className="grid h-full min-h-0 overflow-hidden grid-cols-[auto_minmax(0,1fr)] bg-[var(--color-paper)]">
      {explorerVisible && (
        <FileExplorer
          onOpenFile={(path) => void openFile(path)}
          onToggle={() => setExplorerVisible(false)}
          onWorkspaceChange={setWorkspacePath}
          width={explorerWidth}
          onWidthChange={(width) => {
            setExplorerWidth(width)
            window.localStorage.setItem('deskclaw.explorerWidth', String(width))
          }}
        />
      )}

      <div className="grid min-h-0 min-w-0 overflow-hidden grid-rows-[35px_minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-stretch border-b border-[var(--color-rule)] bg-[var(--color-paper-2)]">
          {!explorerVisible && (
            <button type="button" onClick={() => setExplorerVisible(true)} className="grid w-9 place-items-center text-[var(--color-ink-2)] hover:text-[var(--color-ink)]" title="Show explorer">
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
          <div className="flex min-w-0 flex-1 overflow-x-auto">
            {files.map((file) => {
              const selected = file.path === activePath
              const modified = file.content !== file.savedContent
              return (
                <button
                  type="button"
                  key={file.path}
                  onClick={() => setActivePath(file.path)}
                  className={`group flex h-[35px] max-w-52 items-center gap-2 border-r border-[var(--color-rule)] px-3 text-xs ${
                    selected ? 'bg-[var(--color-paper)] text-[var(--color-ink)]' : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]'
                  }`}
                >
                  <FileTypeIcon name={file.name} className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{file.name}</span>
                  {modified ? <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-warning)]" /> : null}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => { event.stopPropagation(); closeFile(file.path) }}
                    onKeyDown={(event) => { if (event.key === 'Enter') closeFile(file.path) }}
                    className="ml-auto grid h-4 w-4 shrink-0 place-items-center opacity-0 hover:bg-[var(--color-paper-3)] group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                </button>
              )
            })}
          </div>
          <div className="relative flex items-center border-l border-[var(--color-rule)] px-1 gap-0.5">
            <button type="button" onClick={goBack} disabled={historyIndex <= 0} className="p-1.5 text-[var(--color-ink-2)] hover:text-[var(--color-ink)] disabled:opacity-40" title="Go Back (Alt+←)">
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={goForward} disabled={historyIndex >= historyStack.length - 1} className="p-1.5 text-[var(--color-ink-2)] hover:text-[var(--color-ink)] disabled:opacity-40" title="Go Forward (Alt+→)">
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <div className="relative">
              <button type="button" onClick={() => setMoreActionsOpen((prev) => !prev)} className={`p-1.5 transition-colors ${moreActionsOpen ? 'bg-[var(--color-paper-3)] text-[var(--color-ink)]' : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]'}`} title="More Actions...">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              {moreActionsOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-48 rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-1 text-xs shadow-xl animate-in fade-in duration-75">
                  <button type="button" onClick={() => { setShowOpenedEditorsList(true); setMoreActionsOpen(false); }} className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]">
                    <Layers className="h-3.5 w-3.5 text-[var(--color-accent-strong)]" />
                    <span>Show Opened Editors ({files.length})</span>
                  </button>
                  <div className="my-1 border-t border-[var(--color-rule)]" />
                  <button type="button" onClick={closeSaved} className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[var(--color-ink)] hover:bg-[var(--color-paper-3)]">
                    <span>Close Saved Editors</span>
                  </button>
                  <button type="button" onClick={closeOthers} disabled={!activePath} className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[var(--color-ink)] hover:bg-[var(--color-paper-3)] disabled:opacity-40">
                    <span>Close Other Editors</span>
                  </button>
                  <button type="button" onClick={closeAll} disabled={files.length === 0} className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[var(--color-danger)] hover:bg-[var(--color-paper-3)] disabled:opacity-40">
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Close All Editors</span>
                  </button>
                </div>
              )}
            </div>
            <button type="button" onClick={() => setCommandPaletteVisible(true)} className="p-1.5 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]" title="Command Palette (Ctrl+Shift+P / F1)">
              <Command className="h-3.5 w-3.5 text-[var(--color-accent-strong)]" />
            </button>
            <button type="button" onClick={() => setQuickOpenVisible(true)} className="p-1.5 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]" title="Quick Open File (Ctrl+P)">
              <Search className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setGlobalSearchVisible(true)} className="p-1.5 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]" title="Search in Files (Ctrl+Shift+F)">
              <Search className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setShowMarkdownPreview((prev) => !prev)} className={`p-1.5 transition-colors ${showMarkdownPreview ? 'text-[var(--color-accent-strong)] bg-[var(--color-paper-3)]' : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]'}`} title="Markdown Live Preview">
              <FileText className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setShowOutline((prev) => !prev)} className={`p-1.5 transition-colors ${showOutline ? 'text-[var(--color-accent-strong)] bg-[var(--color-paper-3)]' : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]'}`} title="Toggle Document Symbol Outline">
              <ListTree className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setShowMinimap((prev) => !prev)} className={`p-1.5 transition-colors ${showMinimap ? 'text-[var(--color-accent-strong)]' : 'text-[var(--color-ink-2)] opacity-40'}`} title={showMinimap ? 'Hide Minimap' : 'Show Minimap'}>
              <MapPin className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setFontSize((prev) => Math.min(32, prev + 1))} className="p-1.5 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]" title="Zoom In Font (Ctrl++)">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setFontSize((prev) => Math.max(9, prev - 1))} className="p-1.5 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]" title="Zoom Out Font (Ctrl+-)">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setSplitView((prev) => !prev)} className={`p-1.5 transition-colors ${splitView ? 'text-[var(--color-accent-strong)] bg-[var(--color-paper-3)]' : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]'}`} title={splitView ? 'Single Editor View' : 'Split Editor (Dual View Side-by-Side)'}>
              <Columns className="h-3.5 w-3.5" />
            </button>
            <button type="button" disabled={!dirty} onClick={() => void saveFile()} className="p-1.5 text-[var(--color-ink-2)] hover:text-[var(--color-ink)] disabled:opacity-30" title="Save file (Ctrl+S)">
              <Save className="h-3.5 w-3.5" />
            </button>
            <button type="button" disabled={!activeFile} onClick={() => void runActiveFile()} className="p-1.5 text-[var(--color-ink-2)] hover:text-[var(--color-ink)] disabled:opacity-30" title="Run active file">
              <Play className="h-3.5 w-3.5" />
            </button>
            <button type="button" disabled={!activeFile || debugStarting} onClick={debugSessionId ? () => void stopDebug() : () => void debugActiveFile()} className="p-1.5 text-[var(--color-ink-2)] hover:text-[var(--color-ink)] disabled:opacity-30" title={debugSessionId ? 'Stop Debug' : 'Debug active file'}>
              {debugSessionId ? <Square className="h-3.5 w-3.5 text-[var(--color-danger)]" /> : <Bug className="h-3.5 w-3.5" />}
            </button>
            <button type="button" onClick={() => setShowSettings(true)} className="p-1.5 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]" title="Settings">
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Wrapper goes into the 1fr grid row so breadcrumb + error + editor share the flexible space */}
        <div className="flex min-h-0 flex-col overflow-hidden">

        <BreadcrumbNav filePath={activePath} />

        {editorError && (
          <div className="flex items-center gap-2 border-b border-[var(--color-danger-rule)] bg-[var(--color-danger-bg)] px-3 py-1.5 text-xs text-[var(--color-danger)]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">{editorError}</span>
            <button type="button" onClick={() => setEditorError('')} className="p-0.5 hover:opacity-70">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {showInlineEdit && activeFile && (
            <InlineEditWidget
              filePath={activeFile.path}
              selectionText={editorRef.current?.getModel()?.getValueInRange(editorRef.current.getSelection()!) || activeFile.content}
              onClose={() => setShowInlineEdit(false)}
              onApply={(newCode) => {
                if (!editorRef.current) return
                const selection = editorRef.current.getSelection()
                if (selection && !selection.isEmpty()) {
                  editorRef.current.executeEdits('inline-edit', [{ range: selection, text: newCode, forceMoveMarkers: true }])
                } else {
                  setFiles((prev) => prev.map((f) => (f.path === activeFile.path ? { ...f, content: newCode } : f)))
                }
                setShowInlineEdit(false)
              }}
            />
          )}
          {activeFile ? (
            <>
              <div className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${showMarkdownPreview && activeFile.language === 'markdown' ? 'w-1/2' : 'w-full'}`}>
                <Editor
                  path={activeFile.path}
                  height="100%"
                  language={activeFile.language}
                  value={activeFile.content}
                  onChange={(content) => setFiles((current) => current.map((file) =>
                    file.path === activeFile.path ? { ...file, content: content ?? '' } : file))}
                  theme={document.documentElement.classList.contains('light') ? 'deskclaw-light' : 'deskclaw-dark'}
                  onMount={handleEditorMount}
                  options={editorOptions}
                />
                {splitView && secondaryFile && (
                  <Editor
                    path={`secondary-${secondaryFile.path}`}
                    height="100%"
                    language={secondaryFile.language}
                    value={secondaryFile.content}
                    onChange={(content) => setFiles((current) => current.map((file) =>
                      file.path === secondaryFile.path ? { ...file, content: content ?? '' } : file))}
                    theme={document.documentElement.classList.contains('light') ? 'deskclaw-light' : 'deskclaw-dark'}
                    options={{
                      automaticLayout: true,
                      readOnly: false,
                      bracketPairColorization: { enabled: true },
                      fontSize,
                      minimap: { enabled: false },
                      padding: { top: 10 },
                      scrollBeyondLastLine: false,
                      tabSize: 2,
                    }}
                  />
                )}
              </div>
              {showMarkdownPreview && activeFile.language === 'markdown' && (
                <div className="w-1/2 h-full border-l border-[var(--color-rule)]">
                  <MarkdownPreviewPanel content={activeFile.content} fileName={activeFile.name} />
                </div>
              )}
              {showOutline && (
                <OutlinePanel
                  content={activeFile.content}
                  language={activeFile.language}
                  onSelectSymbol={(line) => {
                    editorRef.current?.revealLineInCenter(line)
                    editorRef.current?.setPosition({ lineNumber: line, column: 1 })
                  }}
                  onClose={() => setShowOutline(false)}
                />
              )}
            </>
          ) : (
            <div className="grid h-full place-items-center">
              <div className="max-w-sm text-center">
                <FileCode2 className="mx-auto mb-4 h-12 w-12 text-[var(--color-rule)]" />
                <h1 className="text-base font-semibold">Open a workspace</h1>
                <p className="mt-1 text-xs leading-5 text-[var(--color-ink-2)]">Choose a folder from Explorer. DeskClaw will keep files, terminal, Git, and the OpenClaw agent in one workbench.</p>
                {!explorerVisible && (
                  <button type="button" onClick={() => setExplorerVisible(true)} className="mt-4 inline-flex h-8 items-center gap-2 bg-[var(--color-accent-strong)] px-3 text-xs text-white">
                    <FolderOpen className="h-3.5 w-3.5" /> Open Explorer
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        {/* end editor wrapper */}</div>

        <QuickOpenModal
          isOpen={quickOpenVisible}
          onClose={() => setQuickOpenVisible(false)}
          workspacePath={workspacePath}
          onOpenFile={(p) => void openFile(p)}
        />

        <GlobalSearchModal
          isOpen={globalSearchVisible}
          onClose={() => setGlobalSearchVisible(false)}
          workspacePath={workspacePath}
          onOpenFile={(p) => void openFile(p)}
        />

        <CommandPaletteModal
          isOpen={commandPaletteVisible}
          onClose={() => setCommandPaletteVisible(false)}
          commands={commandItems}
        />

        {showOpenedEditorsList && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40 backdrop-blur-xs">
            <div className="w-[min(560px,92vw)] rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-3 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-2 mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Layers className="h-4 w-4 text-[var(--color-accent-strong)]" />
                  <span>Opened Editors ({files.length})</span>
                </div>
                <button type="button" onClick={() => setShowOpenedEditorsList(false)} className="p-1 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto workbench-scroll space-y-1">
                {files.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--color-ink-2)]">No editors open.</div>
                ) : (
                  files.map((file) => {
                    const isSelected = file.path === activePath
                    const isModified = file.content !== file.savedContent
                    return (
                      <div
                        key={file.path}
                        onClick={() => {
                          setActivePath(file.path)
                          setShowOpenedEditorsList(false)
                        }}
                        className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-xs rounded cursor-pointer transition-colors ${
                          isSelected ? 'bg-[var(--color-accent)] text-[var(--color-ink)] font-semibold' : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <FileTypeIcon name={file.name} className="h-4 w-4 shrink-0" />
                          <span className="truncate">{file.name}</span>
                          {isModified && <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-warning)]" title="Unsaved changes" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] opacity-60 font-[var(--font-code)] truncate max-w-[180px]">
                            {file.path}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              closeFile(file.path)
                            }}
                            className="p-1 hover:bg-[var(--color-paper-3)] rounded opacity-70 hover:opacity-100"
                            title="Close"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ height: bottomVisible ? bottomHeight : 30 }} className="relative min-h-[30px] border-t border-[var(--color-rule)] bg-[var(--color-paper-2)]">
          {bottomVisible && (
            <div
              className="panel-splitter absolute -top-0.5 left-0 right-0 z-10 h-1 cursor-row-resize"
              onMouseDown={(event) => {
                const startY = event.clientY
                const startHeight = bottomHeight
                const move = (next: MouseEvent) => setBottomHeight(Math.max(120, Math.min(560, startHeight + startY - next.clientY)))
                const up = () => {
                  window.removeEventListener('mousemove', move)
                  window.removeEventListener('mouseup', up)
                  setBottomHeight((height) => {
                    window.localStorage.setItem('deskclaw.bottomHeight', String(height))
                    return height
                  })
                  document.body.style.cursor = ''
                  document.body.style.userSelect = ''
                }
                document.body.style.cursor = 'row-resize'
                document.body.style.userSelect = 'none'
                window.addEventListener('mousemove', move)
                window.addEventListener('mouseup', up)
              }}
            />
          )}
          <div className="flex h-[30px] items-center gap-1 border-b border-[var(--color-rule)] px-1">
            <button type="button" onClick={() => switchBottomPanel('terminal')} className={`flex h-7 items-center gap-1.5 px-2 text-[11px] ${bottomPanel === 'terminal' && bottomVisible ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-2)]'}`}>
              <TerminalSquare className="h-3.5 w-3.5" /> Terminal
            </button>
            <button type="button" onClick={() => switchBottomPanel('git')} className={`flex h-7 items-center gap-1.5 px-2 text-[11px] ${bottomPanel === 'git' && bottomVisible ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-2)]'}`}>
              <GitBranch className="h-3.5 w-3.5" /> Source control
            </button>
            <button type="button" onClick={() => switchBottomPanel('debug')} className={`flex h-7 items-center gap-1.5 px-2 text-[11px] ${bottomPanel === 'debug' && bottomVisible ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-2)]'}`}>
              <Bug className="h-3.5 w-3.5" /> Debug
            </button>
            <button type="button" onClick={() => switchBottomPanel('problems')} className={`flex h-7 items-center gap-1.5 px-2 text-[11px] ${bottomPanel === 'problems' && bottomVisible ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-2)]'}`}>
              <AlertTriangle className={`h-3.5 w-3.5 ${diagnostics.length > 0 ? 'text-[var(--color-warning)]' : ''}`} />
              <span>Problems {diagnostics.length > 0 ? `(${diagnostics.length})` : ''}</span>
            </button>
            <button type="button" onClick={() => switchBottomPanel('github')} className={`flex h-7 items-center gap-1.5 px-2 text-[11px] ${bottomPanel === 'github' && bottomVisible ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-2)]'}`}>
              <GitPullRequest className="h-3.5 w-3.5 text-[var(--color-accent-strong)]" /> GitHub
            </button>
            <button type="button" onClick={() => switchBottomPanel('health')} className={`flex h-7 items-center gap-1.5 px-2 text-[11px] ${bottomPanel === 'health' && bottomVisible ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-2)]'}`}>
              <Activity className="h-3.5 w-3.5 text-[var(--color-success)]" /> Project Health
            </button>
            <div className="ml-auto flex items-center gap-2 px-2 text-[10px] text-[var(--color-ink-2)]">
              <span className="flex items-center gap-1 text-[var(--color-accent-strong)] font-semibold">
                <Command className="h-3 w-3" /> OpenClaw Agent Active
              </span>
              {selectionInfo.chars > 0 && (
                <span>{selectionInfo.lines > 1 ? `${selectionInfo.lines} lines, ${selectionInfo.chars} chars` : `${selectionInfo.chars} chars`}</span>
              )}
              <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
              {activeFile && <span className="capitalize">{activeFile.language}</span>}
            </div>
            <button type="button" onClick={() => setBottomVisible(false)} className="p-1.5 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]" title="Close panel">
              <PanelBottomClose className="h-3.5 w-3.5" />
            </button>
          </div>
          {bottomVisible && (
            <div className="h-[calc(100%-30px)] min-h-0">
              {bottomPanel === 'terminal' && <TerminalPanel onEmpty={() => setBottomVisible(false)} />}
              {bottomPanel === 'git' && <GitPanel workspacePath={workspacePath} />}
              {bottomPanel === 'debug' && <DebugPanel />}
              {bottomPanel === 'problems' && (
                <ProblemsPanel
                  diagnostics={diagnostics}
                  onSelectDiagnostic={(p, line, col) => {
                    void openFile(p).then(() => {
                      editorRef.current?.revealLineInCenter(line)
                      editorRef.current?.setPosition({ lineNumber: line, column: col })
                    })
                  }}
                />
              )}
              {bottomPanel === 'github' && <GitHubPanel workspacePath={workspacePath} />}
              {bottomPanel === 'health' && <ProjectHealthPanel workspacePath={workspacePath} />}
            </div>
          )}
        </div>
      </div>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      <SkillMarketplaceModal isOpen={marketplaceVisible} onClose={() => setMarketplaceVisible(false)} />
      <MemoryEditorModal isOpen={memoryEditorVisible} onClose={() => setMemoryEditorVisible(false)} />
      <ProjectStarterModal isOpen={projectStarterVisible} onClose={() => setProjectStarterVisible(false)} workspacePath={workspacePath} />
      <SnippetExporterModal isOpen={snippetExporterVisible} onClose={() => setSnippetExporterVisible(false)} code={selectedSnippetCode} fileName={activeFile?.name} />
    </div>
  )
}
