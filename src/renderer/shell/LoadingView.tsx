import { Button } from '@/components/ui/button'
import codeClawLogo from '../../../codeclaw.png'

interface LoadingViewProps {
  statusText: string
  timedOut?: boolean
  onRetry?: () => void
  hintText?: string
  /** Inside EmbeddedShellLayout / other nested layouts: avoid min-h-screen (viewport) fighting the parent. */
  variant?: 'fullscreen' | 'embedded'
}

export function LoadingView({
  statusText,
  timedOut = false,
  onRetry,
  hintText,
  variant = 'fullscreen',
}: LoadingViewProps) {
  const embedded = variant === 'embedded'
  return (
    <div
      className={`flex flex-col items-center justify-center gap-8 px-6 select-none ${
        embedded ? 'min-h-0 w-full max-w-lg py-4' : 'min-h-screen'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <img
          src={codeClawLogo}
          alt="CodeClaw"
          className={`h-20 w-20 rounded-[22px] object-cover shadow-lg ${timedOut ? 'grayscale-[.15]' : 'animate-pulse'}`}
        />
        <h1 className="text-xl font-semibold tracking-tight">DeskClaw Code Editor</h1>
      </div>

      {!timedOut && (
        <div className="flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-2 max-w-sm text-center">
        {timedOut && (
          <p className="text-sm font-medium text-foreground">Gateway startup timeout</p>
        )}
        <p className="text-sm text-muted-foreground">{statusText}</p>
        {!timedOut && hintText && (
          <p className="text-xs text-muted-foreground mt-1">{hintText}</p>
        )}
      </div>

      {timedOut && onRetry && (
        <Button onClick={onRetry}>Retry</Button>
      )}
    </div>
  )
}
