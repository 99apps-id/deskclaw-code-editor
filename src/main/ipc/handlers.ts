import { app, ipcMain, shell } from 'electron'
import type { GatewayProcessManager } from '../gateway/index.js'
import { GatewayRpcClient } from '../gateway/rpc-client.js'
import type {
  OpenClawConfig,
  ShellConfig,
  AppVersionInfo,
  ModelConfig,
  ModelProviderConfig,
  WizardState,
  ModelSettingsApplyResult,
  ModelSettingsLoadResult,
} from '../../shared/types.js'
import type { PortCheckResult } from '../utils/port-check.js'
import { testModelConnection } from '../wizard/model-tester.js'
import {
  handleWizardCompleteSetup,
  mergeModelIntoOpenClawConfig,
  sanitizeWizardState,
  writeAuthCredentialsForModelState,
  PROVIDER_SEEDS,
  type ModelSettingsTarget,
  type ProviderSeed,
} from '../wizard/setup-handler.js'
import { inferModelConfigFromOpenClaw, listAgentSummariesFromConfig } from '../wizard/model-settings-load.js'
import { DEFAULT_GATEWAY_PORT } from '../../shared/constants.js'
import {
  IPC_GATEWAY_START,
  IPC_GATEWAY_STOP,
  IPC_GATEWAY_RESTART,
  IPC_GATEWAY_STATUS,
  IPC_GATEWAY_VERIFY,
  IPC_CONFIG_READ,
  IPC_CONFIG_WRITE,
  IPC_CONFIG_EXISTS,
  IPC_CONFIG_VALIDATE,
  IPC_SHELL_GET_CONFIG,
  IPC_SHELL_SET_CONFIG,
  IPC_SYSTEM_GET_LOCALE,
  IPC_SYSTEM_OPEN_EXTERNAL,
  IPC_SYSTEM_OPEN_PATH,
  IPC_PORT_CHECK,
  IPC_WIZARD_TEST_MODEL,
  IPC_WIZARD_COMPLETE_SETUP,
  IPC_SYSTEM_OPEN_LOG_DIR,
  IPC_SHELL_GET_VERSIONS,
  IPC_SHELL_RESIZE_FOR_MAIN_INTERFACE,
  IPC_SHELL_SET_WINDOW_TITLE,
  IPC_DIAGNOSTICS_EXPORT,
  IPC_PROVIDERS_LIST,
  IPC_PROVIDERS_SAVE_PROFILE,
  IPC_PROVIDERS_DELETE_PROFILE,
  IPC_PROVIDERS_TEST,
  IPC_PROVIDERS_EXPORT,
  IPC_PROVIDERS_IMPORT,
  IPC_PROVIDERS_SAVE_CONFIG,
  IPC_PROVIDERS_SET_MODEL_DEFAULTS,
  IPC_PROVIDERS_DELETE_PROVIDER,
  IPC_MODEL_SETTINGS_LOAD,
  IPC_MODEL_SETTINGS_APPLY,
  IPC_SKILLS_LIST,
  IPC_SKILLS_TOGGLE,
  IPC_SKILLS_RELOAD,
  IPC_CLAWHUB_SEARCH,
  IPC_CLAWHUB_INSTALL,
  IPC_EXTENSIONS_LIST,
  IPC_EXTENSIONS_TOGGLE,
  IPC_REGISTRY_RELOAD,
  IPC_REGISTRY_EXPORT,
  IPC_REGISTRY_IMPORT,
  IPC_REGISTRY_VALIDATE,
  IPC_UPDATE_CHECK,
  IPC_UPDATE_DOWNLOAD_SHELL,
  IPC_UPDATE_INSTALL_SHELL,
  IPC_UPDATE_CANCEL_DOWNLOAD,
  IPC_UPDATE_VERIFY_BUNDLE,
  IPC_UPDATE_PRESTART_CHECK,
  IPC_UPDATE_GET_POST_UPDATE_VALIDATION,
  IPC_DIAGNOSTICS_RUN,
  IPC_DIAGNOSTICS_SUMMARY,
  IPC_MODELS_LIST,
  IPC_MODELS_SET_DEFAULT,
  IPC_MODELS_SET_FALLBACKS,
  IPC_MODELS_SET_ALIASES,
  IPC_MODELS_AUTH_LOGIN,
  IPC_MODELS_AUTH_PROGRESS,
  IPC_MODELS_AUTH_RESPOND,
  IPC_WHATSAPP_LOGIN_START,
  IPC_WHATSAPP_LOGIN_WAIT,
  IPC_WHATSAPP_LOGOUT,
  IPC_GATEWAY_APPLY_CONNECTION,
  IPC_PLUGINS_LIST,
  IPC_PLUGINS_TOGGLE,
  IPC_PLUGINS_INSTALL,
  IPC_PLUGINS_UNINSTALL,
  IPC_LOGS_TAIL,
  IPC_BACKUP_CREATE,
  IPC_BACKUP_VERIFY,
  IPC_INSIGHTS_USAGE,
  IPC_WORKSPACE_OPEN_NOTES,
  IPC_WORKSPACE_MEMORY_READ,
  IPC_WORKSPACE_MEMORY_WRITE,
  IPC_WORKSPACE_PREFERENCE_APPEND,
  IPC_WORKSPACE_EXPORT_AGENT_PACK,
  IPC_WORKSPACE_IMPORT_AGENT_PACK,
  IPC_MODELS_PROBE_PRIMARY,
  IPC_PAIRING_LIST_PENDING,
  IPC_PAIRING_LIST_APPROVED,
  IPC_PAIRING_APPROVE,
  IPC_PAIRING_REMOVE_APPROVED,
  IPC_DEVICE_PAIRING_LIST,
  IPC_DEVICE_PAIRING_APPROVE,
  IPC_CHAT_PICK_ATTACHMENTS,
  IPC_REGISTRY_INSTALL_FROM_URL,
  IPC_EDITOR_OPEN_FOLDER,
  IPC_EDITOR_LIST_DIR,
  IPC_EDITOR_READ_FILE,
  IPC_EDITOR_WRITE_FILE,
  IPC_EDITOR_CREATE_FILE,
  IPC_EDITOR_DELETE_FILE,
  IPC_GIT_STATUS,
  IPC_GIT_STAGE,
  IPC_GIT_UNSTAGE,
  IPC_GIT_COMMIT,
  IPC_GIT_PUSH,
  IPC_GIT_PULL,
  IPC_TERMINAL_START,
  IPC_TERMINAL_WRITE,
  IPC_TERMINAL_RESIZE,
  IPC_TERMINAL_KILL,
  IPC_TERMINAL_DATA,
  IPC_TERMINAL_EXIT,
  IPC_DEBUG_LAUNCH,
  IPC_DEBUG_STOP,
  IPC_DEBUG_STATUS,
  IPC_DEBUG_DEVTOOLS_URL,
  IPC_DEBUG_OUTPUT,
  IPC_DEBUG_EXIT,
  IPC_AGENT_CHAT,
  IPC_AGENT_DIFF_APPLY,
  IPC_AGENT_PICK_CONTEXT,
} from '../../shared/ipc-channels.js'
import { pickAndInjectChatAttachments } from '../control-ui/pick-attachments.js'
import { runPrestartCheck, exportDiagnostics, runDiagnostics, getDiagnosticsSummary } from '../diagnostics/index.js'
import {
  checkForUpdates,
  verifyBundle,
  getPrestartCheckForFrontend,
  downloadUpdate,
  cancelDownload,
  installShellUpdateWithBackup,
  readAndConsumePostUpdateResult,
} from '../update/index.js'
import {
  listAuthProfiles,
  saveAuthProfile,
  saveAuthProfileToken,
  deleteAuthProfile,
  exportAuthProfiles,
  importAuthProfiles,
  getProvidersSummary,
  saveProviderConfig,
  deleteProviderConfig,
  setModelDefaults,
  setModelAliases,
  addProfileToAuthOrder,
  removeProfileFromAuthOrder,
  normalizeAuthOrderEntry,
} from '../providers/index.js'
import { agentChat, applyAgentDiff } from '../agent/agent-chat-handler.js'
import { installSkillFromUrl } from '../registry/skill-installer.js'
import { listSkillsWithProxy, searchClawHubSkills, installClawHubSkill } from '../skills/index.js'
import { listModelsWithProxy, resolvePrimaryModelRef } from '../models/index.js'
import {
  whatsappLoginStart,
  whatsappLoginWait,
  whatsappLogout,
} from '../channels/whatsapp-login.js'
import { modelsAuthLogin } from '../models/models-auth-proxy.js'
import { enableOAuthProviderPlugin, resolveDesktopOAuthProvider } from '../models/models-auth-policy.js'
import {
  listPluginsWithCli,
  togglePlugin,
  installPlugin,
  uninstallPlugin,
} from '../plugins/index.js'
import {
  listExtensions,
  toggleSkill,
  toggleExtension,
  exportRegistry,
  importRegistry,
  validateRegistryItem,
} from '../registry/index.js'
import { tailLogsWithGateway } from '../logs/index.js'
import { getLogAggregator } from '../diagnostics/log-aggregator.js'
import { runBackupCreateCli, runBackupVerifyCli } from '../backup/index.js'
import { collectUsageInsights } from '../insights/usage-insights.js'
import { resolveAgentWorkspaceDir, seedDesktopWorkspace } from '../workspace/seed-desktop-workspace.js'
import {
  appendWorkspacePreference,
  exportAgentPack,
  importAgentPack,
  readWorkspaceMemory,
  writeWorkspaceMemoryFile,
  type WorkspaceMemoryKind,
} from '../workspace/workspace-memory.js'
import { probePrimaryModel } from '../models/probe-primary.js'
import { getBundledNodePath } from '../utils/paths.js'
import path from 'node:path'
import fs from 'node:fs'
import http from 'node:http'
import { execFile, spawn } from 'node:child_process'
import * as pty from '@lydell/node-pty'
import { promisify } from 'node:util'
import { syncLoginItemToSystem } from '../login-item/index.js'
import {
  createEditorEntry,
  deleteEditorEntry,
  listEditorDirectory,
  readEditorFileAsync,
  writeEditorFile,
} from '../editor/file-service.js'
import { runConfigValidate, readOpenClawConfig, updateOpenClawConfig } from '../config/index.js'
import {
  approveFeishuPairing,
  listApprovedFeishuSenders,
  listPendingFeishuPairing,
  removeApprovedFeishuSender,
} from '../pairing/index.js'

const execFileAsync = promisify(execFile)
const pendingOAuthPrompts = new Map<string, {
  resolve: (value: string | boolean) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}>()
export interface IpcResult<T = unknown> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

export interface IpcHandlerDeps {
  gatewayManager: GatewayProcessManager
  readOpenClawConfig: () => OpenClawConfig
  writeOpenClawConfig: (config: OpenClawConfig) => void
  openclawConfigExists: () => boolean
  readShellConfig: () => ShellConfig
  writeShellConfig: (config: ShellConfig) => void
  checkPort: (port: number) => Promise<PortCheckResult>
  getUserDataDir: () => string
  getBundledOpenClawPath?: () => string
  getVersions: () => AppVersionInfo
  resizeMainWindow?: (width: number, height: number, center?: boolean) => void
  /** Resize window for main shell (may grow beyond current size) */
  resizeForMainInterface?: () => void
  /** Sync native window title from renderer */
  setMainWindowTitle?: (title: string) => void
  /** Rebuild tray menu (e.g. after ShellConfig.locale change) */
  refreshTrayMenu?: () => void
  /** Main BrowserWindow for native dialogs / Control UI frame inject */
  getMainWindow?: () => import('electron').BrowserWindow | null
}

