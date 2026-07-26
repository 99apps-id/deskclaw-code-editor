import { Button } from '@/components/ui/button'
import codeClawLogo from '../../../codeclaw.png'

export type ErrorType =
  | 'gateway-crash'
  | 'start-failure'
  | 'timeout'
  | 'connection-error'

interface ErrorViewProps {
  errorType: ErrorType
  title: string
  detail?: string
  onRetry?: () => void
  onOpenLogDir: () => void
}

function FolderIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export function ErrorView({
  errorType,
  title,
  detail,
  onRetry,
  onOpenLogDir,
}: ErrorViewProps) {
  const retryable = errorType !== 'connection-error'

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 select-none"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center gap-3">
        <img src={codeClawLogo} alt="CodeClaw" className="h-20 w-20 rounded-[22px] object-cover shadow-lg grayscale-[.2]" />
        <h1 className="text-xl font-semibold tracking-tight">DeskClaw Code Editor</h1>
      </div>

      <div className="flex flex-col items-center gap-2 max-w-sm text-center">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {detail && (
          <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {retryable && onRetry && (
          <Button onClick={onRetry}>Retry</Button>
        )}
        <Button variant="outline" onClick={onOpenLogDir}>
          <FolderIcon />
          Open log directory
        </Button>
      </div>
    </main>
  )
}
