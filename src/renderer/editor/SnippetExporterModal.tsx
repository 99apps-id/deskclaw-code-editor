import React, { useState } from 'react'
import { Camera, Copy, Check, X, Download } from 'lucide-react'

export interface SnippetExporterModalProps {
  isOpen: boolean
  onClose: () => void
  code: string
  fileName?: string
}

export function SnippetExporterModal({ isOpen, onClose, code, fileName = 'snippet.tsx' }: SnippetExporterModalProps) {
  const [copied, setCopied] = useState(false)
  const [themeGradient, setThemeGradient] = useState('from-indigo-500 via-purple-500 to-pink-500')

  const copyImagePrompt = () => {
    void navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[min(680px,94vw)] rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-[var(--color-accent-strong)]" />
            <h2 className="text-sm font-semibold">Code Snippet Card Exporter</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-[var(--color-ink-2)]">Card Theme:</span>
          {[
            { id: 'indigo', bg: 'from-indigo-500 via-purple-500 to-pink-500' },
            { id: 'cyan', bg: 'from-cyan-500 to-blue-500' },
            { id: 'emerald', bg: 'from-emerald-400 to-teal-600' },
            { id: 'amber', bg: 'from-amber-400 to-orange-600' },
          ].map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setThemeGradient(g.bg)}
              className={`h-5 w-5 rounded-full bg-gradient-to-r ${g.bg} border-2 ${themeGradient === g.bg ? 'border-white scale-110' : 'border-transparent opacity-70'}`}
            />
          ))}
        </div>

        {/* Carbon Card Preview */}
        <div className={`p-6 rounded-lg bg-gradient-to-br ${themeGradient} shadow-2xl overflow-hidden mb-4`}>
          <div className="rounded-lg bg-[#1e1e2e] shadow-xl border border-white/10 overflow-hidden font-mono text-xs">
            <div className="flex items-center justify-between px-3 py-2 bg-[#181825] border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
              </div>
              <span className="text-[11px] text-white/50">{fileName}</span>
            </div>
            <pre className="p-4 text-white/90 overflow-x-auto workbench-scroll leading-relaxed">
              <code>{code || '// Select code in Monaco editor first'}</code>
            </pre>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded bg-[var(--color-paper-3)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={copyImagePrompt}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded bg-[var(--color-accent-strong)] text-white hover:bg-[var(--color-accent)]"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
