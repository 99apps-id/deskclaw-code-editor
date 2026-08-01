/**
 * Owner-only (0600/0700) file writes for on-disk secrets (e.g. auth-profiles.json).
 *
 * auth-profiles.json cannot be encrypted with Electron's `safeStorage`: it is the
 * on-disk contract the external OpenClaw gateway process reads directly to
 * authenticate LLM providers (same shape as `openclaw onboard` output — see
 * openclaw-config.ts: "Gateway resolves upstream model auth as:
 * auth-profiles.json -> env -> models.providers.*.apiKey"). safeStorage
 * ciphertext is tied to this app's own OS-keychain entry, which that separate
 * binary has no way to decrypt, so encrypting the file would silently break
 * provider authentication. Restricting filesystem permissions keeps the file
 * readable by the same OS user's gateway process while blocking other local
 * users/processes from reading it.
 */

import fs from 'node:fs'
import path from 'node:path'

const OWNER_RW = 0o600
const OWNER_RWX = 0o700

/** mkdir -p, then restrict to owner-only on POSIX (no-op permission-wise on Windows). */
export function ensureSecureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
  if (process.platform === 'win32') return
  try {
    fs.chmodSync(dir, OWNER_RWX)
  } catch {
    // best-effort — don't block credential writes on a chmod failure
  }
}

/** Write a file containing secrets with owner-only (0600) permissions. */
export function writeFileSecure(filePath: string, content: string): void {
  ensureSecureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content, { encoding: 'utf-8', mode: OWNER_RW })
  if (process.platform === 'win32') return
  try {
    // `mode` above only applies when creating a new file; chmod covers the
    // overwrite case so pre-existing looser-permission files get tightened too.
    fs.chmodSync(filePath, OWNER_RW)
  } catch {
    // best-effort
  }
}
