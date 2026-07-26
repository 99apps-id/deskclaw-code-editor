import type { ShellTheme } from '../../shared/types'

export function applyShellTheme(theme: ShellTheme): void {
  const root = document.documentElement
  const dark = theme === 'dark'
    || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', dark)
  root.classList.toggle('light', !dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
  root.dispatchEvent(new CustomEvent('deskclaw-theme-change', { detail: { dark } }))
}