function ok<T>(data: T): IpcResult<T> {
  return { success: true, data }
}

function fail(code: string, message: string): IpcResult<never> {
  return { success: false, error: { code, message } }
}

type AsyncHandler = (_event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => Promise<IpcResult>

function safelog(method: 'error' | 'warn' | 'info', ...args: unknown[]): void {
  try { console[method](...args) } catch { /* EPIPE — pipe closed, ignore */ }
}

function wrapHandler(code: string, fn: (...args: unknown[]) => Promise<unknown> | unknown): AsyncHandler {
  return async (_event: Electron.IpcMainInvokeEvent, ...args: unknown[]): Promise<IpcResult> => {
    try {
      const result = await fn(...args)
      return ok(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      safelog('error', `[ipc] ${code} handler error:`, message)
      return fail(code, message)
    }
  }
}

const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:'])

function assertFeishuPairingChannel(channel: unknown): asserts channel is 'feishu' {
  if (channel !== 'feishu') {
    throw new Error('Only Feishu pairing is supported in the desktop shell')
  }
}

async function createDevicePairingRpcClient(gatewayManager: GatewayProcessManager): Promise<GatewayRpcClient> {
  const status = gatewayManager.getStatus()
  if (status.status !== 'running') {
    throw new Error('Gateway is not running')
  }
  const config = readOpenClawConfig()
  const token = config?.gateway?.auth?.token?.trim()
  return new GatewayRpcClient({ port: status.port, token })
}

function validateExternalUrl(url: unknown): string {
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('URL must be a non-empty string')
  }
  const parsed = new URL(url)
  if (!ALLOWED_URL_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`Protocol "${parsed.protocol}" is not allowed; only http/https permitted`)
  }
  return url
}

function validatePlainObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a non-null object`)
  }
  return value as Record<string, unknown>
}

function parseModelConfigPayload(raw: Record<string, unknown>): ModelConfig {
  return {
    provider: raw.provider as ModelConfig['provider'],
    apiKey: String(raw.apiKey ?? ''),
    modelId: String(raw.modelId ?? ''),
    moonshotRegion: raw.moonshotRegion === 'cn' ? 'cn' : raw.moonshotRegion === 'global' ? 'global' : undefined,
    customProviderId: typeof raw.customProviderId === 'string' ? raw.customProviderId : undefined,
    customBaseUrl: typeof raw.customBaseUrl === 'string' ? raw.customBaseUrl : undefined,
    endpointUrl: typeof raw.endpointUrl === 'string' ? raw.endpointUrl : undefined,
    cloudflareAccountId: typeof raw.cloudflareAccountId === 'string' ? raw.cloudflareAccountId : undefined,
    cloudflareGatewayId: typeof raw.cloudflareGatewayId === 'string' ? raw.cloudflareGatewayId : undefined,
    customCompatibility:
      raw.customCompatibility === 'anthropic'
        ? 'anthropic'
        : raw.customCompatibility === 'openai'
          ? 'openai'
          : undefined,
  }
}

function wizardStateForModelConfig(modelConfig: ModelConfig): WizardState {
  return {
    currentStep: 0,
    modelConfig,
    channelConfig: {
      feishu: null,
      telegram: null,
      discord: null,
      slack: null,
      whatsapp: null,
      selectedChannel: 'whatsapp',
      skipChannels: true,
    },
    gatewayConfig: {
      port: 18789,
      bind: 'loopback',
      authToken: '',
    },
  }
}

export function registerIpcHandlers(deps: IpcHandlerDeps): void {
  const { gatewayManager } = deps

  ipcMain.handle(
    IPC_GATEWAY_START,
    wrapHandler('GATEWAY_START', async () => {
      const config = deps.readOpenClawConfig()
      const gw = config?.gateway
      if (gw?.mode === 'remote') {
        return gatewayManager.applyRemoteFromConfig(config)
      }
      await gatewayManager.clearRemoteMode()
      const port = gw?.port ?? DEFAULT_GATEWAY_PORT
      const bind = gw?.bind ?? 'loopback'
      const token = gw?.auth?.token?.trim()
      const force = Boolean(gw?.forcePortOnConflict)
      return gatewayManager.start({ port, bind, token: token || undefined, force })
    }),
  )

  ipcMain.handle(
    IPC_GATEWAY_STOP,
    wrapHandler('GATEWAY_STOP', () => gatewayManager.stop()),
  )

  ipcMain.handle(
    IPC_GATEWAY_RESTART,
    wrapHandler('GATEWAY_RESTART', async () => {
      const config = deps.readOpenClawConfig()
      const gw = config?.gateway
      if (gw?.mode === 'remote') {
        return gatewayManager.applyRemoteFromConfig(config)
      }
      await gatewayManager.clearRemoteMode()
      const port = gw?.port ?? DEFAULT_GATEWAY_PORT
      const bind = gw?.bind ?? 'loopback'
      const token = gw?.auth?.token?.trim()
      const force = Boolean(gw?.forcePortOnConflict)
      return gatewayManager.restart({ port, bind, token: token || undefined, force })
    }),
  )

  ipcMain.handle(
    IPC_GATEWAY_STATUS,
    wrapHandler('GATEWAY_STATUS', () => gatewayManager.getStatus()),
  )

  ipcMain.handle(
    IPC_GATEWAY_VERIFY,
    wrapHandler('GATEWAY_VERIFY', async () => {
      const status = gatewayManager.getStatus()
      if (status.status !== 'running') throw new Error('OpenClaw Gateway is not running')
      const auth = deps.readOpenClawConfig()?.gateway?.auth
      const client = new GatewayRpcClient({
        port: status.port,
        token: auth?.mode === 'password' ? undefined : auth?.token?.trim() || undefined,
        password: auth?.mode === 'password' ? auth?.password?.trim() || undefined : undefined,
        timeoutMs: 15_000,
        maxRetries: 3,
      })
      try {
        await client.connect()
        return { ok: true, port: status.port }
      } finally {
        client.close()
      }
    }),
  )

  ipcMain.handle(
    IPC_CONFIG_READ,
    wrapHandler('CONFIG_READ', () => deps.readOpenClawConfig()),
  )

  ipcMain.handle(
    IPC_CONFIG_WRITE,
    wrapHandler('CONFIG_WRITE', (config: unknown) => {
      const validated = validatePlainObject(config, 'config')
      deps.writeOpenClawConfig(validated as OpenClawConfig)
      readOpenClawConfig()
    }),
  )

  ipcMain.handle(
    IPC_CONFIG_EXISTS,
    wrapHandler('CONFIG_EXISTS', () => deps.openclawConfigExists()),
  )

  ipcMain.handle(
    IPC_CONFIG_VALIDATE,
    wrapHandler('CONFIG_VALIDATE', () => runConfigValidate()),
  )

  ipcMain.handle(
    IPC_SHELL_GET_CONFIG,
    wrapHandler('SHELL_GET_CONFIG', () => deps.readShellConfig()),
  )

  ipcMain.handle(
    IPC_SHELL_SET_CONFIG,
    wrapHandler('SHELL_SET_CONFIG', (partial: unknown) => {
      const patch = validatePlainObject(partial, 'shellConfig')
      const current = deps.readShellConfig()
      const merged: ShellConfig = { ...current, ...patch } as ShellConfig
      deps.writeShellConfig(merged)
      if ('autoStart' in patch) {
        syncLoginItemToSystem(merged.autoStart)
      }
      if ('locale' in patch) {
        deps.refreshTrayMenu?.()
      }
    }),
  )

  ipcMain.handle(
    IPC_SYSTEM_GET_LOCALE,
    wrapHandler('SYSTEM_GET_LOCALE', () => {
      return app.getLocale()
    }),
  )

  ipcMain.handle(
    IPC_SYSTEM_OPEN_EXTERNAL,
    wrapHandler('SYSTEM_OPEN_EXTERNAL', (url: unknown) => {
      const validUrl = validateExternalUrl(url)
      return shell.openExternal(validUrl)
    }),
  )

  ipcMain.handle(
    IPC_SYSTEM_OPEN_PATH,
    wrapHandler('SYSTEM_OPEN_PATH', (targetPath: unknown) => {
      if (typeof targetPath !== 'string' || targetPath.length === 0) {
        throw new Error('Path must be a non-empty string')
      }
      return shell.openPath(targetPath)
    }),
  )

  ipcMain.handle(
    IPC_PORT_CHECK,
    wrapHandler('PORT_CHECK', (port: unknown) => {
      if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('Port must be an integer between 1 and 65535')
      }
      return deps.checkPort(port)
    }),
  )

  ipcMain.handle(
    IPC_WIZARD_TEST_MODEL,
    wrapHandler('WIZARD_TEST_MODEL', (config: unknown) => {
      const raw = validatePlainObject(config, 'modelConfig')
      const cfg = parseModelConfigPayload(raw)
      if (!cfg.provider || !cfg.apiKey || !cfg.modelId) {
        throw new Error('modelConfig must include provider, apiKey, and modelId')
      }
      if (cfg.provider === 'custom' && (!cfg.customProviderId || !cfg.customBaseUrl)) {
        throw new Error('custom modelConfig must include customProviderId and customBaseUrl')
      }
      return testModelConnection(cfg)
    }),
  )

  ipcMain.handle(
    IPC_WIZARD_COMPLETE_SETUP,
    wrapHandler('WIZARD_COMPLETE_SETUP', async (state: unknown) => {
      const raw = validatePlainObject(state, 'wizardState')
      if (!raw.modelConfig || !raw.gatewayConfig || !raw.channelConfig) {
        throw new Error('wizardState must include modelConfig, gatewayConfig, and channelConfig')
      }
      const ws = raw as unknown as WizardState
      const result = await handleWizardCompleteSetup(ws, {
        writeOpenClawConfig: deps.writeOpenClawConfig,
        readShellConfig: deps.readShellConfig,
        writeShellConfig: deps.writeShellConfig,
        gatewayManager: deps.gatewayManager,
      })
      return result
    }),
  )

  ipcMain.handle(
    IPC_SYSTEM_OPEN_LOG_DIR,
    wrapHandler('SYSTEM_OPEN_LOG_DIR', () => {
      return shell.openPath(deps.getUserDataDir())
    }),
  )

  ipcMain.handle(
    IPC_SHELL_GET_VERSIONS,
    wrapHandler('SHELL_GET_VERSIONS', () => deps.getVersions()),
  )

  ipcMain.handle(
    IPC_SHELL_RESIZE_FOR_MAIN_INTERFACE,
    wrapHandler('SHELL_RESIZE_FOR_MAIN_INTERFACE', () => {
      deps.resizeForMainInterface?.()
    }),
  )

  ipcMain.handle(
    IPC_SHELL_SET_WINDOW_TITLE,
    wrapHandler('SHELL_SET_WINDOW_TITLE', (title: unknown) => {
      if (typeof title !== 'string') throw new Error('title must be a string')
      deps.setMainWindowTitle?.(title)
    }),
  )

  ipcMain.handle(
    IPC_DIAGNOSTICS_EXPORT,
    wrapHandler('DIAGNOSTICS_EXPORT', async () => {
      const prestartCheck = runPrestartCheck()
      const doctorReport = await runDiagnostics({
        readOpenClawConfig: deps.readOpenClawConfig,
        readShellConfig: deps.readShellConfig,
        gatewayStatus: () => gatewayManager.getStatus(),
      })
      return exportDiagnostics({
        versions: deps.getVersions(),
        openclawConfig: deps.readOpenClawConfig(),
        shellConfig: deps.readShellConfig(),
        prestartCheck,
        doctorReport,
      })
    }),
  )

  ipcMain.handle(
    IPC_DIAGNOSTICS_RUN,
    wrapHandler('DIAGNOSTICS_RUN', async (opts?: unknown) => {
      const fix =
        opts != null &&
        typeof opts === 'object' &&
        !Array.isArray(opts) &&
        (opts as { fix?: unknown }).fix === true
      return runDiagnostics({
        readOpenClawConfig: deps.readOpenClawConfig,
        readShellConfig: deps.readShellConfig,
        gatewayStatus: () => gatewayManager.getStatus(),
        fix,
      })
    }),
  )

  ipcMain.handle(
    IPC_DIAGNOSTICS_SUMMARY,
    wrapHandler('DIAGNOSTICS_SUMMARY', async () => {
      const report = await runDiagnostics({
        readOpenClawConfig: deps.readOpenClawConfig,
        readShellConfig: deps.readShellConfig,
        gatewayStatus: () => gatewayManager.getStatus(),
      })
      return getDiagnosticsSummary(report)
    }),
  )

  // ─── Provider / auth profile ───────────────────────────────────────────────
  ipcMain.handle(
    IPC_PROVIDERS_LIST,
    wrapHandler('PROVIDERS_LIST', () => {
      const profiles = listAuthProfiles(true)
      const config = deps.readOpenClawConfig()
      return getProvidersSummary(config, profiles.map((p) => ({
        profileId: p.profileId,
        provider: p.provider,
        hasKey: p.hasKey,
      })))
    }),
  )

  ipcMain.handle(
    IPC_PROVIDERS_SAVE_PROFILE,
    wrapHandler('PROVIDERS_SAVE_PROFILE', async (opts: unknown) => {
      const raw = validatePlainObject(opts, 'saveProfile opts')
      const profileId = String(raw.profileId ?? '')
      const provider = String(raw.provider ?? '')
      const credType = raw.type === 'token' ? 'token' : 'api_key'
      if (!profileId || !provider) {
        throw new Error('profileId and provider are required')
      }
      const canonicalProfileId = normalizeAuthOrderEntry(provider, profileId)
      if (credType === 'token') {
        const token = String(raw.token ?? '')
        if (!token) throw new Error('token is required for type: token')
        saveAuthProfileToken(canonicalProfileId, provider, token)
      } else {
        const apiKey = String(raw.apiKey ?? '').trim()
        if (!apiKey) throw new Error('apiKey is required for type: api_key')
        saveAuthProfile(canonicalProfileId, provider, apiKey)
      }
      await updateOpenClawConfig((current) => {
        let next = addProfileToAuthOrder(current, provider, canonicalProfileId)
        const seed = PROVIDER_SEEDS[provider as keyof typeof PROVIDER_SEEDS] as ProviderSeed | undefined
        if (seed && !next.models?.providers?.[provider]) {
          next = structuredClone(next)
          next.models = next.models ?? {}
          next.models.mode = next.models.mode ?? 'merge'
          next.models.providers = next.models.providers ?? {}
          next.models.providers[provider] = {
            baseUrl: seed.baseUrl,
            ...(seed.api ? { api: seed.api as ModelProviderConfig['api'] } : {}),
            ...(seed.authHeader ? { authHeader: true } : {}),
          }
        }
        return next
      })
    }),
  )

  ipcMain.handle(
    IPC_PROVIDERS_DELETE_PROFILE,
    wrapHandler('PROVIDERS_DELETE_PROFILE', async (opts: unknown) => {
      const raw = validatePlainObject(opts, 'deleteProfile opts')
      const profileIdRaw = String(raw.profileId ?? '').trim()
      if (!profileIdRaw) throw new Error('profileId is required')
      const providerHint = String(raw.provider ?? '').trim()
      let canonicalId: string
      let authOrderProviderId: string
      if (profileIdRaw.includes(':')) {
        authOrderProviderId = profileIdRaw.split(':')[0]!
        canonicalId = normalizeAuthOrderEntry(authOrderProviderId, profileIdRaw)
      } else if (providerHint) {
        authOrderProviderId = providerHint
        canonicalId = normalizeAuthOrderEntry(providerHint, profileIdRaw)
      } else {
        canonicalId = profileIdRaw
        authOrderProviderId = profileIdRaw
      }
      deleteAuthProfile(canonicalId)
      await updateOpenClawConfig((current) => removeProfileFromAuthOrder(current, authOrderProviderId, canonicalId))
    }),
  )

  ipcMain.handle(
    IPC_PROVIDERS_TEST,
    wrapHandler('PROVIDERS_TEST', (config: unknown) => {
      const raw = validatePlainObject(config, 'modelConfig')
      const cfg = parseModelConfigPayload(raw)
      if (!cfg.provider || !cfg.apiKey || !cfg.modelId) {
        throw new Error('modelConfig must include provider, apiKey, and modelId')
      }
      if (cfg.provider === 'custom' && (!cfg.customProviderId || !cfg.customBaseUrl)) {
        throw new Error('custom modelConfig must include customProviderId and customBaseUrl')
      }
      return testModelConnection(cfg)
    }),
  )

  ipcMain.handle(
    IPC_PROVIDERS_EXPORT,
    wrapHandler('PROVIDERS_EXPORT', (opts?: unknown) => {
      const raw = opts && typeof opts === 'object' && !Array.isArray(opts)
        ? (opts as Record<string, unknown>)
        : {}
      return exportAuthProfiles({ maskKeys: raw.maskKeys !== false })
    }),
  )

  ipcMain.handle(
    IPC_PROVIDERS_IMPORT,
    wrapHandler('PROVIDERS_IMPORT', (json: unknown) => {
      if (typeof json !== 'string') throw new Error('json must be a string')
      return importAuthProfiles(json)
    }),
  )

  ipcMain.handle(
    IPC_PROVIDERS_SAVE_CONFIG,
    wrapHandler('PROVIDERS_SAVE_CONFIG', async (opts: unknown) => {
      const raw = validatePlainObject(opts, 'saveProviderConfig opts')
      const providerId = String(raw.providerId ?? '')
      const config = validatePlainObject(raw.config, 'provider config')
      if (!providerId) throw new Error('providerId is required')
      await updateOpenClawConfig((current) => saveProviderConfig(current, providerId, config))
    }),
  )

  ipcMain.handle(
    IPC_PROVIDERS_DELETE_PROVIDER,
    wrapHandler('PROVIDERS_DELETE_PROVIDER', async (opts: unknown) => {
      const raw = validatePlainObject(opts, 'deleteProvider opts')
      const providerId = String(raw.providerId ?? '').trim()
      if (!providerId) throw new Error('providerId is required')
      await updateOpenClawConfig((current) => deleteProviderConfig(current, providerId))
    }),
  )

  ipcMain.handle(
    IPC_PROVIDERS_SET_MODEL_DEFAULTS,
    wrapHandler('PROVIDERS_SET_MODEL_DEFAULTS', async (opts?: unknown) => {
      const raw = opts && typeof opts === 'object' && !Array.isArray(opts)
        ? (opts as Record<string, unknown>)
        : {}
      const primary = typeof raw.primary === 'string' ? raw.primary : undefined
      const fallbacks = Array.isArray(raw.fallbacks)
        ? (raw.fallbacks as unknown[]).filter((x): x is string => typeof x === 'string')
        : undefined
      await updateOpenClawConfig((current) => {
        const qualifiedPrimary =
          primary !== undefined ? resolvePrimaryModelRef(current, primary) : undefined
        const qualifiedFallbacks = fallbacks?.map((f) => resolvePrimaryModelRef(current, f))
        return setModelDefaults(current, {
          primary: qualifiedPrimary,
          fallbacks: qualifiedFallbacks,
        })
      })
    }),
  )

  ipcMain.handle(
    IPC_MODEL_SETTINGS_LOAD,
    wrapHandler('MODEL_SETTINGS_LOAD', (): ModelSettingsLoadResult => {
      if (!deps.openclawConfigExists()) {
        return {
          hasConfig: false,
          modelConfig: inferModelConfigFromOpenClaw({}),
          agents: [],
        }
      }
      const config = deps.readOpenClawConfig() ?? {}
      const dm = config.agents?.defaults?.model
      const defaultPrimaryDisplay =
        typeof dm === 'string' ? dm : dm && typeof dm === 'object' ? (dm as { primary?: string }).primary : undefined
      return {
        hasConfig: true,
        modelConfig: inferModelConfigFromOpenClaw(config),
        agents: listAgentSummariesFromConfig(config),
        defaultPrimaryDisplay,
      }
    }),
  )

  ipcMain.handle(
    IPC_MODEL_SETTINGS_APPLY,
    wrapHandler('MODEL_SETTINGS_APPLY', async (payload: unknown): Promise<ModelSettingsApplyResult> => {
      const raw = validatePlainObject(payload, 'modelSettingsApply')
      const restartGateway = raw.restartGateway === true
      const modelRaw = validatePlainObject(raw.modelConfig, 'modelConfig')
      const cfg = parseModelConfigPayload(modelRaw)
      if (!cfg.modelId.trim()) {
        throw new Error('modelId is required')
      }
      if (cfg.provider === 'custom') {
        if (!cfg.customProviderId?.trim() || !cfg.customBaseUrl?.trim()) {
          throw new Error('Custom provider requires provider ID and API base URL')
        }
      }
      if (cfg.provider === 'cloudflare-ai-gateway') {
        const accountId = cfg.cloudflareAccountId?.trim() ?? ''
        const gatewayId = cfg.cloudflareGatewayId?.trim() ?? ''
        if (!accountId || !gatewayId) {
          throw new Error('Cloudflare AI Gateway requires Account ID and Gateway ID')
        }
        if (!/^[a-f0-9]{32}$/i.test(accountId)) {
          throw new Error('Cloudflare Account ID must be a 32-character hexadecimal ID')
        }
        if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(gatewayId)) {
          throw new Error('Cloudflare Gateway ID contains unsupported characters')
        }
      }
      const targetRaw = raw.target
      if (!targetRaw || typeof targetRaw !== 'object' || Array.isArray(targetRaw)) {
        throw new Error('target is required')
      }
      const tr = targetRaw as Record<string, unknown>
      let target: ModelSettingsTarget
      if (tr.kind === 'defaults') {
        target = { kind: 'defaults' }
      } else if (tr.kind === 'agent' && typeof tr.agentId === 'string' && tr.agentId.trim()) {
        target = { kind: 'agent', agentId: tr.agentId.trim() }
      } else {
        throw new Error('target must be { kind: "defaults" } or { kind: "agent", agentId }')
      }

      const state = wizardStateForModelConfig(cfg)
      const base = deps.readOpenClawConfig() ?? {}
      const merged = mergeModelIntoOpenClawConfig(base, state, target)
      deps.writeOpenClawConfig(merged)
      readOpenClawConfig()

      const sanitized = sanitizeWizardState(state)
      const cred = writeAuthCredentialsForModelState(sanitized)
      if (!cred.ok) {
        throw new Error(cred.error)
      }

      const validationResult = await runConfigValidate()
      const isEnvLimit = validationResult.issues.some(
        (i) =>
          i.path.startsWith('__') &&
          (i.path.includes('bundle') || i.path.includes('spawn') || i.path.includes('timeout')),
      )
      const validationIssues =
        !validationResult.valid && !isEnvLimit
          ? validationResult.issues.map((i) => ({ path: i.path, message: i.message }))
          : undefined

      let restarted = false
      if (restartGateway) {
        const gwCfg = deps.readOpenClawConfig()
        const gw = gwCfg?.gateway
        const port = gw?.port ?? DEFAULT_GATEWAY_PORT
        const bind = gw?.bind ?? 'loopback'
        const token = gw?.auth?.token?.trim()
        const force = Boolean(gw?.forcePortOnConflict)
        await gatewayManager.restart({ port, bind, token: token || undefined, force })
        restarted = true
      }

      return {
        ok: true,
        restarted,
        ...(validationIssues && validationIssues.length ? { validationIssues } : {}),
      }
    }),
  )

  // ─── Registry (Skills / Extensions / Commands) ───────────────────────────
  const registryDeps = {
    getBundledOpenClawPath: deps.getBundledOpenClawPath ?? (() => ''),
    getUserDataDir: deps.getUserDataDir,
    readOpenClawConfig: deps.readOpenClawConfig,
    writeOpenClawConfig: deps.writeOpenClawConfig,
  }

  ipcMain.handle(
    IPC_SKILLS_LIST,
    wrapHandler('SKILLS_LIST', (opts?: unknown) => {
      const raw = opts && typeof opts === 'object' && !Array.isArray(opts)
        ? (opts as Record<string, unknown>)
        : {}
      const source = raw.source === 'bundled' || raw.source === 'user' ? raw.source : undefined
      return listSkillsWithProxy(registryDeps, source)
    }),
  )

  ipcMain.handle(
    IPC_SKILLS_RELOAD,
    wrapHandler('SKILLS_RELOAD', () => ({ ok: true })),
  )

  ipcMain.handle(
    IPC_SKILLS_TOGGLE,
    wrapHandler('SKILLS_TOGGLE', (opts: unknown) => {
      const raw = validatePlainObject(opts, 'skills:toggle opts')
      const skillKey = String(raw.skillKey ?? '')
      const enabled = raw.enabled === true
      if (!skillKey) throw new Error('skillKey is required')
      toggleSkill(registryDeps, skillKey, enabled)
      return { ok: true }
    }),
  )

  ipcMain.handle(
    IPC_CLAWHUB_SEARCH,
    wrapHandler('CLAWHUB_SEARCH', async (opts?: unknown) => {
      const raw =
        opts && typeof opts === 'object' && !Array.isArray(opts)
          ? (opts as Record<string, unknown>)
          : {}
      const query = String(raw.query ?? raw.q ?? '')
      const limit = typeof raw.limit === 'number' ? raw.limit : undefined
      const config = deps.readOpenClawConfig()
      return searchClawHubSkills(config, query, limit)
    }),
  )

  ipcMain.handle(
    IPC_CLAWHUB_INSTALL,
    wrapHandler('CLAWHUB_INSTALL', async (opts?: unknown) => {
      const raw =
        opts && typeof opts === 'object' && !Array.isArray(opts)
          ? (opts as Record<string, unknown>)
          : {}
      const skillRef = String(raw.skillRef ?? raw.slug ?? raw.ref ?? '')
      const config = deps.readOpenClawConfig()
      return installClawHubSkill(config, skillRef)
    }),
  )

  ipcMain.handle(
    IPC_EXTENSIONS_LIST,
    wrapHandler('EXTENSIONS_LIST', (opts?: unknown) => {
      const raw = opts && typeof opts === 'object' && !Array.isArray(opts)
        ? (opts as Record<string, unknown>)
        : {}
      const source = raw.source === 'bundled' || raw.source === 'user' ? raw.source : undefined
      return listExtensions(registryDeps, source)
    }),
  )

  ipcMain.handle(
    IPC_EXTENSIONS_TOGGLE,
    wrapHandler('EXTENSIONS_TOGGLE', (opts: unknown) => {
      const raw = validatePlainObject(opts, 'extensions:toggle opts')
      const pluginId = String(raw.pluginId ?? '')
      const enabled = raw.enabled === true
      if (!pluginId) throw new Error('pluginId is required')
      toggleExtension(registryDeps, pluginId, enabled)
      return { ok: true }
    }),
  )

  ipcMain.handle(
    IPC_REGISTRY_RELOAD,
    wrapHandler('REGISTRY_RELOAD', () => ({ ok: true })),
  )

  ipcMain.handle(
    IPC_REGISTRY_EXPORT,
    wrapHandler('REGISTRY_EXPORT', (opts?: unknown) => {
      const raw = opts && typeof opts === 'object' && !Array.isArray(opts)
        ? (opts as Record<string, unknown>)
        : {}
      const skills = Array.isArray(raw.skills) ? (raw.skills as string[]) : undefined
      const extensions = Array.isArray(raw.extensions) ? (raw.extensions as string[]) : undefined
      return exportRegistry(registryDeps, { skills, extensions })
    }),
  )

  ipcMain.handle(
    IPC_REGISTRY_IMPORT,
    wrapHandler('REGISTRY_IMPORT', (opts: unknown) => {
      const raw = validatePlainObject(opts, 'registry:import opts')
      const targetPath = String(raw.path ?? '')
      const merge = raw.merge !== false
      if (!targetPath) throw new Error('path is required')
      return importRegistry(registryDeps, { path: targetPath, merge })
    }),
  )

  ipcMain.handle(
    IPC_REGISTRY_VALIDATE,
    wrapHandler('REGISTRY_VALIDATE', (opts: unknown) => {
      const raw = validatePlainObject(opts, 'registry:validate opts')
      const kind = raw.kind === 'skill' ? 'skill' : raw.kind === 'extension' ? 'extension' : null
      const id = String(raw.id ?? '')
      if (!kind || !id) throw new Error('kind and id are required')
      return validateRegistryItem(registryDeps, kind, id)
    }),
  )

  ipcMain.handle(
    IPC_REGISTRY_INSTALL_FROM_URL,
    wrapHandler('REGISTRY_INSTALL_FROM_URL', async (opts: unknown) => {
      const raw = opts && typeof opts === 'object' && !Array.isArray(opts)
        ? (opts as Record<string, unknown>)
        : {}
      const url = String(raw.url ?? '').trim()
      if (!url) throw new Error('url is required')
      const result = await installSkillFromUrl(url)
      // Trigger reload after install
      return result
    }),
  )

  // ─── Models (RPC proxy) ────────────────────────────────────────────────────
  ipcMain.handle(
    IPC_MODELS_LIST,
    wrapHandler('MODELS_LIST', async () => {
      return listModelsWithProxy(deps.readOpenClawConfig)
    }),
  )

  ipcMain.handle(
    IPC_MODELS_SET_DEFAULT,
    wrapHandler('MODELS_SET_DEFAULT', (opts: unknown) => {
      const raw = validatePlainObject(opts, 'models:setDefault opts')
      const primary = String(raw.modelId ?? raw.primary ?? '')
      if (!primary) throw new Error('modelId or primary is required')
      const current = deps.readOpenClawConfig()
      // Bare ids (e.g. "nesa-free") become openai/<id> upstream and break chat.
      const qualified = resolvePrimaryModelRef(current, primary)
      let next = setModelDefaults(current, { primary: qualified })

      // Ensure the provider has a config entry in models.providers so the gateway
      // knows how to reach the API. Without this, switching models via the quick
      // catalog produces a valid agents.defaults.model.primary but the provider
      // block is missing → gateway start fails.
      const providerId = qualified.includes('/') ? qualified.split('/')[0]! : ''
      if (providerId && !next.models?.providers?.[providerId]) {
        const seed = PROVIDER_SEEDS[providerId as keyof typeof PROVIDER_SEEDS] as ProviderSeed | undefined
        if (seed) {
          next = JSON.parse(JSON.stringify(next)) as OpenClawConfig
          next.models = next.models ?? {}
          next.models.mode = next.models.mode ?? 'merge'
          next.models.providers = next.models.providers ?? {}
          next.models.providers[providerId] = {
            baseUrl: seed.baseUrl,
            api: seed.api as ModelProviderConfig['api'],
            ...(seed.authHeader ? { authHeader: true } : {}),
          }
        }
      }

      deps.writeOpenClawConfig(next)
      return { ok: true, primary: qualified }
    }),
  )

  ipcMain.handle(
    IPC_MODELS_SET_FALLBACKS,
    wrapHandler('MODELS_SET_FALLBACKS', (opts: unknown) => {
      const raw = validatePlainObject(opts, 'models:setFallbacks opts')
      const fallbacks = Array.isArray(raw.fallbacks)
        ? (raw.fallbacks as unknown[]).filter((x): x is string => typeof x === 'string')
        : []
      const current = deps.readOpenClawConfig()
      const qualified = fallbacks.map((f) => resolvePrimaryModelRef(current, f))
      const next = setModelDefaults(current, { fallbacks: qualified })
      deps.writeOpenClawConfig(next)
      return { ok: true, fallbacks: qualified }
    }),
  )

  ipcMain.handle(
    IPC_MODELS_SET_ALIASES,
    wrapHandler('MODELS_SET_ALIASES', (opts: unknown) => {
      const raw = validatePlainObject(opts, 'models:setAliases opts')
      const aliases = raw.aliases
      if (!aliases || typeof aliases !== 'object' || Array.isArray(aliases)) {
        throw new Error('aliases must be a record of model id to { alias?: string }')
      }
      const typed: Record<string, { alias?: string }> = {}
      for (const [k, v] of Object.entries(aliases)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          typed[k] = { alias: typeof (v as { alias?: unknown }).alias === 'string' ? (v as { alias: string }).alias : undefined }
        }
      }
      const current = deps.readOpenClawConfig()
      const next = setModelAliases(current, typed)
      deps.writeOpenClawConfig(next)
      return { ok: true }
    }),
  )

  ipcMain.handle(
    IPC_MODELS_AUTH_LOGIN,
    wrapHandler('MODELS_AUTH_LOGIN', async (opts: unknown) => {
      const raw = validatePlainObject(opts, 'models:authLogin opts')
      const requestId = String(raw.requestId ?? '').trim()
      const provider = String(raw.provider ?? '').trim()
      const method = raw.method === 'api-key' ? 'api-key' : 'oauth'
      if (!requestId) throw new Error('OAuth request id is required')
      const policy = resolveDesktopOAuthProvider(provider)
      if (!policy) throw new Error(`OAuth is not supported for provider "${provider}"`)
      const enabled = enableOAuthProviderPlugin(deps.readOpenClawConfig(), policy.pluginId)
      if (enabled.changed) deps.writeOpenClawConfig(enabled.config)
      const win = deps.getMainWindow?.()
      const promptKeys = new Set<string>()
      try {
        return await modelsAuthLogin(provider, method, {
          config: enabled.config,
          onProgress: (progress) => {
            if (win && !win.isDestroyed()) win.webContents.send(IPC_MODELS_AUTH_PROGRESS, { requestId, provider, ...progress })
          },
          onPrompt: (prompt) => new Promise<string | boolean>((resolve, reject) => {
            const key = `${requestId}:${prompt.promptId}`
            const timer = setTimeout(() => {
              pendingOAuthPrompts.delete(key)
              reject(new Error('OAuth prompt timed out'))
            }, 5 * 60_000)
            promptKeys.add(key)
            pendingOAuthPrompts.set(key, { resolve, reject, timer })
            if (win && !win.isDestroyed()) win.webContents.send(IPC_MODELS_AUTH_PROGRESS, { requestId, provider, prompt })
          }),
        })
      } finally {
        for (const key of promptKeys) {
          const pending = pendingOAuthPrompts.get(key)
          if (!pending) continue
          clearTimeout(pending.timer)
          pendingOAuthPrompts.delete(key)
        }
      }
    }),
  )

  ipcMain.handle(
    IPC_MODELS_AUTH_RESPOND,
    wrapHandler('MODELS_AUTH_RESPOND', (opts: unknown) => {
      const raw = validatePlainObject(opts, 'models:authRespond opts')
      const key = `${String(raw.requestId ?? '')}:${String(raw.promptId ?? '')}`
      const pending = pendingOAuthPrompts.get(key)
      if (!pending) return { accepted: false }
      if (typeof raw.value !== 'string' && typeof raw.value !== 'boolean') throw new Error('Invalid OAuth response')
      pendingOAuthPrompts.delete(key)
      clearTimeout(pending.timer)
      pending.resolve(raw.value)
      return { accepted: true }
    }),
  )

  ipcMain.handle(
    IPC_WHATSAPP_LOGIN_START,
    wrapHandler('WHATSAPP_LOGIN_START', async (opts?: unknown) => {
      const raw =
        opts && typeof opts === 'object' && !Array.isArray(opts)
          ? (opts as Record<string, unknown>)
          : {}
      return whatsappLoginStart({
        force: raw.force === true,
        accountId: typeof raw.accountId === 'string' ? raw.accountId : undefined,
        timeoutMs: typeof raw.timeoutMs === 'number' ? raw.timeoutMs : undefined,
      })
    }),
  )

  ipcMain.handle(
    IPC_WHATSAPP_LOGIN_WAIT,
    wrapHandler('WHATSAPP_LOGIN_WAIT', async (opts?: unknown) => {
      const raw =
        opts && typeof opts === 'object' && !Array.isArray(opts)
          ? (opts as Record<string, unknown>)
          : {}
      return whatsappLoginWait({
        currentQrDataUrl: typeof raw.currentQrDataUrl === 'string' ? raw.currentQrDataUrl : undefined,
        accountId: typeof raw.accountId === 'string' ? raw.accountId : undefined,
        timeoutMs: typeof raw.timeoutMs === 'number' ? raw.timeoutMs : undefined,
      })
    }),
  )

  ipcMain.handle(
    IPC_WHATSAPP_LOGOUT,
    wrapHandler('WHATSAPP_LOGOUT', async (opts?: unknown) => {
      const raw =
        opts && typeof opts === 'object' && !Array.isArray(opts)
          ? (opts as Record<string, unknown>)
          : {}
      return whatsappLogout({
        accountId: typeof raw.accountId === 'string' ? raw.accountId : undefined,
      })
    }),
  )

  ipcMain.handle(
    IPC_GATEWAY_APPLY_CONNECTION,
    wrapHandler('GATEWAY_APPLY_CONNECTION', async (opts: unknown) => {
      const raw = validatePlainObject(opts, 'gateway:applyConnection opts')
      const mode = raw.mode === 'remote' ? 'remote' : 'local'
      const current = deps.readOpenClawConfig() ?? ({} as OpenClawConfig)
      const prevGw =
        current.gateway && typeof current.gateway === 'object'
          ? (current.gateway as Record<string, unknown>)
          : {}
      const nextGw: Record<string, unknown> = { ...prevGw, mode }
      if (mode === 'remote') {
        const url = String(raw.url ?? '').trim()
        if (!url) throw new Error('Remote WebSocket URL is required')
        const token = String(raw.token ?? '').trim()
        const transport = raw.transport === 'ssh' ? 'ssh' : 'direct'
        nextGw.remote = {
          ...((prevGw.remote && typeof prevGw.remote === 'object'
            ? prevGw.remote
            : {}) as Record<string, unknown>),
          url,
          ...(token ? { token } : {}),
          transport,
        }
      } else {
        const bindRaw = typeof raw.bind === 'string' ? raw.bind.trim() : ''
        if (
          bindRaw === 'loopback' ||
          bindRaw === 'lan' ||
          bindRaw === 'auto' ||
          bindRaw === 'tailnet' ||
          bindRaw === 'custom'
        ) {
          nextGw.bind = bindRaw
        }
      }
      const next = { ...current, gateway: nextGw } as OpenClawConfig
      deps.writeOpenClawConfig(next)
      if (mode === 'remote') {
        return gatewayManager.applyRemoteFromConfig(next)
      }
      await gatewayManager.clearRemoteMode()
      const port = typeof nextGw.port === 'number' ? nextGw.port : DEFAULT_GATEWAY_PORT
      const bind = (typeof nextGw.bind === 'string' ? nextGw.bind : 'loopback') as
        | 'loopback'
        | 'lan'
        | 'auto'
        | 'tailnet'
        | 'custom'
      const auth =
        nextGw.auth && typeof nextGw.auth === 'object'
          ? (nextGw.auth as { token?: string })
          : undefined
      const token = auth?.token?.trim()
      const force = Boolean(nextGw.forcePortOnConflict)
      return gatewayManager.restart({ port, bind, token: token || undefined, force })
    }),
  )

  // ─── Plugins (CLI proxy) ───────────────────────────────────────────────────
  ipcMain.handle(
    IPC_PLUGINS_LIST,
    wrapHandler('PLUGINS_LIST', () => listPluginsWithCli()),
  )

  ipcMain.handle(
    IPC_PLUGINS_TOGGLE,
    wrapHandler('PLUGINS_TOGGLE', (opts: unknown) => {
      const raw = validatePlainObject(opts, 'plugins:toggle opts')
      const id = String(raw.id ?? raw.pluginId ?? '')
      const enabled = raw.enabled === true
      if (!id) throw new Error('id or pluginId is required')
      return togglePlugin(id, enabled)
    }),
  )

  ipcMain.handle(
    IPC_PLUGINS_INSTALL,
    wrapHandler('PLUGINS_INSTALL', (spec: unknown) => {
      if (typeof spec !== 'string') throw new Error('spec must be a string')
      return installPlugin(spec)
    }),
  )

  ipcMain.handle(
    IPC_PLUGINS_UNINSTALL,
    wrapHandler('PLUGINS_UNINSTALL', (opts: unknown) => {
      const raw = opts && typeof opts === 'object' && !Array.isArray(opts)
        ? (opts as Record<string, unknown>)
        : {}
      const id = String(raw.id ?? raw.pluginId ?? '')
      const keepFiles = raw.keepFiles === true
      if (!id) throw new Error('id or pluginId is required')
      return uninstallPlugin(id, { keepFiles })
    }),
  )

  ipcMain.handle(
    IPC_UPDATE_CHECK,
    wrapHandler('UPDATE_CHECK', () => checkForUpdates(deps.readShellConfig)),
  )

  ipcMain.handle(
    IPC_UPDATE_DOWNLOAD_SHELL,
    wrapHandler('UPDATE_DOWNLOAD_SHELL', () => downloadUpdate(deps.readShellConfig)),
  )

  ipcMain.handle(
    IPC_UPDATE_INSTALL_SHELL,
    wrapHandler('UPDATE_INSTALL_SHELL', () => installShellUpdateWithBackup()),
  )

  ipcMain.handle(
    IPC_UPDATE_CANCEL_DOWNLOAD,
    wrapHandler('UPDATE_CANCEL_DOWNLOAD', () => {
      cancelDownload()
      return {}
    }),
  )

  ipcMain.handle(
    IPC_UPDATE_VERIFY_BUNDLE,
    wrapHandler('UPDATE_VERIFY_BUNDLE', () => verifyBundle()),
  )

  ipcMain.handle(
    IPC_UPDATE_PRESTART_CHECK,
    wrapHandler('UPDATE_PRESTART_CHECK', () => getPrestartCheckForFrontend()),
  )

  ipcMain.handle(
    IPC_UPDATE_GET_POST_UPDATE_VALIDATION,
    wrapHandler('UPDATE_GET_POST_UPDATE_VALIDATION', () => {
      const result = readAndConsumePostUpdateResult()
      return result ?? { ran: false, ok: true, rollbackGuidance: '' }
    }),
  )

  // ─── Backup (CLI proxy) ────────────────────────────────────────────────────
  ipcMain.handle(
    IPC_BACKUP_CREATE,
    wrapHandler('BACKUP_CREATE', async (opts?: unknown) => {
      const raw = opts && typeof opts === 'object' && !Array.isArray(opts)
        ? (opts as Record<string, unknown>)
        : {}
      const params = {
        output: typeof raw.output === 'string' ? raw.output : undefined,
        includeWorkspace: raw.includeWorkspace === false ? false : undefined,
        onlyConfig: raw.onlyConfig === true ? true : undefined,
        verify: raw.verify === true ? true : undefined,
      }
      return runBackupCreateCli(params)
    }),
  )

  ipcMain.handle(
    IPC_BACKUP_VERIFY,
    wrapHandler('BACKUP_VERIFY', (archivePath: unknown) => {
      if (typeof archivePath !== 'string' || archivePath.trim().length === 0) {
        throw new Error('archivePath must be a non-empty string')
      }
      return runBackupVerifyCli(archivePath.trim())
    }),
  )

  ipcMain.handle(
    IPC_INSIGHTS_USAGE,
    wrapHandler('INSIGHTS_USAGE', () => {
      const config = deps.readOpenClawConfig()
      const model = config.agents?.defaults?.model
      const primary =
        typeof model === 'string'
          ? model
          : model && typeof model === 'object' && typeof model.primary === 'string'
            ? model.primary
            : undefined
      const fallbacks =
        model && typeof model === 'object' && Array.isArray(model.fallbacks)
          ? model.fallbacks.filter((x): x is string => typeof x === 'string')
          : []
      return collectUsageInsights({
        stateDir: deps.getUserDataDir(),
        primaryModel: primary,
        fallbacks,
      })
    }),
  )

  ipcMain.handle(
    IPC_WORKSPACE_OPEN_NOTES,
    wrapHandler('WORKSPACE_OPEN_NOTES', async () => {
      const config = deps.readOpenClawConfig()
      const workspaceDir = resolveAgentWorkspaceDir(config)
      seedDesktopWorkspace(workspaceDir)
      const notesDir = path.join(workspaceDir, 'notes')
      fs.mkdirSync(notesDir, { recursive: true })
      const err = await shell.openPath(notesDir)
      if (err) throw new Error(err)
      return { path: notesDir }
    }),
  )

  ipcMain.handle(
    IPC_WORKSPACE_MEMORY_READ,
    wrapHandler('WORKSPACE_MEMORY_READ', () => readWorkspaceMemory(deps.readOpenClawConfig())),
  )

  ipcMain.handle(
    IPC_WORKSPACE_MEMORY_WRITE,
    wrapHandler('WORKSPACE_MEMORY_WRITE', (payload: unknown) => {
      const obj = validatePlainObject(payload, 'workspaceMemoryWrite')
      const kind = obj.kind
      if (kind !== 'preferences' && kind !== 'memory' && kind !== 'soul' && kind !== 'user') {
        throw new Error('kind must be preferences | memory | soul | user')
      }
      if (typeof obj.content !== 'string') throw new Error('content must be a string')
      return writeWorkspaceMemoryFile(kind as WorkspaceMemoryKind, obj.content, deps.readOpenClawConfig())
    }),
  )

  ipcMain.handle(
    IPC_WORKSPACE_PREFERENCE_APPEND,
    wrapHandler('WORKSPACE_PREFERENCE_APPEND', (payload: unknown) => {
      const obj = validatePlainObject(payload, 'workspacePreferenceAppend')
      if (typeof obj.text !== 'string' || !obj.text.trim()) {
        throw new Error('text must be a non-empty string')
      }
      const section =
        obj.section === 'Standing preferences' || obj.section === 'Corrections'
          ? obj.section
          : 'Corrections'
      return appendWorkspacePreference(obj.text, deps.readOpenClawConfig(), section)
    }),
  )

  ipcMain.handle(
    IPC_WORKSPACE_EXPORT_AGENT_PACK,
    wrapHandler('WORKSPACE_EXPORT_AGENT_PACK', () =>
      exportAgentPack({
        config: deps.readOpenClawConfig(),
        browserWindow: deps.getMainWindow?.() ?? null,
      }),
    ),
  )

  ipcMain.handle(
    IPC_WORKSPACE_IMPORT_AGENT_PACK,
    wrapHandler('WORKSPACE_IMPORT_AGENT_PACK', () =>
      importAgentPack({
        config: deps.readOpenClawConfig(),
        browserWindow: deps.getMainWindow?.() ?? null,
      }),
    ),
  )

  ipcMain.handle(
    IPC_MODELS_PROBE_PRIMARY,
    wrapHandler('MODELS_PROBE_PRIMARY', () => probePrimaryModel(deps.readOpenClawConfig())),
  )

  // ─── Feishu pairing (local credentials + CLI fallback) ─────────────────────
  ipcMain.handle(
    IPC_PAIRING_LIST_PENDING,
    wrapHandler('PAIRING_LIST_PENDING', (payload: unknown) => {
      const obj = validatePlainObject(payload, 'pairingListPending')
      assertFeishuPairingChannel(obj.channel)
      return listPendingFeishuPairing()
    }),
  )

  ipcMain.handle(
    IPC_PAIRING_LIST_APPROVED,
    wrapHandler('PAIRING_LIST_APPROVED', (payload: unknown) => {
      const obj = validatePlainObject(payload, 'pairingListApproved')
      assertFeishuPairingChannel(obj.channel)
      return listApprovedFeishuSenders()
    }),
  )

  ipcMain.handle(
    IPC_PAIRING_APPROVE,
    wrapHandler('PAIRING_APPROVE', (payload: unknown) => {
      const obj = validatePlainObject(payload, 'pairingApprove')
      assertFeishuPairingChannel(obj.channel)
      const code = typeof obj.code === 'string' ? obj.code : ''
      const openId = typeof obj.openId === 'string' ? obj.openId : undefined
      return approveFeishuPairing(code, openId)
    }),
  )

  ipcMain.handle(
    IPC_PAIRING_REMOVE_APPROVED,
    wrapHandler('PAIRING_REMOVE_APPROVED', (payload: unknown) => {
      const obj = validatePlainObject(payload, 'pairingRemoveApproved')
      assertFeishuPairingChannel(obj.channel)
      const openId = typeof obj.openId === 'string' ? obj.openId.trim() : ''
      if (!openId) {
        throw new Error('openId is required')
      }
      return removeApprovedFeishuSender(openId)
    }),
  )


  // ─── Device pairing (gateway RPC) ──────────────────────────────────────────
  ipcMain.handle(
    IPC_DEVICE_PAIRING_LIST,
    wrapHandler('DEVICE_PAIRING_LIST', async () => {
      const client = await createDevicePairingRpcClient(deps.gatewayManager)
      try {
        return (await client.request('device.pair.list', {})) as { pending: unknown[]; paired: unknown[] }
      } finally {
        client.close()
      }
    }),
  )

  ipcMain.handle(
    IPC_DEVICE_PAIRING_APPROVE,
    wrapHandler('DEVICE_PAIRING_APPROVE', async (payload: unknown) => {
      const obj = validatePlainObject(payload, 'devicePairingApprove')
      const requestId = typeof obj.requestId === 'string' ? obj.requestId : ''
      if (!requestId) {
        throw new Error('requestId is required')
      }
      const client = await createDevicePairingRpcClient(deps.gatewayManager)
      try {
        return (await client.request('device.pair.approve', { requestId })) as {
          requestId: string
          device: unknown
        }
      } finally {
        client.close()
      }
    }),
  )
  // ─── Chat attachments (native dialog → Control UI inject) ──────────────────
  ipcMain.handle(
    IPC_CHAT_PICK_ATTACHMENTS,
    wrapHandler('CHAT_PICK_ATTACHMENTS', async () => {
      const win = deps.getMainWindow?.() ?? null
      return pickAndInjectChatAttachments(win)
    }),
  )

  // ─── Logs (RPC proxy) ──────────────────────────────────────────────────────
  ipcMain.handle(
    IPC_LOGS_TAIL,
    wrapHandler('LOGS_TAIL', async (opts: unknown) => {
      const raw = opts && typeof opts === 'object' && !Array.isArray(opts)
        ? (opts as Record<string, unknown>)
        : {}
      const params = {
        cursor: typeof raw.cursor === 'number' ? raw.cursor : undefined,
        limit: typeof raw.limit === 'number' ? raw.limit : undefined,
        maxBytes: typeof raw.maxBytes === 'number' ? raw.maxBytes : undefined,
      }
      try {
        return await tailLogsWithGateway(params)
      } catch {
        const aggregator = getLogAggregator()
        const recent = aggregator.getRecent(500).filter((e) => e.source === 'gateway')
        return {
          lines: recent.map((e) => `[${e.timestamp}] [${e.level}] ${e.message}`),
          truncated: false,
          reset: false,
        }
      }
    }),
  )

  // ─── Editor (DeskClaw Code Editor - file system) ──────────────────────────
  ipcMain.handle(
    IPC_EDITOR_OPEN_FOLDER,
    wrapHandler('EDITOR_OPEN_FOLDER', async () => {
      const win = deps.getMainWindow?.() ?? null
      if (!win) throw new Error('No main window')
      const result = await import('electron').then(({ dialog }) =>
        dialog.showOpenDialog(win, {
          properties: ['openDirectory'],
          title: 'Open Folder',
        }),
      )
      if (result.canceled || !result.filePaths[0]) return { path: null }
      return { path: result.filePaths[0] }
    }),
  )

  ipcMain.handle(
    IPC_EDITOR_LIST_DIR,
    wrapHandler('EDITOR_LIST_DIR', (dirPath: unknown) => {
      const dir = String(dirPath ?? '')
      if (!dir) throw new Error('Directory path is required')
      return { items: listEditorDirectory(dir) }
    }),
  )

  ipcMain.handle(
    IPC_EDITOR_READ_FILE,
    wrapHandler('EDITOR_READ_FILE', async (filePath: unknown) => {
      const fp = String(filePath ?? '')
      if (!fp) throw new Error('File path is required')
      return readEditorFileAsync(fp)
    }),
  )

  ipcMain.handle(
    IPC_EDITOR_WRITE_FILE,
    wrapHandler('EDITOR_WRITE_FILE', (opts: unknown) => {
      const raw = opts as Record<string, unknown>
      const fp = String(raw.filePath ?? '')
      const content = String(raw.content ?? '')
      if (!fp) throw new Error('File path is required')
      return writeEditorFile(fp, content)
    }),
  )

  ipcMain.handle(
    IPC_EDITOR_CREATE_FILE,
    wrapHandler('EDITOR_CREATE_FILE', (opts: unknown) => {
      const raw = opts as Record<string, unknown>
      const fp = String(raw.filePath ?? '')
      const isDir = raw.isDirectory === true
      if (!fp) throw new Error('File path is required')
      return createEditorEntry(fp, isDir)
    }),
  )

  ipcMain.handle(
    IPC_EDITOR_DELETE_FILE,
    wrapHandler('EDITOR_DELETE_FILE', async (opts: unknown) => {
      const raw = opts as Record<string, unknown>
      const fp = String(raw.filePath ?? '')
      const workspacePath = String(raw.workspacePath ?? '')
      if (!fp) throw new Error('File path is required')
      return deleteEditorEntry(fp, workspacePath)
    }),
  )

  // ─── Terminal (shell sessions) ───────────────────────────────────────────
  const runGit = async (cwd: string, args: string[]) => {
    if (!cwd || !fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
      throw new Error('A valid workspace directory is required')
    }
    const result = await execFileAsync('git', args, {
      cwd,
      windowsHide: true,
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
    })
    return `${result.stdout}${result.stderr}`.trim()
  }

  ipcMain.handle(
    IPC_GIT_STATUS,
    wrapHandler('GIT_STATUS', async (payload: unknown) => {
      const raw = validatePlainObject(payload, 'gitStatus')
      const cwd = String(raw.cwd ?? '')
      const output = await runGit(cwd, ['status', '--porcelain=v1', '--branch'])
      const [head = '## HEAD', ...changeLines] = output.split(/\r?\n/)
      const header = head.replace(/^##\s*/, '')
      const branch = header.split(/\.\.\.| /)[0] || 'HEAD'
      const ahead = Number(header.match(/\bahead (\d+)\b/)?.[1] ?? 0)
      const behind = Number(header.match(/\bbehind (\d+)\b/)?.[1] ?? 0)
      let remote: string | undefined
      try {
        remote = await runGit(cwd, ['remote', 'get-url', 'origin'])
      } catch {
        remote = undefined
      }
      const changes = changeLines
        .filter((line) => line.length >= 3)
        .map((line) => ({
          index: line[0],
          workingTree: line[1],
          path: line.slice(3).replace(/^.* -> /, ''),
        }))
      return { branch, remote, ahead, behind, changes }
    }),
  )

  ipcMain.handle(
    IPC_GIT_STAGE,
    wrapHandler('GIT_STAGE', async (payload: unknown) => {
      const raw = validatePlainObject(payload, 'gitStage')
      await runGit(String(raw.cwd ?? ''), ['add', '--', typeof raw.filePath === 'string' ? raw.filePath : '.'])
      return { ok: true }
    }),
  )

  ipcMain.handle(
    IPC_GIT_UNSTAGE,
    wrapHandler('GIT_UNSTAGE', async (payload: unknown) => {
      const raw = validatePlainObject(payload, 'gitUnstage')
      await runGit(String(raw.cwd ?? ''), ['restore', '--staged', '--', typeof raw.filePath === 'string' ? raw.filePath : '.'])
      return { ok: true }
    }),
  )

  ipcMain.handle(
    IPC_GIT_COMMIT,
    wrapHandler('GIT_COMMIT', async (payload: unknown) => {
      const raw = validatePlainObject(payload, 'gitCommit')
      const message = String(raw.message ?? '').trim()
      if (!message) throw new Error('Commit message is required')
      const output = await runGit(String(raw.cwd ?? ''), ['commit', '-m', message])
      return { ok: true, output }
    }),
  )

  ipcMain.handle(
    IPC_GIT_PUSH,
    wrapHandler('GIT_PUSH', async (payload: unknown) => {
      const raw = validatePlainObject(payload, 'gitPush')
      return { ok: true, output: await runGit(String(raw.cwd ?? ''), ['push']) }
    }),
  )

  ipcMain.handle(
    IPC_GIT_PULL,
    wrapHandler('GIT_PULL', async (payload: unknown) => {
      const raw = validatePlainObject(payload, 'gitPull')
      return { ok: true, output: await runGit(String(raw.cwd ?? ''), ['pull', '--ff-only']) }
    }),
  )

  const terminalSessions = new Map<string, {
    pty: pty.IPty
    shell: string
    cwd: string
    ready: boolean
    pendingOutput: string[]
  }>()

  ipcMain.handle(
    IPC_TERMINAL_START,
    wrapHandler('TERMINAL_START', (opts?: unknown) => {
      const raw = opts && typeof opts === 'object' && !Array.isArray(opts)
        ? (opts as Record<string, unknown>)
        : {}
      const requestedCwd = typeof raw.cwd === 'string' && raw.cwd.trim() ? raw.cwd.trim() : process.cwd()
      const cwd = fs.existsSync(requestedCwd) && fs.statSync(requestedCwd).isDirectory()
        ? requestedCwd
        : process.cwd()
      const isWin = process.platform === 'win32'
      const shell = isWin
        ? (process.env.COMSPEC || 'cmd.exe')
        : (process.env.SHELL || '/bin/bash')
      const shellArgs = isWin ? ['/D', '/K'] : ['--login']
      const terminalPty = pty.spawn(shell, shellArgs, {
        cwd,
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        env: { ...process.env, TERM: 'xterm-256color' },
        ...(isWin ? { useConpty: true } : {}),
      })

      const sessionId = `term_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const session = { pty: terminalPty, shell, cwd, ready: false, pendingOutput: [] as string[] }
      terminalSessions.set(sessionId, session)

      terminalPty.onData((text) => {
        if (!session.ready) {
          session.pendingOutput.push(text)
          return
        }
        const win = deps.getMainWindow?.()
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_TERMINAL_DATA, sessionId, text)
        }
      })

      terminalPty.onExit(({ exitCode }) => {
        terminalSessions.delete(sessionId)
        const win = deps.getMainWindow?.()
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_TERMINAL_EXIT, sessionId, exitCode)
        }
      })

      return { sessionId, shell, cwd }
    }),
  )

  ipcMain.handle(
    IPC_TERMINAL_RESIZE,
    wrapHandler('TERMINAL_RESIZE', (payload: unknown) => {
      const raw = payload as Record<string, unknown>
      const sessionId = String(raw.sessionId ?? '')
      if (!sessionId) throw new Error('sessionId is required')
      const session = terminalSessions.get(sessionId)
      if (!session) throw new Error(`Terminal session ${sessionId} not found`)
      if (!session.ready) {
        session.ready = true
        const win = deps.getMainWindow?.()
        if (win && !win.isDestroyed() && session.pendingOutput.length > 0) {
          win.webContents.send(IPC_TERMINAL_DATA, sessionId, session.pendingOutput.join(''))
        }
        session.pendingOutput = []
      }
      const cols = Math.max(2, Number(raw.cols) || 80)
      const rows = Math.max(1, Number(raw.rows) || 24)
      session.pty.resize(cols, rows)
      return { ok: true }
    }),
  )

  ipcMain.handle(
    IPC_TERMINAL_WRITE,
    wrapHandler('TERMINAL_WRITE', (payload: unknown) => {
      const raw = payload as Record<string, unknown>
      const sessionId = String(raw.sessionId ?? '')
      const data = String(raw.data ?? '')
      if (!sessionId) throw new Error('sessionId is required')
      const session = terminalSessions.get(sessionId)
      if (!session) throw new Error(`Terminal session ${sessionId} not found`)
      session.pty.write(data)
      return { ok: true }
    }),
  )

  ipcMain.handle(
    IPC_TERMINAL_KILL,
    wrapHandler('TERMINAL_KILL', (payload: unknown) => {
      const raw = payload as Record<string, unknown>
      const sessionId = String(raw.sessionId ?? '')
      if (!sessionId) throw new Error('sessionId is required')
      const session = terminalSessions.get(sessionId)
      if (!session) throw new Error(`Terminal session ${sessionId} not found`)
      terminalSessions.delete(sessionId)
      session.pty.write('\x03')
      session.pty.kill()
      return { ok: true }
    }),
  )

  // ─── Debugger (Node --inspect) ────────────────────────────────────────────
  interface DebugSession {
    proc: import('node:child_process').ChildProcess
    filePath: string
    inspectPort: number
    devtoolsUrl: string | null
    started: number
  }

  const debugSessions = new Map<string, DebugSession>()
  let debugPortCounter = 9230

  function getDevToolsFrontendUrl(host: string, port: number): Promise<string | null> {
    return new Promise((resolve) => {
      const req = http.get(`http://${host}:${port}/json`, (res: import('node:http').IncomingMessage) => {
        let data = ''
        res.on('data', (chunk: Buffer) => { data += chunk.toString() })
        res.on('end', () => {
          try {
            const list = JSON.parse(data)
            if (Array.isArray(list) && list.length > 0) {
              const url = list[0].devtoolsFrontendUrl as string
              resolve(url ?? null)
            } else {
              resolve(null)
            }
          } catch { resolve(null) }
        })
      })
      req.on('error', () => resolve(null))
      req.setTimeout(3000, () => { req.destroy(); resolve(null) })
    })
  }

  ipcMain.handle(
    IPC_DEBUG_LAUNCH,
    wrapHandler('DEBUG_LAUNCH', async (payload: unknown) => {
      const raw = payload as Record<string, unknown>
      const filePath = String(raw.filePath ?? '').trim()
      if (!filePath) throw new Error('filePath is required')
      if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

      const port = debugPortCounter++
      const args = [`--inspect=${port}`, filePath]
      const nodeExe = getBundledNodePath()
      const proc = spawn(fs.existsSync(nodeExe) ? nodeExe : process.execPath, args, {
        cwd: path.dirname(filePath),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      })

      const sessionId = `debug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const session: DebugSession = { proc, filePath, inspectPort: port, devtoolsUrl: null, started: Date.now() }
      debugSessions.set(sessionId, session)

      const win = deps.getMainWindow?.()

      // Pipe stdout/stderr to renderer
      proc.stdout?.on('data', (chunk: Buffer) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_DEBUG_OUTPUT, sessionId, chunk.toString('utf-8'))
        }
      })
      proc.stderr?.on('data', (chunk: Buffer) => {
        const text = chunk.toString('utf-8')
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_DEBUG_OUTPUT, sessionId, text)
        }
        // Detect "listening on ws://..." to get the actual devtools URL
        if (text.includes('listening on') || text.includes('ws://')) {
          const match = text.match(/ws:\/\/[^\s]+/)
          if (match) {
            session.devtoolsUrl = match[0]
            const devtoolsUrl = `devtools://devtools/bundled/inspector.html?ws=${encodeURIComponent(match[0].replace(/^ws:\/\//, ''))}`
            if (win && !win.isDestroyed()) {
              win.webContents.send(IPC_DEBUG_DEVTOOLS_URL, sessionId, devtoolsUrl)
            }
          }
        }
      })

      proc.on('exit', (code: number | null) => {
        debugSessions.delete(sessionId)
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_DEBUG_EXIT, sessionId, code ?? 0)
        }
      })

      proc.on('error', (err: Error) => {
        safelog('error', `[debug] ${sessionId} error:`, err.message)
        debugSessions.delete(sessionId)
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC_DEBUG_EXIT, sessionId, -1)
        }
      })

      // Also try to poll /json for devtools URL as fallback
      setTimeout(async () => {
        if (!session.devtoolsUrl) {
          const frontendUrl = await getDevToolsFrontendUrl('127.0.0.1', port)
          if (frontendUrl && win && !win.isDestroyed()) {
            session.devtoolsUrl = frontendUrl
            const devtoolsUrl = `devtools://devtools/bundled/inspector.html?ws=${encodeURIComponent(`127.0.0.1:${port}/ws`)}`
            win.webContents.send(IPC_DEBUG_DEVTOOLS_URL, sessionId, devtoolsUrl)
          }
        }
      }, 2000).unref()

      return { sessionId, inspectPort: port, pid: proc.pid }
    }),
  )

  ipcMain.handle(
    IPC_DEBUG_STOP,
    wrapHandler('DEBUG_STOP', (payload: unknown) => {
      const raw = payload as Record<string, unknown>
      const sessionId = String(raw.sessionId ?? '')
      if (!sessionId) throw new Error('sessionId is required')
      const session = debugSessions.get(sessionId)
      if (!session) throw new Error(`Debug session ${sessionId} not found`)
      debugSessions.delete(sessionId)
      session.proc.kill('SIGTERM')
      setTimeout(() => {
        try { session.proc.kill('SIGKILL') } catch { /* already dead */ }
      }, 3000).unref()
      return { ok: true }
    }),
  )

  ipcMain.handle(
    IPC_DEBUG_STATUS,
    wrapHandler('DEBUG_STATUS', (payload: unknown) => {
      const raw = payload as Record<string, unknown>
      const sessionId = String(raw.sessionId ?? '')
      if (!sessionId) return { running: false, sessions: Array.from(debugSessions.keys()) }
      const session = debugSessions.get(sessionId)
      if (!session) return { running: false }
      return {
        running: true,
        filePath: session.filePath,
        inspectPort: session.inspectPort,
        devtoolsUrl: session.devtoolsUrl,
        pid: session.proc.pid,
        uptime: Date.now() - session.started,
      }
    }),
  )

  // ─── Agent Chat ──────────────────────────────────────────────────────────
  const getMainWindow = () => deps.getMainWindow?.() ?? null

  ipcMain.handle(
    IPC_AGENT_PICK_CONTEXT,
    wrapHandler('AGENT_PICK_CONTEXT', async () => {
      const win = getMainWindow()
      if (!win) throw new Error('No main window')
      const { dialog } = await import('electron')
      const result = await dialog.showOpenDialog(win, {
        title: 'Add files to agent context',
        properties: ['openFile', 'multiSelections'],
      })
      if (result.canceled) return []
      const maxBytes = 256 * 1024
      return result.filePaths.slice(0, 12).map((filePath) => {
        const size = fs.statSync(filePath).size
        const buffer = fs.readFileSync(filePath)
        const bounded = buffer.subarray(0, maxBytes)
        return {
          path: filePath,
          name: path.basename(filePath),
          content: bounded.toString('utf8'),
          truncated: size > maxBytes,
          size,
        }
      })
    }),
  )

  ipcMain.handle(
    IPC_AGENT_CHAT,
    wrapHandler('AGENT_CHAT', async (payload: unknown) => {
      const raw = payload as Record<string, unknown>
      const message = String(raw.message ?? '').trim()
      if (!message) throw new Error('message is required')
      const conversationId = typeof raw.conversationId === 'string' ? raw.conversationId : undefined
      const model = typeof raw.model === 'string' ? raw.model.trim() : undefined
      const approvalPolicy = raw.approvalPolicy === 'full-access' ? 'full-access' : 'ask'
      const attachments = Array.isArray(raw.attachments)
        ? raw.attachments.slice(0, 12).flatMap((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return []
            const attachment = item as Record<string, unknown>
            const filePath = String(attachment.path ?? '')
            const name = String(attachment.name ?? path.basename(filePath))
            const content = String(attachment.content ?? '').slice(0, 256 * 1024)
            return filePath && content ? [{ path: filePath, name, content, truncated: attachment.truncated === true }] : []
          })
        : []

      // Get gateway status for port/token
      const status = gatewayManager.getStatus()
      if (status.status !== 'running') {
        throw new Error('Gateway is not running')
      }
      const config = deps.readOpenClawConfig()
      const auth = config?.gateway?.auth
      const token = auth?.mode === 'password' ? undefined : auth?.token?.trim() || undefined
      const password = auth?.mode === 'password' ? auth?.password?.trim() || undefined : undefined

      const result = await agentChat({
        port: status.port,
        token,
        password,
        message,
        conversationId,
        model,
        approvalPolicy,
        attachments,
        getMainWindow: () => getMainWindow(),
      })
      return result
    }),
  )

  ipcMain.handle(
    IPC_AGENT_DIFF_APPLY,
    wrapHandler('AGENT_DIFF_APPLY', (payload: unknown) => {
      const raw = payload as Record<string, unknown>
      const filePath = String(raw.filePath ?? '')
      const content = String(raw.content ?? '')
      if (!filePath) throw new Error('filePath is required')
      return applyAgentDiff(filePath, content)
    }),
  )
}

