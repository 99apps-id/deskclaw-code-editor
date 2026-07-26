/**
 * Preload: contextBridge.exposeInMainWorld API surface.
 * Matches ipc-channels; contextIsolation on, nodeIntegration off.
 */

import { contextBridge, ipcRenderer } from 'electron'
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
  IPC_PROVIDERS_DELETE_PROVIDER,
  IPC_PROVIDERS_SET_MODEL_DEFAULTS,
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
  IPC_REGISTRY_INSTALL_FROM_URL,
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
  IPC_AGENT_CHAT_CHUNK,
  IPC_AGENT_CHAT_DONE,
  IPC_AGENT_ACTION,
  IPC_AGENT_DIFF,
  IPC_GATEWAY_STATUS_CHANGE,
  IPC_GATEWAY_LOG,
  IPC_STREAM_GATEWAY_LOGS,
  IPC_UPDATE_AVAILABLE,
  IPC_UPDATE_PROGRESS,
  IPC_LOGS_TAIL,
} from '../shared/ipc-channels'
import type { DevicePairingListResult, PairingApproveResult } from '../shared/types'

interface IpcResult<T = unknown> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

function isIpcResult(value: unknown): value is IpcResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as IpcResult).success === 'boolean'
  )
}

const invoke = async <T>(channel: string, ...args: unknown[]): Promise<T> => {
  const raw: unknown = await ipcRenderer.invoke(channel, ...args)
  if (isIpcResult(raw)) {
    if (!raw.success) {
      throw new Error(raw.error?.message ?? `IPC call failed: ${channel}`)
    }
    return raw.data as T
  }
  return raw as T
}

