import { useEffect } from 'react'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'

export interface ShellLayoutProps {
  title: string
  onBack: () => void
  children: React.ReactNode
  sidebar?: React.ReactNode
  contentClassName?: string
}

export function ShellLayout({
  title,
  onBack,
  children,
  sidebar,
  contentClassName = '',
}: ShellLayoutProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onBack()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onBack])

  return (
    <div className="grid h-full min-h-0 grid-rows-[42px_minmax(0,1fr)] select-none" role="region" aria-label={title}>
      <header className="flex items-center gap-2 border-b border-[var(--color-rule)] bg-[var(--color-paper-2)] px-2">
        <button type="button" onClick={onBack} className="grid h-7 w-7 place-items-center text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] hover:text-[var(--color-ink)]" title="Back to editor">
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <div className="h-4 w-px bg-[var(--color-rule)]" />
        <h1 className="text-[13px] font-semibold">{title}</h1>
        <button type="button" className="ml-auto grid h-7 w-7 place-items-center text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]" title="More actions">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </header>
      {sidebar ? (
        <div className="grid min-h-0 grid-cols-[240px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-auto border-r border-[var(--color-rule)] bg-[var(--color-paper-2)]">{sidebar}</aside>
          <section className={`workbench-scroll min-h-0 min-w-0 overflow-y-auto p-5 ${contentClassName}`}>
            {children}
          </section>
        </div>
      ) : (
        <section className={`workbench-scroll min-h-0 overflow-y-auto p-5 ${contentClassName}`}>
          {children}
        </section>
      )}
    </div>
  )
}
