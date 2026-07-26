import type { OpenClawConfig } from '../../shared/types.js'

export interface DesktopOAuthProvider {
  runtimeProvider: string
  method: string
  pluginId: string
}

const PROVIDERS: Readonly<Record<string, DesktopOAuthProvider>> = {
  'openai-codex': { runtimeProvider: 'openai', method: 'device-code', pluginId: 'openai' },
  openai: { runtimeProvider: 'openai', method: 'device-code', pluginId: 'openai' },
  openrouter: { runtimeProvider: 'openrouter', method: 'oauth', pluginId: 'openrouter' },
  'github-copilot': { runtimeProvider: 'github-copilot', method: 'device', pluginId: 'github-copilot' },
  github: { runtimeProvider: 'github-copilot', method: 'device', pluginId: 'github-copilot' },
  'github-copilot-auth': { runtimeProvider: 'github-copilot', method: 'device', pluginId: 'github-copilot' },
  copilot: { runtimeProvider: 'github-copilot', method: 'device', pluginId: 'github-copilot' },
  'google-gemini-cli': { runtimeProvider: 'google-gemini-cli', method: 'oauth', pluginId: 'google' },
  'gemini-cli': { runtimeProvider: 'google-gemini-cli', method: 'oauth', pluginId: 'google' },
  'google-gemini': { runtimeProvider: 'google-gemini-cli', method: 'oauth', pluginId: 'google' },
  'gemini-oauth': { runtimeProvider: 'google-gemini-cli', method: 'oauth', pluginId: 'google' },
  gemini: { runtimeProvider: 'google-gemini-cli', method: 'oauth', pluginId: 'google' },
  google: { runtimeProvider: 'google-gemini-cli', method: 'oauth', pluginId: 'google' },
  chutes: { runtimeProvider: 'chutes', method: 'oauth', pluginId: 'chutes' },
  'qwen-portal': { runtimeProvider: 'qwen-portal', method: 'oauth', pluginId: 'qwen-portal' },
  qwen: { runtimeProvider: 'qwen-portal', method: 'oauth', pluginId: 'qwen-portal' },
  anthropic: { runtimeProvider: 'anthropic', method: 'oauth', pluginId: 'anthropic' },
}

export function resolveDesktopOAuthProvider(provider: string): DesktopOAuthProvider | null {
  return PROVIDERS[provider.trim().toLowerCase()] ?? null
}

export function parseOAuthGuidance(message: string): { deviceCode?: string; verificationUrl?: string } {
  const url = /(?:URL|visit|open|go to)[\s:]+(https?:\/\/[^\s"'<>]+)/i.exec(message)
  const code = /(?:user[\s_-]*code|enter (?:this )?code|one-time code|code)[\s:]+([A-Z0-9]{4}(?:-[A-Z0-9]{4,12})+|[A-Z0-9]{6,12})\b/i.exec(message)
  return {
    ...(code?.[1] ? { deviceCode: code[1].toUpperCase() } : {}),
    ...(url?.[1] ? { verificationUrl: url[1].replace(/[).,;]+$/, '') } : {}),
  }
}

export function redactOAuthProtocolSecrets(message: string): string {
  return message
    .replace(/([?&](?:code|state|code_challenge|code_verifier|device_code|access_token|refresh_token)=)[^&#\s]+/gi, '$1***REDACTED***')
    .replace(/("(?:code|state|code_challenge|code_verifier|device_code|access_token|refresh_token)"\s*:\s*)"[^"]*"/gi, '$1"***REDACTED***"')
}

export function enableOAuthProviderPlugin(config: OpenClawConfig, pluginId: string): { config: OpenClawConfig; changed: boolean } {
  const plugins = (config.plugins ?? {}) as Record<string, unknown>
  const entries = (plugins.entries ?? {}) as Record<string, Record<string, unknown>>
  const current = entries[pluginId] ?? {}
  const rawAllow = Array.isArray(plugins.allow) ? plugins.allow.filter((value): value is string => typeof value === 'string') : null
  const allow = rawAllow && !rawAllow.includes(pluginId) ? [...rawAllow, pluginId] : rawAllow
  const changed = current.enabled !== true || allow !== rawAllow
  if (!changed) return { config, changed: false }
  return {
    changed: true,
    config: {
      ...config,
      plugins: {
        ...plugins,
        entries: { ...entries, [pluginId]: { ...current, enabled: true } },
        ...(allow ? { allow } : {}),
      },
    },
  }
}
