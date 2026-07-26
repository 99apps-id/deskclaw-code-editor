import { describe, expect, it } from 'vitest'
import { migrateToolsProfileToFull } from './openclaw-config.js'
import type { OpenClawConfig } from '../../shared/types.js'

interface ToolsConfig {
  profile?: string
  [key: string]: unknown
}

function toolsOf(config: OpenClawConfig): ToolsConfig {
  return (config.tools ?? {}) as ToolsConfig
}

describe('migrateToolsProfileToFull', () => {
  it('sets tools.profile to full when tools is missing', () => {
    const config: OpenClawConfig = { gateway: { mode: 'local' } }
    const result = migrateToolsProfileToFull(config)

    expect(result.changed).toBe(true)
    expect(toolsOf(result.config).profile).toBe('full')
  })

  it('sets tools.profile to full when profile is messaging', () => {
    const config: OpenClawConfig = { tools: { profile: 'messaging' } }
    const result = migrateToolsProfileToFull(config)

    expect(result.changed).toBe(true)
    expect(toolsOf(result.config).profile).toBe('full')
  })

  it('sets tools.profile to full when profile is minimal', () => {
    const config: OpenClawConfig = { tools: { profile: 'minimal' } }
    const result = migrateToolsProfileToFull(config)

    expect(result.changed).toBe(true)
    expect(toolsOf(result.config).profile).toBe('full')
  })

  it('sets tools.profile to full when profile is unknown', () => {
    const config: OpenClawConfig = { tools: { profile: 'default' } }
    const result = migrateToolsProfileToFull(config)

    expect(result.changed).toBe(true)
    expect(toolsOf(result.config).profile).toBe('full')
  })

  it('preserves tools.profile when already full', () => {
    const config: OpenClawConfig = {
      tools: { profile: 'full', web: { search: { provider: 'duckduckgo', enabled: true } } },
    }
    const result = migrateToolsProfileToFull(config)

    expect(result.changed).toBe(false)
    expect(result.config).toBe(config)
  })

  it('preserves tools.profile when coding', () => {
    const config: OpenClawConfig = { tools: { profile: 'coding' } }
    const result = migrateToolsProfileToFull(config)

    expect(result.changed).toBe(false)
    expect(result.config).toBe(config)
  })
})
