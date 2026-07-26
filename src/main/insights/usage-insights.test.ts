import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { collectUsageInsights } from './usage-insights.js'
import { seedDesktopWorkspace } from '../workspace/seed-desktop-workspace.js'

const tmpDirs: string[] = []

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('seedDesktopWorkspace', () => {
  it('creates notes index and templates when missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-ws-'))
    tmpDirs.push(dir)
    const result = seedDesktopWorkspace(dir)
    expect(fs.existsSync(path.join(dir, 'notes', '_index.md'))).toBe(true)
    expect(fs.existsSync(path.join(dir, 'SOUL.md'))).toBe(true)
    expect(fs.readFileSync(path.join(dir, 'SOUL.md'), 'utf8')).toMatch(/Personal notes/)
    expect(result.created.length).toBeGreaterThan(0)
  })

  it('appends notes section to existing SOUL without overwriting HEARTBEAT', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-ws-'))
    tmpDirs.push(dir)
    fs.writeFileSync(path.join(dir, 'SOUL.md'), '# Custom soul\n', 'utf8')
    fs.writeFileSync(path.join(dir, 'HEARTBEAT.md'), '# Keep me\n', 'utf8')
    seedDesktopWorkspace(dir)
    expect(fs.readFileSync(path.join(dir, 'SOUL.md'), 'utf8')).toMatch(/Custom soul/)
    expect(fs.readFileSync(path.join(dir, 'SOUL.md'), 'utf8')).toMatch(/Personal notes/)
    expect(fs.readFileSync(path.join(dir, 'SOUL.md'), 'utf8')).toMatch(/Habit learning/)
    expect(fs.readFileSync(path.join(dir, 'HEARTBEAT.md'), 'utf8')).toMatch(/Keep me/)
    expect(fs.readFileSync(path.join(dir, 'HEARTBEAT.md'), 'utf8')).toMatch(/Habit learning/)
    expect(fs.existsSync(path.join(dir, 'notes', 'preferences.md'))).toBe(true)
  })

  it('is idempotent when habit sections already exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-ws-'))
    tmpDirs.push(dir)
    seedDesktopWorkspace(dir)
    const soul1 = fs.readFileSync(path.join(dir, 'SOUL.md'), 'utf8')
    const hb1 = fs.readFileSync(path.join(dir, 'HEARTBEAT.md'), 'utf8')
    const again = seedDesktopWorkspace(dir)
    expect(fs.readFileSync(path.join(dir, 'SOUL.md'), 'utf8')).toBe(soul1)
    expect(fs.readFileSync(path.join(dir, 'HEARTBEAT.md'), 'utf8')).toBe(hb1)
    expect(again.created).toEqual([])
  })
})

describe('collectUsageInsights', () => {
  it('counts recent sessions from sessions.json', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-ins-'))
    tmpDirs.push(root)
    const sessionsDir = path.join(root, 'agents', 'main', 'sessions')
    fs.mkdirSync(sessionsDir, { recursive: true })
    const now = Date.UTC(2026, 6, 24, 12, 0, 0)
    fs.writeFileSync(
      path.join(sessionsDir, 'sessions.json'),
      JSON.stringify({
        'agent:main:whatsapp:direct:+1': {
          updatedAt: now - 2 * 24 * 60 * 60 * 1000,
          lastInteractionAt: now - 2 * 24 * 60 * 60 * 1000,
          inputTokens: 100,
          outputTokens: 10,
        },
        'agent:main:main': {
          updatedAt: now - 20 * 24 * 60 * 60 * 1000,
          lastInteractionAt: now - 20 * 24 * 60 * 60 * 1000,
          inputTokens: 50,
          outputTokens: 5,
        },
      }),
      'utf8',
    )

    const summary = collectUsageInsights({ stateDir: root, now })
    expect(summary.periods.d7.sessions).toBe(1)
    expect(summary.periods.d7.byChannel.whatsapp).toBe(1)
    expect(summary.periods.d30.sessions).toBe(2)
    expect(summary.periods.d30.inputTokens).toBe(150)
  })
})
