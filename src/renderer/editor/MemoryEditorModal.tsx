import { useEffect, useState } from 'react'
import { Brain, Save, X, Loader2 } from 'lucide-react'

export interface MemoryEditorModalProps {
  isOpen: boolean
  onClose: () => void
}

type MemoryKind = 'preferences' | 'memory' | 'soul' | 'user'

export function MemoryEditorModal({ isOpen, onClose }: MemoryEditorModalProps) {
  const [activeTab, setActiveTab] = useState<MemoryKind>('preferences')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contents, setContents] = useState<Record<MemoryKind, string>>({
    preferences: '',
    memory: '',
    soul: '',
    user: '',
  })
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!isOpen) return
    void loadMemory()
  }, [isOpen])

  const loadMemory = async () => {
    setLoading(true)
    setNotice('')
    try {
      const data = await window.electronAPI.workspaceMemoryRead()
      setContents({
        preferences: data.preferences || '',
        memory: data.memory || '',
        soul: data.soul || '',
        user: data.user || '',
      })
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not read workspace memory.')
    } finally {
      setLoading(false)
    }
  }

  const saveCurrentTab = async () => {
    setSaving(true)
    setNotice('')
    try {
      await window.electronAPI.workspaceMemoryWrite({
        kind: activeTab,
        content: contents[activeTab],
      })
      setNotice(`Saved ${activeTab} successfully!`)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to save memory.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-[min(640px,92vw)] rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[var(--color-accent-strong)]" />
            <h2 className="text-sm font-semibold">OpenClaw Workspace Memory & Guidelines</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 border-b border-[var(--color-rule)] mb-3 pb-1">
          {(['preferences', 'memory', 'soul', 'user'] as MemoryKind[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs rounded capitalize font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[var(--color-accent)] text-[var(--color-ink)]'
                  : 'text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]'
              }`}
            >
              {tab === 'preferences' ? 'Rules & Guidelines' : tab}
            </button>
          ))}
        </div>

        {notice && (
          <div className="mb-3 rounded border border-[var(--color-rule)] bg-[var(--color-paper-3)] p-2 text-xs text-[var(--color-ink)] flex items-center justify-between">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')}><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-[260px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 text-xs text-[var(--color-ink-2)]">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <span>Loading workspace memory...</span>
            </div>
          ) : (
            <textarea
              value={contents[activeTab]}
              onChange={(e) => setContents((prev) => ({ ...prev, [activeTab]: e.target.value }))}
              placeholder={`Enter project ${activeTab} guidelines, standing preferences, or instructions...`}
              className="flex-1 w-full resize-none rounded border border-[var(--color-rule)] bg-[var(--color-paper)] p-3 text-xs font-mono outline-none focus:border-[var(--color-accent-strong)]"
            />
          )}
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded bg-[var(--color-paper-3)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void saveCurrentTab()}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-[var(--color-accent-strong)] text-white hover:bg-[var(--color-accent)] disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>{saving ? 'Saving...' : `Save ${activeTab}`}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
