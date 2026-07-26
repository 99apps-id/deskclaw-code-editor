/**
 * Read/write workspace memory files + export/import agent identity pack.
 * Import is safe: only extracts known-pack files, never blindly unzips workspace.
 */

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { dialog } from 'electron'
import type { OpenClawConfig } from '../../shared/types.js'
import { getUserDataDir } from '../utils/paths.js'
import { resolveAgentWorkspaceDir } from './seed-desktop-workspace.js'

export type WorkspaceMemoryKind = 'preferences' | 'memory' | 'soul' | 'user'

const KIND_REL: Record<WorkspaceMemoryKind, string> = {
  preferences: path.join('notes', 'preferences.md'),
  memory: 'MEMORY.md',
  soul: 'SOUL.md',
  user: 'USER.md',
}

/** Files in an agent identity pack — no other paths are extracted. */
const PACK_FILES = Object.freeze([
  'SOUL.md',
  'MEMORY.md',
  'USER.md',
  'HEARTBEAT.md',
  'IDENTITY.md',
  path.join('notes', '_index.md'),
  path.join('notes', 'preferences.md'),
])

/** Normalize extracted name to be safe (no parent traversal). */
function safePackName(name: string): string | null {
  const normalized = path.normalize(name).replace(/\\/g, '/')
  if (
    normalized.includes('..') ||
    normalized.startsWith('/') ||
    normalized.startsWith('.') ||
    !PACK_FILES.includes(normalized)
  ) {
    return null
  }
  return normalized
}

export interface WorkspaceMemorySnapshot {
  workspaceDir: string
  preferences: string
  memory: string
  soul: string
  user: string
}

function readKind(workspaceDir: string, kind: WorkspaceMemoryKind): string {
  const p = path.join(workspaceDir, KIND_REL[kind])
  try {
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''
  } catch {
    return ''
  }
}

export function readWorkspaceMemory(config?: OpenClawConfig | null): WorkspaceMemorySnapshot {
  const workspaceDir = resolveAgentWorkspaceDir(config)
  return {
    workspaceDir,
    preferences: readKind(workspaceDir, 'preferences'),
    memory: readKind(workspaceDir, 'memory'),
    soul: readKind(workspaceDir, 'soul'),
    user: readKind(workspaceDir, 'user'),
  }
}

export function writeWorkspaceMemoryFile(
  kind: WorkspaceMemoryKind,
  content: string,
  config?: OpenClawConfig | null,
): { path: string } {
  const workspaceDir = resolveAgentWorkspaceDir(config)
  const filePath = path.join(workspaceDir, KIND_REL[kind])
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf8')
  return { path: filePath }
}

export function appendWorkspacePreference(
  line: string,
  config?: OpenClawConfig | null,
  section: 'Standing preferences' | 'Corrections' = 'Corrections',
): { path: string; appended: string } {
  const trimmed = line.trim()
  if (!trimmed) throw new Error('Preference text is required')
  const workspaceDir = resolveAgentWorkspaceDir(config)
  const filePath = path.join(workspaceDir, KIND_REL.preferences)
  let existing = ''
  try {
    existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : ''
  } catch {
    existing = ''
  }
  if (!existing.trim()) {
    existing = `# Preferences\n\n## Standing preferences\n\n## Corrections\n\n`
  }
  const bullet = trimmed.startsWith('- ') ? trimmed : `- ${trimmed}`
  const stamp = new Date().toISOString().slice(0, 10)
  const entry = `${bullet} (${stamp})`
  const heading = `## ${section}`
  if (existing.includes(heading)) {
    const idx = existing.indexOf(heading)
    const after = existing.slice(idx + heading.length)
    const nextHeading = after.search(/\n##\s/)
    const insertAt = nextHeading >= 0 ? idx + heading.length + nextHeading : existing.length
    const before = existing.slice(0, insertAt).trimEnd()
    const rest = existing.slice(insertAt)
    existing = `${before}\n${entry}\n${rest.startsWith('\n') ? rest : `\n${rest}`}`
  } else {
    existing = `${existing.trimEnd()}\n\n${heading}\n\n${entry}\n`
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, existing, 'utf8')
  return { path: filePath, appended: entry }
}

function runTar(args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('tar', args, {
      cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    child.stderr?.on('data', (c) => {
      stderr += c.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `tar exited with code ${code}`))
    })
  })
}

/**
 * List files in a zip archive without extracting — used for import preview.
 */
