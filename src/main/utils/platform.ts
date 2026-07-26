/**
 * Cross-platform OS/arch probe.
 */

import os from 'os'

/** OS/arch snapshot */
export interface PlatformInfo {
  os: 'win32' | 'darwin' | 'linux'
  windowsVersion?: 10 | 11
  arch: 'x64' | 'arm64'
}

/**
 * Returns platform info for the current system.
 * Works on Windows, macOS, and Linux.
 */
export function getPlatformInfo(): PlatformInfo {
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'

  if (process.platform === 'win32') {
    const release = os.release()
    // Windows 11: build >= 22000 (e.g. 10.0.22621)
    // Windows 10: build < 22000 (e.g. 10.0.19045)
    const parts = release.split('.')
    const build = parseInt(parts[2] ?? '0', 10)
    const windowsVersion: 10 | 11 = build >= 22000 ? 11 : 10

    return { os: 'win32', windowsVersion, arch }
  }

  if (process.platform === 'darwin') {
    return { os: 'darwin', arch }
  }

  return { os: 'linux', arch }
}

/** Returns true on Windows */
export function isWindows(): boolean {
  return process.platform === 'win32'
}

/** Returns true on macOS */
export function isMacOS(): boolean {
  return process.platform === 'darwin'
}

/** Returns true on Linux */
export function isLinux(): boolean {
  return process.platform === 'linux'
}
