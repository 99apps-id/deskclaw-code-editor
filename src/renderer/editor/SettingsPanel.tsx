import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export interface SettingsPanelProps {
  onClose?: () => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [fontFamily, setFontFamily] = useState('Inter')
  const [fontSize, setFontSize] = useState(14)
  const [tabSize, setTabSize] = useState(2)
  const [insertSpaces, setInsertSpaces] = useState(true)
  const [autoFormat, setAutoFormat] = useState(true)
  const [accentColor, setAccentColor] = useState('#2563eb')

  useEffect(() => {
    const saved = localStorage.getItem('deskclawSettings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.theme) setTheme(parsed.theme)
        if (parsed.fontFamily) setFontFamily(parsed.fontFamily)
        if (parsed.fontSize) setFontSize(parsed.fontSize)
        if (parsed.tabSize) setTabSize(parsed.tabSize)
        if (parsed.insertSpaces !== undefined) setInsertSpaces(parsed.insertSpaces)
        if (parsed.autoFormat !== undefined) setAutoFormat(parsed.autoFormat)
        if (parsed.accentColor) setAccentColor(parsed.accentColor)
      } catch {
        // ignore parse error
      }
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const applySettings = () => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    if (theme !== 'system') root.classList.add(theme)
    root.style.setProperty('--editor-font-family', fontFamily)
    root.style.setProperty('--editor-font-size', `${fontSize}px`)
    root.style.setProperty('--color-accent-strong', accentColor)
    const settings = { theme, fontFamily, fontSize, tabSize, insertSpaces, autoFormat, accentColor }
    localStorage.setItem('deskclawSettings', JSON.stringify(settings))
    const event = new CustomEvent('deskclaw-settings-updated', { detail: settings })
    window.dispatchEvent(event)
    onClose?.()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs"
      onClick={() => onClose?.()}
    >
      <div
        className="w-[min(560px,92vw)] rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 shadow-2xl overflow-auto animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-2 mb-4">
          <h2 className="text-base font-semibold">Editor Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--color-ink-2)] hover:text-[var(--color-ink)] rounded hover:bg-[var(--color-paper-3)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm">Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              className="rounded border border-[var(--color-rule)] bg-[var(--color-paper-3)] px-2 py-1 text-sm"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm">Accent Color</label>
            <div className="flex items-center gap-2">
              {[
                { name: 'Blue', color: '#2563eb' },
                { name: 'Emerald', color: '#10b981' },
                { name: 'Purple', color: '#8b5cf6' },
                { name: 'Amber', color: '#f59e0b' },
                { name: 'Crimson', color: '#ef4444' },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setAccentColor(c.color)}
                  className={`h-5 w-5 rounded-full border-2 transition-transform ${
                    accentColor === c.color ? 'scale-110 border-[var(--color-ink)]' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm">Font Family</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="rounded border border-[var(--color-rule)] bg-[var(--color-paper-3)] px-2 py-1 text-sm"
            >
              <option value="Inter">Inter (default)</option>
              <option value="Roboto">Roboto</option>
              <option value="Outfit">Outfit</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm">Font Size (px)</label>
            <input
              type="number"
              min={10}
              max={24}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10) || 14)}
              className="w-16 rounded border border-[var(--color-rule)] bg-[var(--color-paper-3)] px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm">Tab Size</label>
            <input
              type="number"
              min={2}
              max={8}
              value={tabSize}
              onChange={(e) => setTabSize(parseInt(e.target.value, 10) || 2)}
              className="w-12 rounded border border-[var(--color-rule)] bg-[var(--color-paper-3)] px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm">Insert Spaces</label>
            <input type="checkbox" checked={insertSpaces} onChange={(e) => setInsertSpaces(e.target.checked)} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm">Auto‑format on Save</label>
            <input type="checkbox" checked={autoFormat} onChange={(e) => setAutoFormat(e.target.checked)} />
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => {
              setTheme('system')
              setFontFamily('Inter')
              setFontSize(14)
              setTabSize(2)
              setInsertSpaces(true)
              setAutoFormat(true)
            }}
            className="px-3 py-1 text-sm rounded bg-[var(--color-paper-3)] hover:bg-[var(--color-paper-4)]"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={applySettings}
            className="px-3 py-1 text-sm rounded bg-[var(--color-accent-strong)] text-white hover:bg-[var(--color-accent)]"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
