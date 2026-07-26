/**
 * Auto-start at login — tied to ShellConfig.autoStart.
 * Electron setLoginItemSettings / getLoginItemSettings.
 * Windows: HKCU ... Run; macOS: Launch Agent; Linux: .config/autostart/.desktop
 */

import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { logInfo, logWarn } from '../utils/logger.js'

const SUPPORTED_PLATFORMS = ['win32', 'darwin', 'linux']

function isSupported(): boolean {
  return SUPPORTED_PLATFORMS.includes(process.platform)
}

const LINUX_AUTOSTART_DIR = path.join(os.homedir(), '.config', 'autostart')

function syncLinuxAutoStart(autoStart: boolean, appName?: string): void {
  const desktopFileName = `${(appName || 'openclaw-desktop-plus').replace(/\s+/g, '-')}.desktop`
  const desktopFilePath = path.join(LINUX_AUTOSTART_DIR, desktopFileName)
  try {
    if (autoStart) {
      const execPath = app.getPath('exe')
      const desktopEntry = `[Desktop Entry]
Type=Application
Name=${appName || 'DeskClaw Code Editor'}
Exec=${execPath}
X-GNOME-Autostart-enabled=true
NoDisplay=true
`
      fs.mkdirSync(LINUX_AUTOSTART_DIR, { recursive: true })
      fs.writeFileSync(desktopFilePath, desktopEntry, 'utf-8')
      logInfo(`[login-item] Linux autostart created at ${desktopFilePath}`)
    } else {
      if (fs.existsSync(desktopFilePath)) {
        fs.unlinkSync(desktopFilePath)
        logInfo(`[login-item] Linux autostart removed from ${desktopFilePath}`)
      }
    }
  } catch (err) {
    logWarn(`[login-item] Linux autostart sync failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * Apply ShellConfig.autoStart to the OS login item
 */
export function syncLoginItemToSystem(autoStart: boolean): void {
  if (!isSupported()) {
    return
  }

  if (process.platform === 'linux') {
    syncLinuxAutoStart(autoStart)
    return
  }

  try {
    app.setLoginItemSettings({ openAtLogin: autoStart })
    logInfo(`[login-item] Synced openAtLogin=${autoStart}`)
  } catch (err) {
    logWarn(
      `[login-item] setLoginItemSettings failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

/**
 * Read whether the app is set to open at login
 */
export function getLoginItemOpenAtLogin(): boolean {
  if (!isSupported()) {
    return false
  }
  try {
    const settings = app.getLoginItemSettings()
    return Boolean(settings.openAtLogin)
  } catch (err) {
    logWarn(
      `[login-item] getLoginItemSettings failed: ${err instanceof Error ? err.message : String(err)}`,
    )
    return false
  }
}

/**
 * Remove login item (uninstaller or --clear-login-item)
 */
export function clearLoginItem(): void {
  if (!isSupported()) {
    return
  }
  try {
    app.setLoginItemSettings({ openAtLogin: false })
    logInfo('[login-item] Cleared login item')
  } catch (err) {
    logWarn(
      `[login-item] clearLoginItem failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}
