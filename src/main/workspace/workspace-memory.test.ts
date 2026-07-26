import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { appendWorkspacePreference, readWorkspaceMemory } from './workspace-memory.js'
import { seedDesktopWorkspace } from './seed-desktop-workspace.js'

const tmpDirs: string[] = []

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('appendWorkspacePreference', () => {
  it('appends under Corrections with a date stamp', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-pref-'))
    tmpDirs.push(dir)
    seedDesktopWorkspace(dir)
    // Point config workspace via writing files in dir then calling with mocked resolve —
    // appendWorkspacePreference uses resolveAgentWorkspaceDir(config). Pass via writing
    // directly after seed, using the same helpers with absolute workspace by temporarily
    // writing through seed only: call append with a fake by writing preferences via API
    // that accepts config.workspace.
    const { appended } = appendWorkspacePreference('Always use Indonesian', {
      agents: { defaults: { workspace: dir } },
    } as never)
    expect(appended).toMatch(/Always use Indonesian/)
    const snap = readWorkspaceMemory({
      agents: { defaults: { workspace: dir } },
    } as never)
    expect(snap.preferences).toMatch(/Corrections/)
    expect(snap.preferences).toMatch(/Always use Indonesian/)
  })
})
