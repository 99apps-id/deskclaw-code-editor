import React, { useState } from 'react'
import { Sparkles, ArrowRight, X, Loader2 } from 'lucide-react'

export interface InlineEditWidgetProps {
  selectionText: string
  filePath: string
  onClose: () => void
  onApply: (newCode: string) => void
}

export function InlineEditWidget({ selectionText, filePath, onClose, onApply }: InlineEditWidgetProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const fullPrompt = `Edit the following code section in file "${filePath}".
Instruction: ${prompt}

Code selection:
\`\`\`
${selectionText}
\`\`\`

Return ONLY the updated replacement code, with no extra conversational text or markdown code fences.`

      const result = await window.electronAPI.agentChat({
        message: fullPrompt,
        model: undefined,
        approvalPolicy: 'full-access',
      })

      if (result.ok && result.response) {
        let clean = result.response.trim()
        if (clean.startsWith('```')) {
          const lines = clean.split('\n')
          lines.shift()
          if (lines[lines.length - 1]?.startsWith('```')) lines.pop()
          clean = lines.join('\n')
        }
        onApply(clean)
      } else {
        setError(result.error || 'Failed to generate inline edit.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inline edit request failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 w-[min(540px,90vw)] rounded-[var(--radius-panel)] border border-[var(--color-accent-strong)] bg-[var(--color-paper-2)] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-accent-strong)]" />
        <input
          type="text"
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Edit selected code with AI (e.g. Refactor to async, add types, fix bug)..."
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--color-ink-2)]"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="flex h-6 items-center gap-1 rounded bg-[var(--color-accent-strong)] px-2 text-[11px] text-white disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
          <span>{loading ? 'Generating' : 'Generate'}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </form>
      {error && <div className="mt-1 text-[10px] text-[var(--color-danger)]">{error}</div>}
    </div>
  )
}