const on = (
  channel: string,
  callback: (...args: unknown[]) => void
): (() => void) => {
  const handler = (_: unknown, ...args: unknown[]) => callback(...args)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

contextBridge.exposeInMainWorld('electronAPI', {
  // ─── Invoke channels ───────────────────────────────────────────────────────
  gatewayStart: () => invoke(IPC_GATEWAY_START),
  gatewayStop: () => invoke(IPC_GATEWAY_STOP),
  gatewayRestart: () => invoke(IPC_GATEWAY_RESTART),
  gatewayStatus: () => invoke(IPC_GATEWAY_STATUS),
  gatewayVerify: () => invoke<{ ok: boolean; port: number }>(IPC_GATEWAY_VERIFY),
  configRead: () => invoke(IPC_CONFIG_READ),
  configWrite: (config: unknown) => invoke(IPC_CONFIG_WRITE, config),
  configExists: () => invoke(IPC_CONFIG_EXISTS),
  configValidate: () =>
    invoke<{ valid: boolean; configPath: string; issues: Array<{ path: string; message: string; allowedValues?: string[] }> }>(
      IPC_CONFIG_VALIDATE,
    ),
  shellGetConfig: () => invoke(IPC_SHELL_GET_CONFIG),
  shellSetConfig: (config: unknown) => invoke(IPC_SHELL_SET_CONFIG, config),
  systemGetLocale: () => invoke<string>(IPC_SYSTEM_GET_LOCALE),
  systemOpenExternal: (url: string) => invoke(IPC_SYSTEM_OPEN_EXTERNAL, url),
  systemOpenPath: (path: string) => invoke(IPC_SYSTEM_OPEN_PATH, path),
  portCheck: (port: number) => invoke(IPC_PORT_CHECK, port),
  wizardTestModel: (config: unknown) => invoke(IPC_WIZARD_TEST_MODEL, config),
  wizardCompleteSetup: (state: unknown) => invoke(IPC_WIZARD_COMPLETE_SETUP, state),
  systemOpenLogDir: () => invoke(IPC_SYSTEM_OPEN_LOG_DIR),
  shellGetVersions: () => invoke(IPC_SHELL_GET_VERSIONS),
  shellResizeForMainInterface: () => invoke(IPC_SHELL_RESIZE_FOR_MAIN_INTERFACE),
  shellSetWindowTitle: (title: string) => invoke(IPC_SHELL_SET_WINDOW_TITLE, title),
  diagnosticsExport: () => invoke<{ path: string; checksum: string }>(IPC_DIAGNOSTICS_EXPORT),

  providersList: () => invoke(IPC_PROVIDERS_LIST),
  providersSaveProfile: (opts: { profileId: string; provider: string; apiKey: string }) =>
    invoke(IPC_PROVIDERS_SAVE_PROFILE, opts),
  providersDeleteProfile: (opts: { profileId: string; provider?: string }) =>
    invoke(IPC_PROVIDERS_DELETE_PROFILE, opts),
  providersTest: (config: unknown) => invoke(IPC_PROVIDERS_TEST, config),
  providersExport: (opts?: { maskKeys?: boolean }) => invoke<string>(IPC_PROVIDERS_EXPORT, opts ?? {}),
  providersImport: (json: string) => invoke<{ imported: number; errors: string[] }>(IPC_PROVIDERS_IMPORT, json),
  providersSaveProviderConfig: (opts: { providerId: string; config: unknown }) =>
    invoke(IPC_PROVIDERS_SAVE_CONFIG, opts),
  providersDeleteProvider: (opts: { providerId: string }) =>
    invoke(IPC_PROVIDERS_DELETE_PROVIDER, opts),
  providersSetModelDefaults: (opts: { primary?: string; fallbacks?: string[] }) =>
    invoke(IPC_PROVIDERS_SET_MODEL_DEFAULTS, opts ?? {}),

  modelSettingsLoad: () => invoke(IPC_MODEL_SETTINGS_LOAD),
  modelSettingsApply: (payload: unknown) => invoke(IPC_MODEL_SETTINGS_APPLY, payload),

  skillsList: (opts?: { source?: 'all' | 'bundled' | 'user' }) =>
    invoke(IPC_SKILLS_LIST, opts ?? {}),
  skillsToggle: (opts: { skillKey: string; enabled: boolean }) =>
    invoke(IPC_SKILLS_TOGGLE, opts),
  skillsReload: () => invoke(IPC_SKILLS_RELOAD),
  clawhubSearch: (opts: { query: string; limit?: number }) =>
    invoke<{
      ok: boolean
      results: Array<{
        slug: string
        name?: string
        description?: string
        score?: number
        owner?: string
      }>
      message?: string
    }>(IPC_CLAWHUB_SEARCH, opts),
  clawhubInstall: (opts: { skillRef: string }) =>
    invoke<{ ok: boolean; slug?: string; message?: string }>(IPC_CLAWHUB_INSTALL, opts),
  extensionsList: (opts?: { source?: 'all' | 'bundled' | 'user' }) =>
    invoke(IPC_EXTENSIONS_LIST, opts ?? {}),
  extensionsToggle: (opts: { pluginId: string; enabled: boolean }) =>
    invoke(IPC_EXTENSIONS_TOGGLE, opts),
  registryReload: () => invoke(IPC_REGISTRY_RELOAD),
  registryExport: (opts?: { skills?: string[]; extensions?: string[] }) =>
    invoke(IPC_REGISTRY_EXPORT, opts ?? {}),
  registryImport: (opts: { path: string; merge?: boolean }) =>
    invoke(IPC_REGISTRY_IMPORT, opts),
  registryValidate: (opts: { kind: 'skill' | 'extension'; id: string }) =>
    invoke(IPC_REGISTRY_VALIDATE, opts),

  updateCheck: () => invoke(IPC_UPDATE_CHECK),
  updateDownloadShell: () => invoke(IPC_UPDATE_DOWNLOAD_SHELL),
  updateInstallShell: () => invoke(IPC_UPDATE_INSTALL_SHELL),
  updateCancelDownload: () => invoke(IPC_UPDATE_CANCEL_DOWNLOAD),
  updateVerifyBundle: () => invoke(IPC_UPDATE_VERIFY_BUNDLE),
  updatePrestartCheck: () => invoke(IPC_UPDATE_PRESTART_CHECK),
  updateGetPostUpdateValidation: () =>
    invoke<{ ran: boolean; ok: boolean; report?: unknown; rollbackGuidance: string }>(
      IPC_UPDATE_GET_POST_UPDATE_VALIDATION,
    ),
  diagnosticsRun: (opts?: { fix?: boolean }) => invoke(IPC_DIAGNOSTICS_RUN, opts),
  diagnosticsSummary: () => invoke(IPC_DIAGNOSTICS_SUMMARY),

  modelsList: () => invoke<{ models: Array<{ id: string; name?: string; provider?: string }> }>(IPC_MODELS_LIST),
  modelsSetDefault: (opts: { modelId: string } | { primary: string }) =>
    invoke(IPC_MODELS_SET_DEFAULT, opts),
  modelsSetFallbacks: (opts: { fallbacks: string[] }) =>
    invoke(IPC_MODELS_SET_FALLBACKS, opts),
  modelsSetAliases: (opts: { aliases: Record<string, { alias?: string }> }) =>
    invoke(IPC_MODELS_SET_ALIASES, opts),
  modelsAuthLogin: (opts: { requestId: string; provider: string; method?: 'oauth' | 'api-key' }) =>
    invoke<{ ok: boolean; exitCode: number; message: string; stdout: string; stderr: string }>(
      IPC_MODELS_AUTH_LOGIN,
      opts,
    ),
  modelsAuthRespond: (opts: { requestId: string; promptId: string; value: string | boolean }) =>
    invoke<{ accepted: boolean }>(IPC_MODELS_AUTH_RESPOND, opts),
  whatsappLoginStart: (opts?: { force?: boolean; accountId?: string; timeoutMs?: number }) =>
    invoke<{
      qrDataUrl?: string | null
      message?: string | null
      connected?: boolean | null
      code?: string | null
    }>(IPC_WHATSAPP_LOGIN_START, opts),
  whatsappLoginWait: (opts?: {
    currentQrDataUrl?: string | null
    accountId?: string
    timeoutMs?: number
  }) =>
    invoke<{
      qrDataUrl?: string | null
      message?: string | null
      connected?: boolean | null
      code?: string | null
    }>(IPC_WHATSAPP_LOGIN_WAIT, opts),
  whatsappLogout: (opts?: { accountId?: string }) =>
    invoke<{
      qrDataUrl?: string | null
      message?: string | null
      connected?: boolean | null
      code?: string | null
    }>(IPC_WHATSAPP_LOGOUT, opts),
  gatewayApplyConnection: (opts: {
    mode: 'local' | 'remote'
    url?: string
    token?: string
    transport?: 'direct' | 'ssh'
    bind?: 'loopback' | 'lan' | 'auto' | 'tailnet' | 'custom'
  }) => invoke(IPC_GATEWAY_APPLY_CONNECTION, opts),

  pluginsList: () => invoke(IPC_PLUGINS_LIST),
  pluginsToggle: (opts: { id: string; enabled: boolean } | { pluginId: string; enabled: boolean }) =>
    invoke(IPC_PLUGINS_TOGGLE, opts),
  pluginsInstall: (spec: string) => invoke(IPC_PLUGINS_INSTALL, spec),
  pluginsUninstall: (opts: { id: string; keepFiles?: boolean } | { pluginId: string; keepFiles?: boolean }) =>
    invoke(IPC_PLUGINS_UNINSTALL, opts),

  logsTail: (opts?: { cursor?: number; limit?: number; maxBytes?: number }) =>
    invoke<{ file?: string; cursor?: number; size?: number; lines?: string[]; truncated?: boolean; reset?: boolean }>(
      IPC_LOGS_TAIL,
      opts ?? {},
    ),

  backupCreate: (opts?: { output?: string; includeWorkspace?: boolean; onlyConfig?: boolean; verify?: boolean }) =>
    invoke<{ archivePath: string; assets: Array<{ kind: string; displayPath: string }>; skipped?: Array<{ kind: string; displayPath: string; reason: string }>; verified?: boolean }>(
      IPC_BACKUP_CREATE,
      opts ?? {},
    ),
  backupVerify: (archivePath: string) =>
    invoke<{ ok: boolean; archivePath?: string; message?: string }>(IPC_BACKUP_VERIFY, archivePath),

  insightsUsage: () =>
    invoke<{
      generatedAt: string
      periods: {
        d7: {
          days: number
          sessions: number
          inputTokens: number
          outputTokens: number
          byChannel: Record<string, number>
        }
        d30: {
          days: number
          sessions: number
          inputTokens: number
          outputTokens: number
          byChannel: Record<string, number>
        }
      }
      primaryModel?: string
      fallbacks: string[]
    }>(IPC_INSIGHTS_USAGE),

  workspaceOpenNotes: () => invoke<{ path: string }>(IPC_WORKSPACE_OPEN_NOTES),

  workspaceMemoryRead: () =>
    invoke<{
      workspaceDir: string
      preferences: string
      memory: string
      soul: string
      user: string
    }>(IPC_WORKSPACE_MEMORY_READ),

  workspaceMemoryWrite: (opts: {
    kind: 'preferences' | 'memory' | 'soul' | 'user'
    content: string
  }) => invoke<{ path: string }>(IPC_WORKSPACE_MEMORY_WRITE, opts),

  workspacePreferenceAppend: (opts: {
    text: string
    section?: 'Standing preferences' | 'Corrections'
  }) => invoke<{ path: string; appended: string }>(IPC_WORKSPACE_PREFERENCE_APPEND, opts),

  workspaceExportAgentPack: () =>
    invoke<{ archivePath: string; files: string[] }>(IPC_WORKSPACE_EXPORT_AGENT_PACK),

  workspaceImportAgentPack: () =>
    invoke<{ workspaceDir: string; extracted: string[] }>(IPC_WORKSPACE_IMPORT_AGENT_PACK),

  modelsProbePrimary: () =>
    invoke<{ ok: boolean; primary?: string; provider?: string; message: string }>(
      IPC_MODELS_PROBE_PRIMARY,
    ),

  pairingListPending: (opts: { channel: 'feishu' }) =>
    invoke<{ channel: 'feishu'; requests: Array<{ code: string; openId?: string; displayName?: string; createdAt?: string; expiresAt?: string }> }>(
      IPC_PAIRING_LIST_PENDING,
      opts,
    ),
  pairingListApproved: (opts: { channel: 'feishu' }) =>
    invoke<{ channel: 'feishu'; senders: Array<{ openId: string }> }>(IPC_PAIRING_LIST_APPROVED, opts),
  pairingApprove: (opts: { channel: 'feishu'; code: string; openId?: string }) =>
    invoke<{ ok: boolean; message?: string }>(IPC_PAIRING_APPROVE, opts),
  pairingRemoveApproved: (opts: { channel: 'feishu'; openId: string }) =>
    invoke<{ ok: boolean }>(IPC_PAIRING_REMOVE_APPROVED, opts),

  devicePairingList: () => invoke<DevicePairingListResult>(IPC_DEVICE_PAIRING_LIST),
  devicePairingApprove: (opts: { requestId: string }) =>
    invoke<PairingApproveResult>(IPC_DEVICE_PAIRING_APPROVE, opts),

  chatPickAttachments: () =>
    invoke<{ ok: boolean; count: number; skipped: string[]; message?: string }>(IPC_CHAT_PICK_ATTACHMENTS),

  // ─── Editor (DeskClaw Code Editor) ────────────────────────────────────────────
  editorOpenFolder: () =>
    invoke<{ path: string | null }>(IPC_EDITOR_OPEN_FOLDER),
  editorListDir: (dirPath: string) =>
    invoke<{ items: Array<{ name: string; path: string; isDirectory: boolean }> }>(IPC_EDITOR_LIST_DIR, dirPath),
  editorReadFile: (filePath: string) =>
    invoke<{ content: string }>(IPC_EDITOR_READ_FILE, filePath),
  editorWriteFile: (filePath: string, content: string) =>
    invoke<{ ok: boolean }>(IPC_EDITOR_WRITE_FILE, { filePath, content }),
  editorCreateFile: (filePath: string, isDirectory?: boolean) =>
    invoke<{ ok: boolean }>(IPC_EDITOR_CREATE_FILE, { filePath, isDirectory }),
  editorDeleteFile: (filePath: string, workspacePath: string) =>
    invoke<{ ok: boolean }>(IPC_EDITOR_DELETE_FILE, { filePath, workspacePath }),
  gitStatus: (cwd: string) =>
    invoke<{
      branch: string
      remote?: string
      ahead: number
      behind: number
      changes: Array<{ path: string; index: string; workingTree: string }>
    }>(IPC_GIT_STATUS, { cwd }),
  gitStage: (cwd: string, filePath?: string) =>
    invoke<{ ok: boolean }>(IPC_GIT_STAGE, { cwd, filePath }),
  gitUnstage: (cwd: string, filePath?: string) =>
    invoke<{ ok: boolean }>(IPC_GIT_UNSTAGE, { cwd, filePath }),
  gitCommit: (cwd: string, message: string) =>
    invoke<{ ok: boolean; output: string }>(IPC_GIT_COMMIT, { cwd, message }),
  gitPush: (cwd: string) =>
    invoke<{ ok: boolean; output: string }>(IPC_GIT_PUSH, { cwd }),
  gitPull: (cwd: string) =>
    invoke<{ ok: boolean; output: string }>(IPC_GIT_PULL, { cwd }),

  // ─── Agent Chat ──────────────────────────────────────────────────────────────
  agentChat: (opts: {
    message: string
    conversationId?: string
    model?: string
    approvalPolicy?: 'ask' | 'full-access'
    attachments?: Array<{ path: string; name: string; content: string; truncated?: boolean }>
  }) =>
    invoke<{ ok: boolean; response?: string; conversationId?: string; error?: string }>(IPC_AGENT_CHAT, opts),
  agentPickContext: () =>
    invoke<Array<{ path: string; name: string; content: string; truncated?: boolean; size: number }>>(IPC_AGENT_PICK_CONTEXT),
  agentDiffApply: (opts: { filePath: string; content: string }) =>
    invoke<{ ok: boolean; error?: string }>(IPC_AGENT_DIFF_APPLY, opts),

  // ─── Registry ────────────────────────────────────────────────────────────────
  registryInstallFromUrl: (opts: { url: string }) =>
    invoke<{ ok: boolean; skillName?: string; skillPath?: string; message?: string }>(IPC_REGISTRY_INSTALL_FROM_URL, opts),

  // ─── Terminal ────────────────────────────────────────────────────────────────
  terminalStart: (opts?: { cwd?: string }) =>
    invoke<{ sessionId: string; shell: string }>(IPC_TERMINAL_START, opts ?? {}),
  terminalWrite: (sessionId: string, data: string) =>
    invoke(IPC_TERMINAL_WRITE, { sessionId, data }),
  terminalResize: (sessionId: string, cols: number, rows: number) =>
    invoke(IPC_TERMINAL_RESIZE, { sessionId, cols, rows }),
  terminalKill: (sessionId: string) =>
    invoke(IPC_TERMINAL_KILL, { sessionId }),

  // ─── Debugger ────────────────────────────────────────────────────────────────
  debugLaunch: (opts: { filePath: string }) =>
    invoke<{ sessionId: string; inspectPort: number; pid: number | null }>(IPC_DEBUG_LAUNCH, opts),
  debugStop: (sessionId: string) =>
    invoke(IPC_DEBUG_STOP, { sessionId }),
  debugStatus: (sessionId?: string) =>
    invoke(IPC_DEBUG_STATUS, { sessionId: sessionId ?? '' }),

  // ─── Event subscriptions ─────────────────────────────────────────────────────
  onGatewayStatusChange: (callback: (status: unknown) => void) =>
    on(IPC_GATEWAY_STATUS_CHANGE, callback),
  onModelsAuthProgress: (callback: (payload: unknown) => void) =>
    on(IPC_MODELS_AUTH_PROGRESS, callback),
  onGatewayLog: (callback: (log: unknown) => void) =>
    on(IPC_GATEWAY_LOG, callback),
  onStreamGatewayLogs: (callback: (log: unknown) => void) =>
    on(IPC_STREAM_GATEWAY_LOGS, callback),
  onUpdateAvailable: (callback: (info: unknown) => void) =>
    on(IPC_UPDATE_AVAILABLE, callback),
  onUpdateProgress: (callback: (progress: unknown) => void) =>
    on(IPC_UPDATE_PROGRESS, callback),
  onTerminalData: (callback: (sessionId: string, data: string) => void) =>
    on(IPC_TERMINAL_DATA, callback as (...args: unknown[]) => void),
  onTerminalExit: (callback: (sessionId: string, code: number) => void) =>
    on(IPC_TERMINAL_EXIT, callback as (...args: unknown[]) => void),
  onDebugDevtoolsUrl: (callback: (sessionId: string, url: string) => void) =>
    on(IPC_DEBUG_DEVTOOLS_URL, callback as (...args: unknown[]) => void),
  onDebugOutput: (callback: (sessionId: string, text: string) => void) =>
    on(IPC_DEBUG_OUTPUT, callback as (...args: unknown[]) => void),
  onDebugExit: (callback: (sessionId: string, code: number) => void) =>
    on(IPC_DEBUG_EXIT, callback as (...args: unknown[]) => void),
  onAgentChatChunk: (callback: (conversationId: string | undefined, chunk: string, fullText: string) => void) =>
    on(IPC_AGENT_CHAT_CHUNK, callback as (...args: unknown[]) => void),
  onAgentChatDone: (callback: (conversationId: string | undefined, fullText: string) => void) =>
    on(IPC_AGENT_CHAT_DONE, callback as (...args: unknown[]) => void),
  onAgentAction: (callback: (action: { type: string; filePath?: string; message?: string; timestamp: number }) => void) =>
    on(IPC_AGENT_ACTION, callback as (...args: unknown[]) => void),
  onAgentDiff: (callback: (diff: { filePath: string; original: string; modified: string; timestamp: number }) => void) =>
    on(IPC_AGENT_DIFF, callback as (...args: unknown[]) => void),
})
