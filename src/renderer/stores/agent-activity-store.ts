import { create } from 'zustand'
import type { AgentAction, AgentDiff } from '../../shared/electron-api'

export type AgentPhase = 'working' | 'editing' | 'running' | 'idle'
type FileChanges = { additions: number; deletions: number }

interface AgentActivityState {
  phase: AgentPhase
  activeFiles: string[]
  changes: Record<string, FileChanges>
  begin: () => void
  recordAction: (action: AgentAction) => void
  recordDiff: (diff: AgentDiff) => void
  finish: () => void
  reset: () => void
}

function phaseForAction(type: string): AgentPhase {
  const value = type.toLowerCase()
  if (/(exec|command|shell|terminal|run|test)/.test(value)) return 'running'
  if (/(edit|write|patch|create|delete|file)/.test(value)) return 'editing'
  return 'working'
}

function countLineChanges(original: string, modified: string): FileChanges {
  const before = original.replace(/\r\n/g, '\n').split('\n')
  const after = modified.replace(/\r\n/g, '\n').split('\n')
  let start = 0
  while (start < before.length && start < after.length && before[start] === after[start]) start += 1
  let beforeEnd = before.length - 1
  let afterEnd = after.length - 1
  while (beforeEnd >= start && afterEnd >= start && before[beforeEnd] === after[afterEnd]) {
    beforeEnd -= 1
    afterEnd -= 1
  }
  return {
    additions: Math.max(0, afterEnd - start + 1),
    deletions: Math.max(0, beforeEnd - start + 1),
  }
}

export const useAgentActivityStore = create<AgentActivityState>((set) => ({
  phase: 'idle',
  activeFiles: [],
  changes: {},
  begin: () => set({ phase: 'working', activeFiles: [], changes: {} }),
  recordAction: (action) => set((state) => ({
    phase: phaseForAction(action.type),
    activeFiles: action.filePath ? [...new Set([...state.activeFiles, action.filePath])] : state.activeFiles,
  })),
  recordDiff: (diff) => set((state) => ({
    phase: 'editing',
    activeFiles: [...new Set([...state.activeFiles, diff.filePath])],
    changes: { ...state.changes, [diff.filePath]: countLineChanges(diff.original, diff.modified) },
  })),
  finish: () => set({ phase: 'idle', activeFiles: [] }),
  reset: () => set({ phase: 'idle', activeFiles: [], changes: {} }),
}))

export function formatEditSummary(changes: Record<string, FileChanges>): string | null {
  const entries = Object.values(changes)
  if (entries.length === 0) return null
  const additions = entries.reduce((total, change) => total + change.additions, 0)
  const deletions = entries.reduce((total, change) => total + change.deletions, 0)
  return `Edited ${entries.length} ${entries.length === 1 ? 'File' : 'Files'} +${additions}/-${deletions}`
}