export function removeIpcHandlers(): void {
  ipcMain.removeHandler(IPC_GATEWAY_START)
  ipcMain.removeHandler(IPC_GATEWAY_STOP)
  ipcMain.removeHandler(IPC_GATEWAY_RESTART)
  ipcMain.removeHandler(IPC_GATEWAY_STATUS)
  ipcMain.removeHandler(IPC_GATEWAY_VERIFY)
  ipcMain.removeHandler(IPC_CONFIG_READ)
  ipcMain.removeHandler(IPC_CONFIG_WRITE)
  ipcMain.removeHandler(IPC_CONFIG_EXISTS)
  ipcMain.removeHandler(IPC_CONFIG_VALIDATE)
  ipcMain.removeHandler(IPC_SHELL_GET_CONFIG)
  ipcMain.removeHandler(IPC_SHELL_SET_CONFIG)
  ipcMain.removeHandler(IPC_SYSTEM_GET_LOCALE)
  ipcMain.removeHandler(IPC_SYSTEM_OPEN_EXTERNAL)
  ipcMain.removeHandler(IPC_SYSTEM_OPEN_PATH)
  ipcMain.removeHandler(IPC_PORT_CHECK)
  ipcMain.removeHandler(IPC_WIZARD_TEST_MODEL)
  ipcMain.removeHandler(IPC_WIZARD_COMPLETE_SETUP)
  ipcMain.removeHandler(IPC_SYSTEM_OPEN_LOG_DIR)
  ipcMain.removeHandler(IPC_SHELL_GET_VERSIONS)
  ipcMain.removeHandler(IPC_SHELL_RESIZE_FOR_MAIN_INTERFACE)
  ipcMain.removeHandler(IPC_SHELL_SET_WINDOW_TITLE)
  ipcMain.removeHandler(IPC_DIAGNOSTICS_EXPORT)
  ipcMain.removeHandler(IPC_DIAGNOSTICS_RUN)
  ipcMain.removeHandler(IPC_DIAGNOSTICS_SUMMARY)
  ipcMain.removeHandler(IPC_PROVIDERS_LIST)
  ipcMain.removeHandler(IPC_PROVIDERS_SAVE_PROFILE)
  ipcMain.removeHandler(IPC_PROVIDERS_DELETE_PROFILE)
  ipcMain.removeHandler(IPC_PROVIDERS_TEST)
  ipcMain.removeHandler(IPC_PROVIDERS_EXPORT)
  ipcMain.removeHandler(IPC_PROVIDERS_IMPORT)
  ipcMain.removeHandler(IPC_PROVIDERS_SAVE_CONFIG)
  ipcMain.removeHandler(IPC_PROVIDERS_SET_MODEL_DEFAULTS)
  ipcMain.removeHandler(IPC_PROVIDERS_DELETE_PROVIDER)
  ipcMain.removeHandler(IPC_MODEL_SETTINGS_LOAD)
  ipcMain.removeHandler(IPC_MODEL_SETTINGS_APPLY)
  ipcMain.removeHandler(IPC_SKILLS_LIST)
  ipcMain.removeHandler(IPC_SKILLS_TOGGLE)
  ipcMain.removeHandler(IPC_SKILLS_RELOAD)
  ipcMain.removeHandler(IPC_CLAWHUB_SEARCH)
  ipcMain.removeHandler(IPC_CLAWHUB_INSTALL)
  ipcMain.removeHandler(IPC_EXTENSIONS_LIST)
  ipcMain.removeHandler(IPC_EXTENSIONS_TOGGLE)
  ipcMain.removeHandler(IPC_REGISTRY_RELOAD)
  ipcMain.removeHandler(IPC_REGISTRY_EXPORT)
  ipcMain.removeHandler(IPC_REGISTRY_IMPORT)
  ipcMain.removeHandler(IPC_REGISTRY_VALIDATE)
  ipcMain.removeHandler(IPC_MODELS_LIST)
  ipcMain.removeHandler(IPC_MODELS_SET_DEFAULT)
  ipcMain.removeHandler(IPC_MODELS_SET_FALLBACKS)
  ipcMain.removeHandler(IPC_MODELS_SET_ALIASES)
  ipcMain.removeHandler(IPC_MODELS_AUTH_LOGIN)
  ipcMain.removeHandler(IPC_MODELS_AUTH_RESPOND)
  ipcMain.removeHandler(IPC_WHATSAPP_LOGIN_START)
  ipcMain.removeHandler(IPC_WHATSAPP_LOGIN_WAIT)
  ipcMain.removeHandler(IPC_WHATSAPP_LOGOUT)
  ipcMain.removeHandler(IPC_GATEWAY_APPLY_CONNECTION)
  ipcMain.removeHandler(IPC_PLUGINS_LIST)
  ipcMain.removeHandler(IPC_PLUGINS_TOGGLE)
  ipcMain.removeHandler(IPC_PLUGINS_INSTALL)
  ipcMain.removeHandler(IPC_PLUGINS_UNINSTALL)
  ipcMain.removeHandler(IPC_LOGS_TAIL)
  ipcMain.removeHandler(IPC_BACKUP_CREATE)
  ipcMain.removeHandler(IPC_BACKUP_VERIFY)
  ipcMain.removeHandler(IPC_INSIGHTS_USAGE)
  ipcMain.removeHandler(IPC_WORKSPACE_OPEN_NOTES)
  ipcMain.removeHandler(IPC_WORKSPACE_MEMORY_READ)
  ipcMain.removeHandler(IPC_WORKSPACE_MEMORY_WRITE)
  ipcMain.removeHandler(IPC_WORKSPACE_PREFERENCE_APPEND)
  ipcMain.removeHandler(IPC_WORKSPACE_EXPORT_AGENT_PACK)
  ipcMain.removeHandler(IPC_WORKSPACE_IMPORT_AGENT_PACK)
  ipcMain.removeHandler(IPC_MODELS_PROBE_PRIMARY)
  ipcMain.removeHandler(IPC_PAIRING_LIST_PENDING)
  ipcMain.removeHandler(IPC_PAIRING_LIST_APPROVED)
  ipcMain.removeHandler(IPC_PAIRING_APPROVE)
  ipcMain.removeHandler(IPC_PAIRING_REMOVE_APPROVED)
  ipcMain.removeHandler(IPC_DEVICE_PAIRING_LIST)
  ipcMain.removeHandler(IPC_DEVICE_PAIRING_APPROVE)
  ipcMain.removeHandler(IPC_CHAT_PICK_ATTACHMENTS)
  ipcMain.removeHandler(IPC_REGISTRY_INSTALL_FROM_URL)
  ipcMain.removeHandler(IPC_EDITOR_OPEN_FOLDER)
  ipcMain.removeHandler(IPC_EDITOR_LIST_DIR)
  ipcMain.removeHandler(IPC_EDITOR_READ_FILE)
  ipcMain.removeHandler(IPC_EDITOR_WRITE_FILE)
  ipcMain.removeHandler(IPC_EDITOR_CREATE_FILE)
  ipcMain.removeHandler(IPC_EDITOR_DELETE_FILE)
  ipcMain.removeHandler(IPC_GIT_STATUS)
  ipcMain.removeHandler(IPC_GIT_STAGE)
  ipcMain.removeHandler(IPC_GIT_UNSTAGE)
  ipcMain.removeHandler(IPC_GIT_COMMIT)
  ipcMain.removeHandler(IPC_GIT_PUSH)
  ipcMain.removeHandler(IPC_GIT_PULL)
  ipcMain.removeHandler(IPC_TERMINAL_START)
  ipcMain.removeHandler(IPC_TERMINAL_WRITE)
  ipcMain.removeHandler(IPC_TERMINAL_RESIZE)
  ipcMain.removeHandler(IPC_TERMINAL_KILL)
  ipcMain.removeHandler(IPC_DEBUG_LAUNCH)
  ipcMain.removeHandler(IPC_DEBUG_STOP)
  ipcMain.removeHandler(IPC_DEBUG_STATUS)
  ipcMain.removeHandler(IPC_AGENT_CHAT)
  ipcMain.removeHandler(IPC_AGENT_DIFF_APPLY)
  ipcMain.removeHandler(IPC_AGENT_PICK_CONTEXT)
  ipcMain.removeHandler(IPC_UPDATE_CHECK)
  ipcMain.removeHandler(IPC_UPDATE_DOWNLOAD_SHELL)
  ipcMain.removeHandler(IPC_UPDATE_INSTALL_SHELL)
  ipcMain.removeHandler(IPC_UPDATE_CANCEL_DOWNLOAD)
  ipcMain.removeHandler(IPC_UPDATE_VERIFY_BUNDLE)
  ipcMain.removeHandler(IPC_UPDATE_PRESTART_CHECK)
  ipcMain.removeHandler(IPC_UPDATE_GET_POST_UPDATE_VALIDATION)
}
