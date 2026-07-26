/**
 * Proactive probe of agents.defaults.model.primary using the wizard model tester.
 * Does NOT push results to the failover banner — caller decides what to show.
 */

import type { OpenClawConfig, ModelConfig } from '../../shared/types.js'
import { inferModelConfigFromOpenClaw } from '../wizard/model-settings-load.js'
import { testModelConnection } from '../wizard/model-tester.js'
import { loadAuthSecretForProvider } from '../providers/auth-profile-store.js'

export interface PrimaryModelProbeResult {
  ok: boolean
  primary?: string
  provider?: string
  message: string
  /** True when the provider does not support automatic connectivity test */
  unsupported?: boolean
}

function resolvePrimaryRef(config: OpenClawConfig): string | undefined {
  const model = config.agents?.defaults?.model
  if (typeof model === 'string') return model.trim() || undefined
  if (model && typeof model === 'object' && typeof model.primary === 'string') {
    return model.primary.trim() || undefined
  }
  return undefined
}

export async function probePrimaryModel(config: OpenClawConfig): Promise<PrimaryModelProbeResult> {
  const primary = resolvePrimaryRef(config)
  if (!primary) {
    return { ok: false, message: 'No primary model configured' }
  }

  const modelConfig: ModelConfig = inferModelConfigFromOpenClaw(config)
  const providerId =
    modelConfig.provider === 'custom'
      ? modelConfig.customProviderId?.trim() || 'custom'
      : modelConfig.provider === 'moonshot-cn'
        ? 'moonshot'
        : modelConfig.provider

  if (!modelConfig.apiKey?.trim()) {
    const fromProvider =
      typeof config.models?.providers?.[providerId]?.apiKey === 'string'
        ? (config.models.providers[providerId]!.apiKey as string)
        : ''
    const fromAuth = loadAuthSecretForProvider(providerId) ?? ''
    modelConfig.apiKey = (fromProvider || fromAuth).trim()
  }

  // Local/custom stacks often use placeholder keys
  if (!modelConfig.apiKey && modelConfig.provider === 'custom') {
    modelConfig.apiKey = 'local'
  }

  if (!modelConfig.apiKey && modelConfig.provider !== 'ollama' && modelConfig.provider !== 'copilot-proxy') {
    return {
      ok: false,
      primary,
      provider: modelConfig.provider,
      message: 'No API key found for the primary model provider',
    }
  }

  try {
    const result = await testModelConnection(modelConfig)
    return {
      ok: result.ok,
      primary,
      provider: modelConfig.provider,
      unsupported: false,
      message: result.message ?? (result.ok ? 'Primary model reachable' : 'Probe failed'),
    }
  } catch (e) {
    return {
      ok: false,
      primary,
      provider: modelConfig.provider,
      message: e instanceof Error ? e.message : String(e),
    }
  }
}