/**
 * DeskClaw Code Editor — File Explorer sidebar.
 * Real file system tree using Electron IPC.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Folder, FolderOpen, ChevronRight, ChevronDown, ChevronsUp,
  FilePlus, FolderPlus, RefreshCw, PanelRightClose,
  FolderOpen as FolderOpenIcon,
  PencilLine, Search,
} from 'lucide-react'
import { useAgentActivityStore } from '../stores/agent-activity-store'
import { FileTypeIcon } from './FileTypeIcon'

export interface FileTreeItem {
  name: string
  path: string
  isDirectory: boolean
  children?: FileTreeItem[]
}

export interface FileExplorerProps {
  onOpenFile: (path: string) => void
  onToggle: () => void
  onWorkspaceChange?: (path: string) => void
  width?: number
  onWidthChange?: (w: number) => void
}

export function FileExplorer({ onOpenFile, onToggle, onWorkspaceChange, width = 240, onWidthChange }: FileExplorerProps) {
  const { t } = useTranslation()
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [rootItems, setRootItems] = useState<FileTreeItem[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [childrenCache, setChildrenCache] = useState<Record<string, FileTreeItem[]>>({})
  const resizingRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FileTreeItem } | null>(null)
  const activeFiles = useAgentActivityStore((state) => state.activeFiles)

  useEffect(() => {
    const handleCloseCtx = () => setContextMenu(null)
    window.addEventListener('click', handleCloseCtx)
    return () => window.removeEventListener('click', handleCloseCtx)
  }, [])

  const handleContextMenu = (e: React.MouseEvent, item: FileTreeItem) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedPath(item.path)
    setContextMenu({ x: e.clientX, y: e.clientY, item })
  }

  const handleDeleteItem = async (item: FileTreeItem) => {
    if (!workspacePath) return
    if (!window.confirm(`Are you sure you want to delete ${item.name}?`)) return
    try {
      await window.electronAPI.editorDeleteFile(item.path, workspacePath)
      await refreshWorkspace()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete item.')
    }
  }

  const handleDuplicateItem = async (item: FileTreeItem) => {
    if (item.isDirectory) return
    try {
      const data = await window.electronAPI.editorReadFile(item.path)
      const extIdx = item.path.lastIndexOf('.')
      const copyPath = extIdx !== -1 ? `${item.path.slice(0, extIdx)}.copy${item.path.slice(extIdx)}` : `${item.path}.copy`
      await window.electronAPI.editorCreateFile(copyPath, false)
      await window.electronAPI.editorWriteFile(copyPath, data.content)
      await refreshWorkspace()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not duplicate file.')
    }
  }

  const handleRenameItem = async (item: FileTreeItem) => {
    if (!workspacePath) return
    const newName = window.prompt(`Rename "${item.name}" to:`, item.name)
    if (!newName || !newName.trim() || newName.trim() === item.name) return
    const dir = item.path.slice(0, Math.max(item.path.lastIndexOf('/'), item.path.lastIndexOf('\\')))
    const sep = item.path.includes('\\') ? '\\' : '/'
    const newPath = `${dir}${sep}${newName.trim()}`
    try {
      if (item.isDirectory) {
        await window.electronAPI.editorCreateFile(newPath, true)
      } else {
        const data = await window.electronAPI.editorReadFile(item.path)
        await window.electronAPI.editorCreateFile(newPath, false)
        await window.electronAPI.editorWriteFile(newPath, data.content)
        await window.electronAPI.editorDeleteFile(item.path, workspacePath)
      }
      await refreshWorkspace()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename item.')
    }
  }

  const collapseAll = () => setExpanded(new Set())

  // Resize handlers
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const resize = resizingRef.current
      if (!resize || !onWidthChange) return
      onWidthChange(Math.max(176, Math.min(Math.min(640, window.innerWidth * 0.55), resize.startWidth + e.clientX - resize.startX)))
    }
    const onMouseUp = () => {
      if (!resizingRef.current) return
      resizingRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onWidthChange])

  const loadDir = useCallback(async (dirPath: string): Promise<FileTreeItem[]> => {
    try {
      const result = await window.electronAPI.editorListDir(dirPath)
      setError('')
      return result.items.map((item) => ({
        name: item.name,
        path: item.path,
        isDirectory: item.isDirectory,
      }))
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Folder could not be read.'
      setError(message)
      throw new Error(message)
    }
  }, [])

  const refreshWorkspace = useCallback(async (pathToRefresh = workspacePath) => {
    if (!pathToRefresh) return
    setLoading(true)
    setError('')
    try {
      try {
        const items = await loadDir(pathToRefresh)
        setRootItems(items)
        setChildrenCache({})
      } catch {
        // Keep the last valid tree visible while showing the read error.
      }
    } finally {
      setLoading(false)
    }
  }, [loadDir, workspacePath])

  const openWorkspace = useCallback(async () => {
    try {
      const result = await window.electronAPI.editorOpenFolder()
      if (result.path) {
        setError('')
        setWorkspacePath(result.path)
        window.localStorage.setItem('deskclaw.workspacePath', result.path)
        onWorkspaceChange?.(result.path)
        setLoading(true)
        const items = await loadDir(result.path)
        setRootItems(items)
        setExpanded(new Set([result.path]))
        setChildrenCache({})
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Folder could not be opened.')
    } finally {
      setLoading(false)
    }
  }, [loadDir, onWorkspaceChange])

  useEffect(() => {
    const remembered = window.localStorage.getItem('deskclaw.workspacePath')
    if (!remembered) return
    let mounted = true
    setLoading(true)
    void loadDir(remembered)
      .then((items) => {
        if (!mounted) return
        setWorkspacePath(remembered)
        setRootItems(items)
        setExpanded(new Set([remembered]))
        onWorkspaceChange?.(remembered)
      })
      .catch(() => window.localStorage.removeItem('deskclaw.workspacePath'))
      .finally(() => { if (mounted) setLoading(false) })
    return () => {
      mounted = false
    }
    // Workspace restoration is intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createEntry = async (isDirectory: boolean) => {
    if (!workspacePath) return
    const label = isDirectory ? 'folder' : 'file'
    const name = window.prompt(`New ${label} name`)
    if (!name?.trim()) return
    if (name.includes('/') || name.includes('\\')) {
      setError('Enter a name only, without path separators.')
      return
    }
    let parentDir = workspacePath
    if (selectedPath) {
      if (expanded.has(selectedPath)) {
        parentDir = selectedPath
      } else {
        const lastSep = Math.max(selectedPath.lastIndexOf('/'), selectedPath.lastIndexOf('\\'))
        if (lastSep > 0) {
          parentDir = selectedPath.slice(0, lastSep)
        }
      }
    }
    const separator = parentDir.includes('\\') ? '\\' : '/'
    try {
      await window.electronAPI.editorCreateFile(`${parentDir}${separator}${name.trim()}`, isDirectory)
      if (parentDir !== workspacePath) {
        setChildrenCache((prev) => {
          const next = { ...prev }
          delete next[parentDir]
          return next
        })
      }
      await refreshWorkspace()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : `Could not create ${label}.`)
    }
  }

  // Don't auto-open folder on mount — wait for user action

  const toggleExpand = useCallback(async (dirPath: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(dirPath)) next.delete(dirPath)
      else next.add(dirPath)
      return next
    })
    if (!childrenCache[dirPath]) {
      try {
        const items = await loadDir(dirPath)
        setChildrenCache((prev) => ({ ...prev, [dirPath]: items }))
      } catch {
        setExpanded((prev) => {
          const next = new Set(prev)
          next.delete(dirPath)
          return next
        })
      }
    }
  }, [childrenCache, loadDir])

  const renderTree = (items: FileTreeItem[], depth = 0): React.ReactNode => {
    const filteredItems = filterText.trim()
      ? items.filter((item) => item.isDirectory || item.name.toLowerCase().includes(filterText.toLowerCase().trim()))
      : items

    return filteredItems.map((item) => {
      const isExpanded = expanded.has(item.path)
      const paddingLeft = 8 + depth * 14
      const isActive = activeFiles.includes(item.path)
      const hasActiveChild = item.isDirectory && activeFiles.some((filePath) =>
        filePath.startsWith(`${item.path}\\`) || filePath.startsWith(`${item.path}/`))

      if (item.isDirectory) {
        const children = childrenCache[item.path] || []
        return (
          <div key={item.path}>
            <div
              className="group flex items-center gap-1 px-2 py-1 text-xs text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
              style={{ paddingLeft }}
              onClick={() => void toggleExpand(item.path)}
              onContextMenu={(e) => handleContextMenu(e, item)}
            >
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </span>
              {isExpanded
                ? <FolderOpen className="h-4 w-4 shrink-0 text-[var(--color-warning)]" />
                : <Folder className="h-4 w-4 shrink-0 text-[var(--color-warning)]" />
              }
              <span className="truncate">{item.name}</span>
              {hasActiveChild && <span className="agent-file-indicator ml-auto" title="OpenClaw is working in this folder" />}
            </div>
            {isExpanded && (
              children.length > 0 ? (
                <div>{renderTree(children, depth + 1)}</div>
              ) : (
                <div
                  className="px-2 py-0.5 text-[10px] text-[var(--color-ink-2)] italic opacity-50"
                  style={{ paddingLeft: paddingLeft + 18 }}
                >
                  (empty)
                </div>
              )
            )}
          </div>
        )
      }

      return (
        <button
          type="button"
          key={item.path}
          className={`flex w-full items-center gap-1 px-2 py-1 text-left text-xs ${
            selectedPath === item.path
              ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
              : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]'
          }`}
          style={{ paddingLeft: paddingLeft + 18 }}
          onClick={() => {
            setSelectedPath(item.path)
            onOpenFile(item.path)
          }}
          onContextMenu={(e) => handleContextMenu(e, item)}
        >
          <FileTypeIcon name={item.name} />
          <span className="truncate">{item.name}</span>
          {isActive && <PencilLine className="agent-file-editing ml-auto h-3.5 w-3.5 shrink-0 text-[var(--color-warning)]" aria-label="OpenClaw is editing this file" />}
        </button>
      )
    })
  }

  return (
    <div className="relative flex h-full min-h-0 shrink-0 flex-col overflow-hidden bg-[var(--color-paper-2)]" style={{ width }}>
      <div className="flex items-center justify-between border-b border-[var(--color-rule)] px-3 py-2">
        <span className="text-xs font-semibold tracking-tight text-[var(--color-ink-2)]">{t('editor.explorer', 'Explorer')}</span>
        <div className="flex items-center gap-0.5">
          <button className="p-1 text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
            onClick={() => void openWorkspace()} title={t('editor.openFolder', 'Open Folder')}>
            <FolderOpenIcon className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]"
            onClick={onToggle} title={t('editor.closeExplorer', 'Close Explorer')}>
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {workspacePath && (
        <div className="truncate border-b border-[var(--color-rule)] px-3 py-1.5 text-[10px] text-[var(--color-ink-2)]">
          {workspacePath}
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-[var(--color-rule)] px-2 py-1">
        <button disabled={!workspacePath || loading} className="p-1 text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] disabled:opacity-40" onClick={() => void createEntry(false)} title="New file"><FilePlus className="w-3.5 h-3.5" /></button>
        <button disabled={!workspacePath || loading} className="p-1 text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] disabled:opacity-40" onClick={() => void createEntry(true)} title="New folder"><FolderPlus className="w-3.5 h-3.5" /></button>
        <button disabled={!workspacePath || loading} className="p-1 text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] disabled:opacity-40"
          onClick={() => void refreshWorkspace()} title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button disabled={!workspacePath || expanded.size === 0} className="p-1 text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)] disabled:opacity-40" onClick={collapseAll} title="Collapse All Folders">
          <ChevronsUp className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1" />
      </div>

      {workspacePath && (
        <div className="border-b border-[var(--color-rule)] px-2 py-1">
          <div className="flex items-center gap-1.5 rounded bg-[var(--color-paper)] px-2 py-0.5 border border-[var(--color-rule)]">
            <Search className="h-3 w-3 text-[var(--color-ink-2)] shrink-0" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter files..."
              className="w-full bg-transparent text-[11px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-2)]"
            />
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && (
          <div className="m-2 flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--color-danger-rule)] bg-[var(--color-danger-bg)] p-2 text-[11px] text-[var(--color-danger)]">
            <span className="min-w-0 flex-1">{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error"><PanelRightClose className="h-3 w-3" /></button>
          </div>
        )}
        {loading ? (
          <div className="flex items-center gap-2 p-4 text-xs text-[var(--color-ink-2)]"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Reading folder…</div>
        ) : !workspacePath ? (
          <div className="p-4 text-center text-xs text-[var(--color-ink-2)]">
            <button className="text-[var(--color-accent-strong)] underline hover:no-underline" onClick={() => void openWorkspace()}>
              Open Folder
            </button>
            <p className="mt-2 text-[var(--color-ink-2)]">to browse files</p>
          </div>
        ) : rootItems.length === 0 ? (
          <div className="p-4 text-xs text-[var(--color-ink-2)]">This folder is empty.</div>
        ) : (
          renderTree(rootItems)
        )}
      </div>
      {/* Resize handle */}
      <div
        className="panel-splitter panel-splitter--vertical absolute -right-[3px] top-0 z-40 h-full w-[7px]"
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label="Resize Explorer"
        aria-valuemin={176}
        aria-valuemax={640}
        aria-valuenow={Math.round(width)}
        onKeyDown={(event) => {
          if (!onWidthChange || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return
          event.preventDefault()
          const next = Math.max(176, Math.min(640, width + (event.key === 'ArrowRight' ? 16 : -16)))
          onWidthChange(next)
          window.localStorage.setItem('deskclaw.explorerWidth', String(next))
        }}
        onMouseDown={(event) => {
          event.preventDefault()
          resizingRef.current = { startX: event.clientX, startWidth: width }
          document.body.style.cursor = 'col-resize'
          document.body.style.userSelect = 'none'
        }}
      />

      {contextMenu && (
        <div
          className="fixed z-50 min-w-36 rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-1 text-xs shadow-xl animate-in fade-in duration-75"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-[var(--color-paper-3)]"
            onClick={() => {
              void navigator.clipboard.writeText(contextMenu.item.path)
              setContextMenu(null)
            }}
          >
            Copy Path
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-[var(--color-paper-3)]"
            onClick={() => {
              if (workspacePath) {
                const rel = contextMenu.item.path.startsWith(workspacePath)
                  ? contextMenu.item.path.slice(workspacePath.length).replace(/^[/\\]/, '')
                  : contextMenu.item.path
                void navigator.clipboard.writeText(rel)
              }
              setContextMenu(null)
            }}
          >
            Copy Relative Path
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-[var(--color-paper-3)]"
            onClick={() => {
              void handleRenameItem(contextMenu.item)
              setContextMenu(null)
            }}
          >
            Rename
          </button>
          {!contextMenu.item.isDirectory && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-[var(--color-paper-3)]"
              onClick={() => {
                void handleDuplicateItem(contextMenu.item)
                setContextMenu(null)
              }}
            >
              Duplicate
            </button>
          )}
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[var(--color-danger)] hover:bg-[var(--color-paper-3)]"
            onClick={() => {
              void handleDeleteItem(contextMenu.item)
              setContextMenu(null)
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
