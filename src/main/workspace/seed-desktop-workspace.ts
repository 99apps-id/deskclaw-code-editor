/**
 * Seed a general Desktop Plus workspace layout:
 * - notes/ folder with index + preferences (agent can read/search)
 * - SOUL / MEMORY / HEARTBEAT / USER templates only when missing
 * - Append notes + lightweight habit-learning sections when absent
 *   (never overwrite custom HEARTBEAT/SOUL bodies wholesale)
 */

import fs from 'node:fs'
import path from 'node:path'
import type { OpenClawConfig } from '../../shared/types.js'
import { getUserDataDir } from '../utils/paths.js'

const NOTES_DIR = 'notes'
const NOTES_INDEX = '_index.md'
const NOTES_PREFERENCES = 'preferences.md'

const NOTES_SOUL_SECTION = `## Personal notes

User notes live in \`notes/\` under this workspace. When you need personal context, preferences, or filed project notes, read and search that folder first (for example \`notes/_index.md\` and \`notes/preferences.md\`).

Keep \`MEMORY.md\` short and curated. Promote only durable facts there during lightweight heartbeat maintenance — do not dump large notes into the system prompt.
`

const HABIT_SOUL_SECTION = `## Habit learning (lightweight)

Learn the user's habits **without slowing replies**:

- When the user corrects you, states a preference, or says "always / never / next time…", write it promptly to \`notes/preferences.md\` and, if it is durable, a one-line entry under Habits in \`MEMORY.md\`.
- Do **not** run a full reflection, skill-creation, or memory consolidation pass on every message.
- Do **not** auto-install or invent skills from experience. Propose changes only if the user asks.
- Prefer updating files over stuffing long habit dumps into the chat reply.
`

const HABIT_HEARTBEAT_SECTION = `## Habit learning (async)

Run only if there is something new since the last heartbeat. Otherwise reply with \`NO_REPLY\`.

1. Skim recent \`memory/YYYY-MM-DD.md\` (if any) and \`notes/preferences.md\`.
2. Promote at most **3** durable habit/preference lines into \`MEMORY.md\` under Habits (keep MEMORY.md under ~100 lines; remove stale one-offs).
3. Do not create skills, do not call external APIs, and do not send channel messages unless a separate heartbeat rule already requires it.
`

const DEFAULT_SOUL = `# SOUL.md

You are a helpful personal AI assistant running in DeskClaw Code Editor.

## Style

- Be direct and useful. Skip filler praise.
- Prefer actions and clear answers over long preambles.
- Match the user's language.

${NOTES_SOUL_SECTION}
${HABIT_SOUL_SECTION}
## Continuity

Workspace files are your memory. Read them. Update them carefully when the user asks you to remember something lasting.
`

const DEFAULT_MEMORY = `# MEMORY.md

Curated long-term facts only. Keep this file short (aim under ~100 lines).

Daily scratch notes go in \`memory/YYYY-MM-DD.md\`. Preferences and habits go in \`notes/preferences.md\` first, then promote durable ones here.

## Habits

- (Promote durable preferences here during heartbeat — one line each)
`

const DEFAULT_USER = `# USER.md

Optional profile notes about the human you assist. Keep this brief.
`

const DEFAULT_HEARTBEAT = `# HEARTBEAT.md

Lightweight periodic maintenance. Prefer \`NO_REPLY\` when nothing needs attention.

## Memory maintenance

1. If recent \`memory/YYYY-MM-DD.md\` notes exist, skim them.
2. Promote at most a few durable facts into \`MEMORY.md\` (keep MEMORY.md short).
3. Do not invent or auto-install skills. Do not run heavy jobs on every heartbeat.

${HABIT_HEARTBEAT_SECTION}
`

const DEFAULT_NOTES_INDEX = `# Notes

Put personal notes, project snippets, and reference docs in this folder.

The agent can read and search these files when your SOUL.md points here. Habit and preference capture uses \`preferences.md\` by default.

## Index

- [preferences.md](./preferences.md) — standing preferences and corrections
`

