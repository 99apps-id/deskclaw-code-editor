import React, { useState } from 'react'
import { Rocket, X, Code2, Globe, Cpu, Server, Smartphone, Loader2, Sparkles } from 'lucide-react'

export interface ProjectStarterModalProps {
  isOpen: boolean
  onClose: () => void
  workspacePath: string | null
}

interface ProjectTemplate {
  id: string
  name: string
  description: string
  icon: React.ElementType
  command: string
}

export function ProjectStarterModal({ isOpen, onClose, workspacePath }: ProjectStarterModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('react-vite')
  const [projectName, setProjectName] = useState<string>('my-deskclaw-app')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  const templates: ProjectTemplate[] = [
    {
      id: 'react-vite',
      name: 'React + Vite Web App',
      description: 'Modern, fast web application with React 19, Vite, and TailwindCSS support.',
      icon: Globe,
      command: 'npx -y create-vite@latest ./ --template react-ts',
    },
    {
      id: 'nextjs',
      name: 'Next.js App Framework',
      description: 'Full-stack React framework with Server Side Rendering and API routes.',
      icon: Code2,
      command: 'npx -y create-next-app@latest ./ --typescript --eslint --no-src-dir --app',
    },
    {
      id: 'electron',
      name: 'Electron Desktop App',
      description: 'Cross-platform desktop application using Node.js and Chromium renderer.',
      icon: Cpu,
      command: 'npx -y create-electron-app ./',
    },
    {
      id: 'express-api',
      name: 'Express / Node.js REST API',
      description: 'Lightweight backend server with TypeScript and Express routes.',
      icon: Server,
      command: 'npm init -y && pnpm add express dotenv cors && pnpm add -D typescript @types/node @types/express tsx',
    },
    {
      id: 'android',
      name: 'Android App Template',
      description: 'Android Native project scaffold using Kotlin and Gradle wrapper.',
      icon: Smartphone,
      command: 'android create project --name MyAndroidApp --target 1 --path ./',
    },
  ]

  const handleCreate = async () => {
    if (!workspacePath) {
      setNotice('Please open a folder workspace first before scaffolding a project.')
      return
    }
    const tpl = templates.find((t) => t.id === selectedTemplate)
    if (!tpl) return

    setLoading(true)
    setNotice('')
    try {
      const session = await window.electronAPI.terminalStart({ cwd: workspacePath })
      await window.electronAPI.terminalWrite(session.sessionId, `${tpl.command}\r`)
      setNotice(`Scaffolding ${tpl.name} started in terminal session!`)
      setTimeout(() => {
        setLoading(false)
        onClose()
      }, 1500)
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not initialize project template.')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-[min(640px,94vw)] rounded-[var(--radius-panel)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-4 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-[var(--color-accent-strong)]" />
            <h2 className="text-sm font-semibold">Quick Project Scaffolder & Starter</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {notice && (
          <div className="mb-3 rounded border border-[var(--color-rule)] bg-[var(--color-paper-3)] p-2 text-xs text-[var(--color-ink)]">
            {notice}
          </div>
        )}

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Project Directory Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full rounded border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 py-1.5 text-xs outline-none focus:border-[var(--color-accent-strong)] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2">Select Tech Stack Template</label>
            <div className="grid grid-cols-1 gap-2 max-h-[260px] overflow-y-auto pr-1 workbench-scroll">
              {templates.map((tpl) => {
                const Icon = tpl.icon
                const isSelected = selectedTemplate === tpl.id
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[var(--color-accent-strong)] bg-[var(--color-accent)] text-[var(--color-ink)]'
                        : 'border-[var(--color-rule)] bg-[var(--color-paper)] hover:border-[var(--color-paper-4)]'
                    }`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${isSelected ? 'text-[var(--color-accent-strong)]' : 'text-[var(--color-ink-2)]'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold">{tpl.name}</div>
                      <div className="text-[11px] text-[var(--color-ink-2)] mt-0.5">{tpl.description}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded bg-[var(--color-paper-3)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleCreate()}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded bg-[var(--color-accent-strong)] text-white hover:bg-[var(--color-accent)] disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            <span>{loading ? 'Scaffolding...' : 'Initialize Project'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
