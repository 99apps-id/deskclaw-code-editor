import React from 'react'
import { AlertTriangle, CheckCircle2, Sparkles, XCircle } from 'lucide-react'

export interface DiagnosticItem {
  id: string
  filePath: string
  fileName: string
  message: string
  severity: 'error' | 'warning' | 'info'
  lineNumber: number
  column: number
}

interface ProblemsPanelProps {
  diagnostics: DiagnosticItem[]
  onSelectDiagnostic: (filePath: string, line: number, col: number) => void
}

export function ProblemsPanel({ diagnostics, onSelectDiagnostic }: ProblemsPanelProps) {
  const errors = diagnostics.filter((d) => d.severity === 'error')
  const warnings = diagnostics.filter((d) => d.severity === 'warning')

  const fixWithAI = (e: React.MouseEvent, diag: DiagnosticItem) => {
    e.stopPropagation()
    const prompt = `Fix the following ${diag.severity} in file "${diag.filePath}" at line ${diag.lineNumber}, column ${diag.column}:
Error message: ${diag.message}

Please inspect the file, locate the problem, and apply the necessary fix.`

    void window.electronAPI.agentChat({
      message: prompt,
      approvalPolicy: 'full-access',
    })
  }

  return (
    <div className="flex h-full w-full flex-col bg-[var(--color-paper)] overflow-hidden">
      <div className="flex h-7 items-center gap-4 border-b border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 text-[11px] font-semibold shrink-0">
        <div className="flex items-center gap-1 text-[var(--color-danger)]">
          <XCircle className="h-3.5 w-3.5" />
          <span>{errors.length} Error{errors.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-1 text-[var(--color-warning)]">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{warnings.length} Warning{warnings.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto workbench-scroll p-1 space-y-0.5">
        {diagnostics.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs text-[var(--color-ink-2)]">
            <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
            <span>No problems detected in open files.</span>
          </div>
        ) : (
          diagnostics.map((diag) => (
            <div
              key={diag.id}
              onClick={() => onSelectDiagnostic(diag.filePath, diag.lineNumber, diag.column)}
              className="flex w-full items-center justify-between gap-3 px-2 py-1.5 text-left text-xs rounded hover:bg-[var(--color-paper-3)] transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate min-w-0">
                {diag.severity === 'error' ? (
                  <XCircle className="h-3.5 w-3.5 text-[var(--color-danger)] shrink-0" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-[var(--color-warning)] shrink-0" />
                )}
                <span className="truncate text-[var(--color-ink)]">{diag.message}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] text-[var(--color-ink-2)]">
                <span>{diag.fileName}</span>
                <span className="text-[var(--color-accent-strong)]">[{diag.lineNumber}:{diag.column}]</span>
                <button
                  type="button"
                  onClick={(e) => fixWithAI(e, diag)}
                  className="flex items-center gap-1 rounded bg-[var(--color-accent-strong)] px-1.5 py-0.5 text-[10px] text-white opacity-90 hover:opacity-100 transition-opacity"
                  title="Ask OpenClaw AI to fix this error"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Fix with AI</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