function listZipEntries(archivePath: string, cwd: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn('tar', ['-a', '-t', '-f', archivePath], {
      cwd,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    child.stdout?.on('data', (c) => {
      stdout += c.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        const names = stdout.split(/\r?\n/).map((n) => n.replace(/\\/g, '/')).filter(Boolean)
        resolve(names)
      } else {
        reject(new Error(`tar list failed with code ${code}`))
      }
    })
  })
}

export async function exportAgentPack(opts: {
  config?: OpenClawConfig | null
  browserWindow?: Electron.BrowserWindow | null
}): Promise<{ archivePath: string; files: string[] }> {
  const workspaceDir = resolveAgentWorkspaceDir(opts.config)
  const included: string[] = []
  for (const rel of PACK_FILES) {
    if (fs.existsSync(path.join(workspaceDir, rel))) included.push(rel)
  }
  if (included.length === 0) {
    throw new Error('No agent identity files found to export')
  }

  const defaultName = `openclaw-agent-pack-${new Date().toISOString().slice(0, 10)}.zip`
  const saveOpts = {
    title: 'Export agent pack',
    defaultPath: path.join(os.homedir(), 'Desktop', defaultName),
    filters: [{ name: 'Zip', extensions: ['zip'] }],
  }
  const save = opts.browserWindow
    ? await dialog.showSaveDialog(opts.browserWindow, saveOpts)
    : await dialog.showSaveDialog(saveOpts)
  if (save.canceled || !save.filePath) {
    throw new Error('Export cancelled')
  }
  const archivePath = save.filePath.endsWith('.zip') ? save.filePath : `${save.filePath}.zip`
  if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath)
  await runTar(['-a', '-c', '-f', archivePath, ...included], workspaceDir)
  return { archivePath, files: included }
}

export async function importAgentPack(opts: {
  config?: OpenClawConfig | null
  browserWindow?: Electron.BrowserWindow | null
}): Promise<{ workspaceDir: string; extracted: string[] }> {
  const workspaceDir = resolveAgentWorkspaceDir(opts.config)
  const openOpts = {
    title: 'Import agent pack',
    filters: [{ name: 'Zip', extensions: ['zip'] }],
    properties: ['openFile' as const],
  }
  const open = opts.browserWindow
    ? await dialog.showOpenDialog(opts.browserWindow, openOpts)
    : await dialog.showOpenDialog(openOpts)
  if (open.canceled || !open.filePaths[0]) {
    throw new Error('Import cancelled')
  }
  const archivePath = open.filePaths[0]

  // Preview: check what would be imported; reject if any path is unsafe or unknown.
  const entries = await listZipEntries(archivePath, workspaceDir)
  const allowed = new Set<string>()
  for (const e of entries) {
    const safe = safePackName(e)
    if (!safe) {
      throw new Error(
        `Archive contains files outside the agent pack scope — import cancelled for safety: "${e}"`,
      )
    }
    allowed.add(safe)
  }

  // Confirm overwrite for files that already exist
  const overwriteNames: string[] = []
  for (const rel of allowed) {
    const existingPath = path.join(workspaceDir, rel)
    if (fs.existsSync(existingPath)) overwriteNames.push(rel)
  }
  if (overwriteNames.length > 0) {
    const confirmOpts = {
      type: 'warning' as const,
      title: 'Overwrite existing files?',
      message: `This pack will overwrite ${overwriteNames.length} existing file(s):\n\n${overwriteNames.join('\n')}\n\nContinue?`,
      buttons: ['Cancel', 'Overwrite'] as string[],
      defaultId: 0,
      cancelId: 0,
    }
    const chosen = opts.browserWindow
      ? await dialog.showMessageBox(opts.browserWindow, confirmOpts)
      : await dialog.showMessageBox(confirmOpts)
    if (chosen.response !== 1) {
      throw new Error('Import cancelled — user declined to overwrite existing files')
    }
  }

  await runTar(['-a', '-x', '-f', archivePath], workspaceDir)
  return { workspaceDir, extracted: [...allowed] }
}

export function listWhatsAppPendingPairingCodes(): Array<{ code: string }> {
  try {
    const stateCred = path.join(getUserDataDir(), 'credentials', 'whatsapp-pairing.json')
    const raw = fs.readFileSync(stateCred, 'utf8')
    const parsed = JSON.parse(raw) as { requests?: Array<{ code?: string }> }
    const out: Array<{ code: string }> = []
    for (const row of parsed.requests ?? []) {
      const code = typeof row.code === 'string' ? row.code.trim().toUpperCase() : ''
      if (code) out.push({ code })
    }
    return out
  } catch {
    return []
  }
}