const DEFAULT_PREFERENCES = `# Preferences

Standing preferences, corrections, and habits. The agent updates this when you say how you like things done.

Keep entries short (one line each). Heartbeat may promote durable items into \`MEMORY.md\`.

## Standing preferences

- (examples: language, reply length, when to ask vs act)

## Corrections

- (examples: "don't do X", "always include Y")
`

export function resolveAgentWorkspaceDir(config?: OpenClawConfig | null): string {
  const configured = config?.agents?.defaults?.workspace?.trim()
  if (configured) {
    return path.resolve(configured)
  }
  return path.join(getUserDataDir(), 'workspace')
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

function writeIfMissing(filePath: string, contents: string, created: string[]): void {
  if (fs.existsSync(filePath)) return
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, contents, 'utf8')
  created.push(filePath)
}

function appendSectionIfNeeded(
  filePath: string,
  alreadyPresent: RegExp,
  section: string,
  tag: string,
  created: string[],
): void {
  if (!fs.existsSync(filePath)) return
  const existing = fs.readFileSync(filePath, 'utf8')
  if (alreadyPresent.test(existing)) return
  const next = `${existing.trimEnd()}\n\n${section}`
  fs.writeFileSync(filePath, next, 'utf8')
  created.push(`${filePath}#${tag}`)
}

/**
 * Idempotent workspace seed for wizard completion and existing installs.
 */
export function seedDesktopWorkspace(workspaceDir: string): { workspaceDir: string; created: string[] } {
  const created: string[] = []
  ensureDir(workspaceDir)

  const notesDir = path.join(workspaceDir, NOTES_DIR)
  ensureDir(notesDir)
  writeIfMissing(path.join(notesDir, NOTES_INDEX), DEFAULT_NOTES_INDEX, created)
  writeIfMissing(path.join(notesDir, NOTES_PREFERENCES), DEFAULT_PREFERENCES, created)

  const soulPath = path.join(workspaceDir, 'SOUL.md')
  if (!fs.existsSync(soulPath)) {
    writeIfMissing(soulPath, DEFAULT_SOUL, created)
  } else {
    appendSectionIfNeeded(
      soulPath,
      /personal notes|`notes\/`|notes\/_index|notes\/preferences/i,
      NOTES_SOUL_SECTION,
      'notes-section',
      created,
    )
    appendSectionIfNeeded(
      soulPath,
      /##\s*Habit learning|without slowing replies/i,
      HABIT_SOUL_SECTION,
      'habit-section',
      created,
    )
  }

  const memoryPath = path.join(workspaceDir, 'MEMORY.md')
  if (!fs.existsSync(memoryPath)) {
    writeIfMissing(memoryPath, DEFAULT_MEMORY, created)
  } else {
    appendSectionIfNeeded(
      memoryPath,
      /^##\s*Habits\b/m,
      `## Habits\n\n- (Promote durable preferences here during heartbeat — one line each)\n`,
      'habits-section',
      created,
    )
  }

  writeIfMissing(path.join(workspaceDir, 'USER.md'), DEFAULT_USER, created)

  const heartbeatPath = path.join(workspaceDir, 'HEARTBEAT.md')
  if (!fs.existsSync(heartbeatPath)) {
    writeIfMissing(heartbeatPath, DEFAULT_HEARTBEAT, created)
  } else {
    appendSectionIfNeeded(
      heartbeatPath,
      /habit learning \(async\)|Promote at most \*\*3\*\* durable habit/i,
      HABIT_HEARTBEAT_SECTION,
      'habit-section',
      created,
    )
  }

  ensureDir(path.join(workspaceDir, 'memory'))

  return { workspaceDir, created }
}

export function seedDesktopWorkspaceFromConfig(config?: OpenClawConfig | null): {
  workspaceDir: string
  created: string[]
} {
  return seedDesktopWorkspace(resolveAgentWorkspaceDir(config))
}
