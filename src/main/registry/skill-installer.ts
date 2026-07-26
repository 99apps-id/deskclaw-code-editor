/**
 * DeskClaw Code Editor — Skill installer from GitHub / skill.sh / Gist.
 * Downloads skill content and installs to user skills directory.
 */

import path from 'node:path'
import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import { spawnSync } from 'node:child_process'
import { getUserDataDir } from '../utils/paths.js'

export interface InstallFromUrlResult {
  ok: boolean
  skillName?: string
  skillPath?: string
  message?: string
}

/**
 * Resolve the user skills directory (~/.openclaw/skills/ or similar).
 */
function getUserSkillsDir(): string {
  const stateDir = getUserDataDir()
  const skillsDir = path.join(stateDir, 'skills')
  fs.mkdirSync(skillsDir, { recursive: true })
  return skillsDir
}

/**
 * Sanitize a string to be a valid directory name.
 */
function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()
    .slice(0, 64) || 'skill'
}

/**
 * Extract skill name from GitHub repo URL.
 */
function parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string; subdir?: string } | null {
  // https://github.com/owner/repo
  // https://github.com/owner/repo/tree/branch/subdir
  // https://github.com/owner/repo.git
  const cleaned = url.replace(/\.git$/, '').replace(/\/$/, '')
  const match = cleaned.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)(?:\/(.+))?)?$/)
  if (!match) return null
  const [, owner, repo, branch, subdir] = match
  return { owner, repo, branch: branch || 'main', subdir }
}

/**
 * Parse skill.sh URL: skill.sh/<name> or skill.sh/<name>/<version>
 */
function parseSkillShUrl(url: string): { name: string; version?: string } | null {
  const cleaned = url.replace(/\/$/, '')
  const match = cleaned.match(/^https?:\/\/skill\.sh\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_.-]+))?$/)
  if (!match) return null
  const [, name, version] = match
  return { name, version }
}

/**
 * Parse Gist URL: https://gist.github.com/owner/gistid
 */
function parseGistUrl(url: string): { owner: string; gistId: string } | null {
  const match = url.match(/^https?:\/\/gist\.github\.com\/([^/]+)\/([a-f0-9]+)$/)
  if (!match) return null
  const [, owner, gistId] = match
  return { owner, gistId }
}

/**
 * Parse raw file URL: raw.githubusercontent.com/owner/repo/branch/path
 */
function parseRawUrl(url: string): { owner: string; repo: string; branch: string; filePath: string } | null {
  const match = url.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/)
  if (!match) return null
  const [, owner, repo, branch, filePath] = match
  return { owner, repo, branch, filePath }
}

/**
 * Download a file via HTTPS and return its content.
 */
function downloadFile(url: string, timeoutMs = 30_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, { timeout: timeoutMs }, (res: import('node:http').IncomingMessage) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        req.destroy()
        resolve(downloadFile(res.headers.location, timeoutMs))
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
        return
      }
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Download timed out')) })
  })
}

/**
 * Write skill files to the user skills directory.
 * Creates SKILL.md and optional additional files.
 */
function writeSkillFiles(skillDir: string, files: Record<string, string>): void {
  fs.mkdirSync(skillDir, { recursive: true })
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(skillDir, filePath)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, content, 'utf-8')
  }
}

/**
 * Install a skill from a GitHub repository.
 * Downloads the repo as ZIP and extracts SKILL.md and related files.
 * Falls back to downloading individual files if ZIP fails.
 */
