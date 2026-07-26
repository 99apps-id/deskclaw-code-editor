import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { shell } from 'electron'
import type { OpenClawConfig } from '../../shared/types.js'
import { getBundledOpenClawDir } from '../utils/paths.js'
import { logWarn } from '../utils/logger.js'
import {
  parseOAuthGuidance,
  redactOAuthProtocolSecrets,
  resolveDesktopOAuthProvider,
  type DesktopOAuthProvider,
} from './models-auth-policy.js'

export interface ModelsAuthPrompt {
  promptId: string
  kind: 'text' | 'confirm'
  message: string
  placeholder?: string
  initialValue?: boolean
}
export interface ModelsAuthProgress {
  message?: string
  deviceCode?: string
  verificationUrl?: string
  browserOpened?: boolean
  prompt?: ModelsAuthPrompt
}
export interface ModelsAuthLoginOptions {
  config: OpenClawConfig
  onProgress: (progress: ModelsAuthProgress) => void
  onPrompt: (prompt: ModelsAuthPrompt) => Promise<string | boolean>
}
export interface ModelsAuthLoginResult {
  ok: boolean
  exitCode: number
  message: string
  deviceCode?: string
  verificationUrl?: string
}

let promptCounter = 0
const safe = (message: string) => redactOAuthProtocolSecrets(message).slice(0, 2_000)

function assertPlugin(provider: DesktopOAuthProvider) {
  const baseDir = getBundledOpenClawDir()
  const candidatePaths = [
    path.join(baseDir, 'dist', 'extensions', provider.pluginId, 'openclaw.plugin.json'),
    path.join(baseDir, 'extensions', provider.pluginId, 'openclaw.plugin.json'),
    path.join(baseDir, 'plugins', provider.pluginId, 'openclaw.plugin.json'),
  ]
  const exists = candidatePaths.some((p) => fs.existsSync(p))
  if (!exists) {
    logWarn(`[models-auth] Manifest for plugin "${provider.pluginId}" not found in standard paths; attempting login flow anyway.`)
  }
}

export function isOAuthCapableProvider(provider: string): boolean {
  return resolveDesktopOAuthProvider(provider) !== null
}

export async function modelsAuthLogin(provider: string, method: 'oauth' | 'api-key', options: ModelsAuthLoginOptions): Promise<ModelsAuthLoginResult> {
  const id = provider.trim().toLowerCase()
  if (method !== 'oauth') return { ok: false, exitCode: 1, message: 'Enter API keys in provider settings.' }
  const policy = resolveDesktopOAuthProvider(id)
  if (!policy) return { ok: false, exitCode: 1, message: `OAuth is not supported for provider "${id}".` }
  assertPlugin(policy)
  const runtimePath = path.join(getBundledOpenClawDir(), 'dist', 'plugin-sdk', 'provider-auth-login-flow-runtime.js')
  if (!fs.existsSync(runtimePath)) throw new Error('Bundled OpenClaw OAuth runtime is missing.')
  const runtime = await import(pathToFileURL(runtimePath).href) as { runModelsAuthLoginFlow?: (options: Record<string, unknown>) => Promise<unknown> }
  if (!runtime.runModelsAuthLoginFlow) throw new Error('Bundled OpenClaw OAuth runtime is incompatible.')
  let guidance: { deviceCode?: string; verificationUrl?: string } = {}
  const progress = (message: string) => {
    const clean = safe(message)
    guidance = { ...guidance, ...parseOAuthGuidance(clean) }
    options.onProgress({ message: clean, ...guidance })
  }
  const prompter = {
    intro: async (message?: string) => { if (message) progress(message) },
    outro: async (message?: string) => { if (message) progress(message) },
    plain: async (message: string) => progress(message),
    note: async (message: string, title?: string) => progress([title, message].filter(Boolean).join('\n\n')),
    select: async () => { throw new Error('Provider selection is managed by DeskClaw.') },
    multiselect: async () => { throw new Error('OAuth multi-selection is unsupported.') },
    text: async (input: { message?: string; placeholder?: string }) => options.onPrompt({
      promptId: `oauth-${Date.now()}-${++promptCounter}`,
      kind: 'text',
      message: input.message ?? 'Enter the OAuth response',
      placeholder: input.placeholder,
    }),
    confirm: async (input: { message?: string; initialValue?: boolean }) => options.onPrompt({
      promptId: `oauth-${Date.now()}-${++promptCounter}`,
      kind: 'confirm',
      message: input.message ?? 'Continue?',
      initialValue: input.initialValue,
    }),
    progress: (title?: string) => {
      if (title) progress(title)
      return { update: progress, stop: (message?: string) => { if (message) progress(message) } }
    },
  }
  try {
    const result = await runtime.runModelsAuthLoginFlow({
      provider: policy.runtimeProvider,
      method: policy.method,
      config: options.config,
      env: process.env,
      setDefault: false,
      isRemote: false,
      runtime: { log: (value: unknown) => progress(String(value)), error: (value: unknown) => progress(String(value)) },
      prompter,
      openUrl: async (rawUrl: string) => {
        const url = new URL(rawUrl)
        if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) throw new Error('OAuth attempted to open an insecure URL.')
        await shell.openExternal(url.toString())
        options.onProgress({ browserOpened: true, message: 'Browser opened. Complete sign-in, then return to DeskClaw.' })
      },
    })
    const profiles = result && typeof result === 'object' ? (result as { profiles?: unknown }).profiles : null
    if (!Array.isArray(profiles) || profiles.length === 0) return { ok: false, exitCode: 1, message: `OAuth sign-in for ${id} returned no profile.`, ...guidance }
    return { ok: true, exitCode: 0, message: `Signed in to ${id}. Credentials were stored by OpenClaw.`, ...guidance }
  } catch (error) {
    const message = safe(error instanceof Error ? error.message : String(error))
    logWarn(`[models-auth] ${id} failed: ${message}`)
    return { ok: false, exitCode: 1, message, ...guidance }
  }
}
