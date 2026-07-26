import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ModelsAuthProgressPayload } from '../../shared/electron-api'

export function OAuthLoginPanel({ provider }: { provider: string }) {
  const requestId = useRef('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [deviceCode, setDeviceCode] = useState('')
  const [verificationUrl, setVerificationUrl] = useState('')
  const [prompt, setPrompt] = useState<ModelsAuthProgressPayload['prompt']>()
  const [value, setValue] = useState('')

  useEffect(() => window.electronAPI.onModelsAuthProgress((progress) => {
    if (progress.requestId !== requestId.current) return
    if (progress.message) setMessage(progress.message)
    if (progress.deviceCode) setDeviceCode(progress.deviceCode)
    if (progress.verificationUrl) setVerificationUrl(progress.verificationUrl)
    if (progress.prompt) setPrompt(progress.prompt)
  }), [])

  useEffect(() => {
    requestId.current = ''
    setMessage('')
    setDeviceCode('')
    setVerificationUrl('')
    setPrompt(undefined)
  }, [provider])

  const login = async () => {
    requestId.current = crypto.randomUUID()
    setBusy(true)
    setMessage('Starting secure OpenClaw sign-in…')
    try {
      const result = await window.electronAPI.modelsAuthLogin({ requestId: requestId.current, provider, method: 'oauth' })
      setMessage(result.message)
      if (result.deviceCode) setDeviceCode(result.deviceCode)
      if (result.verificationUrl) setVerificationUrl(result.verificationUrl)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
      setPrompt(undefined)
    }
  }

  const respond = async (response: string | boolean) => {
    if (!prompt) return
    const result = await window.electronAPI.modelsAuthRespond({
      requestId: requestId.current,
      promptId: prompt.promptId,
      value: response,
    })
    if (!result.accepted) setMessage('OAuth prompt expired. Start sign-in again.')
    setPrompt(undefined)
    setValue('')
  }

  return (
    <div className="space-y-2 pt-1">
      <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void login()}>
        {busy ? 'Signing in…' : 'Sign in with OAuth'}
      </Button>
      {message && <p className="text-xs text-muted-foreground" role="status">{message}</p>}
      {deviceCode && (
        <div className="space-y-2 border border-[var(--color-warning)] bg-[var(--color-paper-2)] p-3">
          <div className="text-xs font-semibold">Device code</div>
          <code className="block select-all bg-[var(--color-paper-3)] px-3 py-2 font-mono text-sm font-bold tracking-widest">{deviceCode}</code>
          {verificationUrl && <Button type="button" variant="link" size="sm" onClick={() => void window.electronAPI.systemOpenExternal(verificationUrl)}>Open verification page</Button>}
        </div>
      )}
      {prompt && (
        <div className="space-y-2 border border-border bg-muted/40 p-3">
          <p className="text-xs">{prompt.message}</p>
          {prompt.kind === 'confirm' ? (
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={() => void respond(true)}>Continue</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void respond(false)}>Cancel</Button>
            </div>
          ) : (
            <form onSubmit={(event) => { event.preventDefault(); void respond(value) }} className="space-y-2">
              <Input type="password" value={value} autoComplete="off" placeholder={prompt.placeholder} onChange={(event) => setValue(event.target.value)} />
              <p className="text-[11px] text-muted-foreground">Paste the complete callback response. Secrets are redacted from UI and logs.</p>
              <Button type="submit" size="sm" disabled={!value.trim()}>Submit</Button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
