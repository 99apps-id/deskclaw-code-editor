/**
 * Aggregate lightweight usage insights from on-disk session stores
 * (`agents/<id>/sessions/sessions.json`) without invoking the CLI.
 */

import fs from 'node:fs'
import path from 'node:path'
import { getUserDataDir } from '../utils/paths.js'

export interface UsageInsightsPeriod {
  days: number
  sessions: number
  inputTokens: number
  outputTokens: number
  byChannel: Record<string, number>
}

export interface UsageInsightsSummary {
  generatedAt: string
  periods: {
    d7: UsageInsightsPeriod
    d30: UsageInsightsPeriod
  }
  primaryModel?: string
  fallbacks: string[]
}

interface SessionRow {
  updatedAt?: number
  lastInteractionAt?: number
  inputTokens?: number
  outputTokens?: number
  key?: string
}

function emptyPeriod(days: number): UsageInsightsPeriod {
  return { days, sessions: 0, inputTokens: 0, outputTokens: 0, byChannel: {} }
}

function channelFromKey(key: string): string {
  // agent:main:whatsapp:direct:+62… → whatsapp
  // agent:main:main → chat
  const parts = key.split(':')
  if (parts.length >= 3) {
    const maybe = parts[2]
    if (maybe && maybe !== 'main' && maybe !== 'subagent' && maybe !== 'dashboard') {
      return maybe
    }
  }
  return 'chat'
}

function collectSessionFiles(agentsRoot: string): string[] {
  if (!fs.existsSync(agentsRoot)) return []
  const out: string[] = []
  for (const entry of fs.readdirSync(agentsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = path.join(agentsRoot, entry.name, 'sessions', 'sessions.json')
    if (fs.existsSync(file)) out.push(file)
  }
  return out
}

function readSessions(filePath: string): SessionRow[] {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
    return Object.entries(raw as Record<string, unknown>).map(([key, value]) => {
      const row = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
      return {
        key,
        updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : undefined,
        lastInteractionAt:
          typeof row.lastInteractionAt === 'number' ? row.lastInteractionAt : undefined,
        inputTokens: typeof row.inputTokens === 'number' ? row.inputTokens : undefined,
        outputTokens: typeof row.outputTokens === 'number' ? row.outputTokens : undefined,
      }
    })
  } catch {
    return []
  }
}

function accumulate(period: UsageInsightsPeriod, row: SessionRow, now: number): void {
  const ts = row.lastInteractionAt ?? row.updatedAt
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return
  const ageMs = now - ts
  if (ageMs < 0 || ageMs > period.days * 24 * 60 * 60 * 1000) return
  period.sessions += 1
  period.inputTokens += Math.max(0, row.inputTokens ?? 0)
  period.outputTokens += Math.max(0, row.outputTokens ?? 0)
  const channel = channelFromKey(row.key ?? '')
  period.byChannel[channel] = (period.byChannel[channel] ?? 0) + 1
}

export function collectUsageInsights(opts?: {
  stateDir?: string
  primaryModel?: string
  fallbacks?: string[]
  now?: number
}): UsageInsightsSummary {
  const stateDir = opts?.stateDir ?? getUserDataDir()
  const now = opts?.now ?? Date.now()
  const d7 = emptyPeriod(7)
  const d30 = emptyPeriod(30)
  for (const file of collectSessionFiles(path.join(stateDir, 'agents'))) {
    for (const row of readSessions(file)) {
      accumulate(d7, row, now)
      accumulate(d30, row, now)
    }
  }
  return {
    generatedAt: new Date(now).toISOString(),
    periods: { d7, d30 },
    primaryModel: opts?.primaryModel,
    fallbacks: opts?.fallbacks ?? [],
  }
}