async function installFromGitHub(url: string): Promise<InstallFromUrlResult> {
  const parsed = parseGitHubUrl(url)
  if (!parsed) {
    return { ok: false, message: 'Invalid GitHub URL. Expected: https://github.com/owner/repo' }
  }

  const { owner, repo, branch, subdir } = parsed
  const skillName = sanitizeName(`${owner}-${repo}${subdir ? `-${subdir}` : ''}`)
  const skillsDir = getUserSkillsDir()
  const targetDir = path.join(skillsDir, skillName)

  // Check if already exists
  if (fs.existsSync(targetDir)) {
    return { ok: false, skillName, message: `Skill "${skillName}" already exists at ${targetDir}` }
  }

  try {
    // Try ZIP download first (fastest)
    const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`
    const zipPath = path.join(skillsDir, `${skillName}.zip`)

    try {
      // Use native fetch or download via HTTPS
      await downloadFileTo(zipUrl, zipPath)

      // Extract SKILL.md and related files from the ZIP
      // Since we may not have adm-zip, use a simple approach
      const extractDir = path.join(skillsDir, `_extract_${skillName}`)
      fs.mkdirSync(extractDir, { recursive: true })

      // Try extracting with PowerShell on Windows or tar on macOS/Linux
      const isWin = process.platform === 'win32'
      if (isWin) {
        // Use PowerShell Expand-Archive
        const psResult = spawnSync('powershell', [
          '-NoProfile',
          '-Command',
          `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`,
        ])
        if (psResult.status !== 0) throw new Error('PowerShell Expand-Archive failed')
      } else {
        // Use unzip
        const unzipResult = spawnSync('unzip', ['-o', zipPath, '-d', extractDir])
        if (unzipResult.status !== 0) throw new Error('unzip failed')
      }

      // Find SKILL.md in the extracted content
      const findSkillMd = (dir: string): string | null => {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        // Check current dir
        if (fs.existsSync(path.join(dir, 'SKILL.md'))) return dir
        // Check subdirs (GitHub zip has a top-level folder)
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const found = findSkillMd(path.join(dir, entry.name))
            if (found) return found
          }
        }
        return null
      }

      // If subdir is specified, look for SKILL.md inside that subdirectory
      let skillSourceDir = findSkillMd(extractDir)
      if (subdir && skillSourceDir) {
        const subdirPath = path.join(skillSourceDir, subdir)
        if (fs.existsSync(subdirPath)) {
          skillSourceDir = subdirPath
        }
      }

      if (skillSourceDir) {
        // Copy all skill files to target
        const copyDirRecursive = (src: string, dest: string) => {
          fs.mkdirSync(dest, { recursive: true })
          const entries = fs.readdirSync(src, { withFileTypes: true })
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name)
            const destPath = path.join(dest, entry.name)
            if (entry.isDirectory()) {
              copyDirRecursive(srcPath, destPath)
            } else {
              fs.copyFileSync(srcPath, destPath)
            }
          }
        }
        copyDirRecursive(skillSourceDir, targetDir)
      } else {
        throw new Error('No SKILL.md found in repository')
      }

      // Cleanup
      try { fs.rmSync(zipPath, { force: true }) } catch { /* ignore */ }
      try { fs.rmSync(extractDir, { recursive: true, force: true }) } catch { /* ignore */ }

      return {
        ok: true,
        skillName,
        skillPath: targetDir,
        message: `Installed "${skillName}" from GitHub (${owner}/${repo})`,
      }
    } catch {
      // ZIP extraction failed, try downloading individual files
      try { fs.rmSync(zipPath, { force: true }) } catch { /* ignore */ }
      try {
        const extractDir = path.join(skillsDir, `_extract_${skillName}`)
        fs.rmSync(extractDir, { recursive: true, force: true })
      } catch { /* ignore */ }

      // Fallback: try to download README.md or just create minimal skill
      const readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`
      try {
        const readme = await downloadFile(readmeUrl)
        const skillContent = `---
name: ${repo}
description: Installed from ${owner}/${repo}
source: github
---

# ${repo}

Installed from [${owner}/${repo}](https://github.com/${owner}/${repo}).

${readme}
`
        writeSkillFiles(targetDir, { 'SKILL.md': skillContent })
        return {
          ok: true,
          skillName,
          skillPath: targetDir,
          message: `Installed "${skillName}" from GitHub (README fallback)`,
        }
      } catch {
        // Create minimal skill entry
        const skillContent = `---
name: ${repo}
description: Installed from ${owner}/${repo}
source: github
---

# ${repo}

Installed from [${owner}/${repo}](https://github.com/${owner}/${repo}).
`
        writeSkillFiles(targetDir, { 'SKILL.md': skillContent })
        return {
          ok: true,
          skillName,
          skillPath: targetDir,
          message: `Installed "${skillName}" from GitHub (minimal)`,
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, message: `GitHub install failed: ${msg}` }
  }
}

/**
 * Install a skill from skill.sh.
 */
async function installFromSkillSh(url: string): Promise<InstallFromUrlResult> {
  const parsed = parseSkillShUrl(url)
  if (!parsed) {
    return { ok: false, message: 'Invalid skill.sh URL. Expected: https://skill.sh/<name>' }
  }

  const { name } = parsed
  const skillName = sanitizeName(name)
  const skillsDir = getUserSkillsDir()
  const targetDir = path.join(skillsDir, skillName)

  if (fs.existsSync(targetDir)) {
    return { ok: false, skillName, message: `Skill "${skillName}" already exists` }
  }

  try {
    // skill.sh API: https://skill.sh/api/skill/<name>
    const apiUrl = `https://skill.sh/api/skill/${name}`
    const response = await downloadFile(apiUrl)

    let skillContent: string
    try {
      const json = JSON.parse(response)
      skillContent = json.content || json.skill || json.markdown || json.SKILL_MD || ''
    } catch {
      // If not JSON, treat response as the skill content
      skillContent = response
    }

    if (!skillContent?.trim()) {
      // Fallback: download from skill.sh directly
      const directUrl = `https://skill.sh/${name}`
      skillContent = await downloadFile(directUrl)
    }

    writeSkillFiles(targetDir, { 'SKILL.md': skillContent })

    return {
      ok: true,
      skillName,
      skillPath: targetDir,
      message: `Installed "${skillName}" from skill.sh`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, message: `skill.sh install failed: ${msg}` }
  }
}

/**
 * Install a skill from a GitHub Gist.
 */
async function installFromGist(url: string): Promise<InstallFromUrlResult> {
  const parsed = parseGistUrl(url)
  if (!parsed) {
    return { ok: false, message: 'Invalid Gist URL' }
  }

  const { gistId } = parsed
  const skillName = sanitizeName(`gist-${gistId.slice(0, 8)}`)
  const skillsDir = getUserSkillsDir()
  const targetDir = path.join(skillsDir, skillName)

  if (fs.existsSync(targetDir)) {
    return { ok: false, skillName, message: `Skill "${skillName}" already exists` }
  }

  try {
    // Gist API: https://api.github.com/gists/<id>
    const apiUrl = `https://api.github.com/gists/${gistId}`
    const response = await downloadFile(apiUrl)
    const gist = JSON.parse(response)

    // Extract files from gist
    const files: Record<string, string> = {}
    if (gist.files) {
      for (const [filename, fileData] of Object.entries(gist.files) as [string, { content?: string }][]) {
        if (fileData.content) {
          files[filename] = fileData.content
        }
      }
    }

    if (Object.keys(files).length === 0) {
      throw new Error('No files found in gist')
    }

    // Ensure there's a SKILL.md
    if (!files['SKILL.md']) {
      // Use the main file as skill content
      const firstFile = Object.entries(files)[0]
      if (firstFile) {
        files['SKILL.md'] = `---
name: ${firstFile[0].replace(/\.[^.]+$/, '')}
description: Installed from Gist ${gistId}
source: gist
---

${firstFile[1]}
`
      }
    }

    writeSkillFiles(targetDir, files)

    return {
      ok: true,
      skillName,
      skillPath: targetDir,
      message: `Installed "${skillName}" from Gist`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, message: `Gist install failed: ${msg}` }
  }
}

/**
 * Install a skill from a direct raw URL pointing to SKILL.md content.
 */
async function installFromRawUrl(url: string): Promise<InstallFromUrlResult> {
  const parsed = parseRawUrl(url)
  const skillName = parsed
    ? sanitizeName(`${parsed.repo}-${path.basename(parsed.filePath, '.md')}`)
    : sanitizeName(`skill-${Date.now()}`)
  const skillsDir = getUserSkillsDir()
  const targetDir = path.join(skillsDir, skillName)

  if (fs.existsSync(targetDir)) {
    return { ok: false, skillName, message: `Skill "${skillName}" already exists` }
  }

  try {
    const content = await downloadFile(url)
    writeSkillFiles(targetDir, { 'SKILL.md': content })

    return {
      ok: true,
      skillName,
      skillPath: targetDir,
      message: `Installed "${skillName}" from raw URL`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, message: `Download failed: ${msg}` }
  }
}

/**
 * Download a file to a local path.
 */
function downloadFileTo(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(destPath)
    const req = client.get(url, { timeout: 60_000, headers: { 'User-Agent': 'DeskClaw/1.0' } }, (res: import('node:http').IncomingMessage) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close()
        fs.unlinkSync(destPath)
        req.destroy()
        resolve(downloadFileTo(res.headers.location, destPath))
        return
      }
      if (res.statusCode !== 200) {
        file.close()
        fs.unlinkSync(destPath)
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    })
    req.on('error', (err: Error) => {
      file.close()
      try { fs.unlinkSync(destPath) } catch { /* ignore */ }
      reject(err)
    })
    req.on('timeout', () => {
      req.destroy()
      file.close()
      try { fs.unlinkSync(destPath) } catch { /* ignore */ }
      reject(new Error('Download timed out'))
    })
  })
}

/**
 * Main entry: install a skill from any supported URL.
 * Detects URL type and routes to the appropriate installer.
 */
export async function installSkillFromUrl(url: string): Promise<InstallFromUrlResult> {
  const trimmed = url.trim()

  if (!trimmed) {
    return { ok: false, message: 'URL is required' }
  }

  // GitHub repo
  if (trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)/)) {
    return installFromGitHub(trimmed)
  }

  // Gist
  if (trimmed.match(/^https?:\/\/gist\.github\.com\//)) {
    return installFromGist(trimmed)
  }

  // skill.sh
  if (trimmed.match(/^https?:\/\/skill\.sh\//)) {
    return installFromSkillSh(trimmed)
  }

  // raw.githubusercontent.com
  if (trimmed.match(/^https?:\/\/raw\.githubusercontent\.com\//)) {
    return installFromRawUrl(trimmed)
  }

  // Any other URL — try as raw content
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return installFromRawUrl(trimmed)
  }

  return { ok: false, message: 'Unsupported URL format. Supported: GitHub repo, Gist, skill.sh, or raw file URL.' }
}
