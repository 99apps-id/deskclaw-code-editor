/**
 * Paths: install dir, OpenClaw state dir, bundled node/openclaw (see constants).
 */

import { app } from 'electron'
import path from 'path'
import os from 'os'
import fs from 'node:fs'
import { OPENCLAW_USER_DIR } from '../../shared/constants.js'

/**
 * App install root — packaged: beside exe; dev: process.cwd
 */
export function getInstallDir(): string {
  if (app.isPackaged) {
    return path.dirname(app.getPath('exe'))
    
  }
  return process.cwd()
}

/**
 * OpenClaw state dir (%USERPROFILE%\\.openclaw)
 */
export function getUserDataDir(): string {
  return path.join(os.homedir(), OPENCLAW_USER_DIR)
}

function resolveDevResourcePath(resourceName: 'node' | 'openclaw'): string {
  const installDir = getInstallDir()
  const resourcesPath = path.join(installDir, 'resources', resourceName)
  const nodeExeName = process.platform === 'win32' ? 'node.exe' : 'node'
  const resourceReady =
    resourceName === 'node'
      ? fs.existsSync(path.join(resourcesPath, nodeExeName))
      : fs.existsSync(path.join(resourcesPath, 'openclaw.mjs'))
  if (resourceReady) {
    return resourcesPath
  }
  return path.join(installDir, 'build', resourceName)
}

export function getBundledOpenClawDir(): string {
  if (app.isPackaged) {
    return path.join(getInstallDir(), 'resources', 'openclaw')
  }
  return resolveDevResourcePath('openclaw')
}

/**
 * Bundled node directory (node.exe on Windows, node on macOS/Linux).
 * Always resolved inside the app package or dev build directory.
 */
function getBundledNodeDir(): string {
  if (app.isPackaged) {
    return path.join(getInstallDir(), 'resources', 'node')
  }
  return resolveDevResourcePath('node')
}

/**
 * Bundled node binary path — cross-platform.
 */
export function getBundledNodePath(): string {
  const exeName = process.platform === 'win32' ? 'node.exe' : 'node'
  return path.join(getBundledNodeDir(), exeName)
}

/**
 * Bundled openclaw.mjs — {installDir}/resources/openclaw/openclaw.mjs
 */
export function getBundledOpenClawPath(): string {
  return path.join(getBundledOpenClawDir(), 'openclaw.mjs')
}
