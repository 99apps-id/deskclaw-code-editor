/**
 * `window.electronAPI` typings — must match preload exposure.
 */

import type {
  GatewayStatus,
  ShellConfig,
  OpenClawConfig,
  ModelConfig,
  ModelProviderConfig,
  WizardState,
  WizardCompleteResult,
  ModelSettingsLoadResult,
  ModelSettingsApplyPayload,
  ModelSettingsApplyResult,
  AppVersionInfo,
  SkillRegistryItem,
  ExtensionRegistryItem,
  PluginInfo,
  ValidationResult,
  RegistryExportSummary,
  UpdateCheckResult,
  BundleVerifyResult,
  PrestartCheckFrontend,
  PostUpdateValidationResult,
  DiagnosticReport,
  DiagnosticItem,
  PairingApproveResult,
  PairingListApprovedResult,
  PairingListPendingResult,
  DevicePairingListResult,
} from './types'

/** TCP port check result */
export interface PortCheckResult {
  available: boolean
  pid?: number
}

/** Gateway start/restart result */
export interface GatewayStartResult {
  port: number
}

/** Wizard / provider model test result */
export interface WizardTestModelResult {
  ok: boolean
  message?: string
}

/** Gateway log line */
export interface GatewayLogPayload {
  level: string
  message: string
}

/** Structured gateway log (`stream:gateway-logs`) */
export interface StructuredLogPayload {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  source: 'shell' | 'gateway' | 'install-validation'
  message: string
}

/** Backup archive create result */
export interface BackupCreateResult {
  archivePath: string
  assets: Array<{ kind: string; displayPath: string }>
  skipped?: Array<{ kind: string; displayPath: string; reason: string }>
  verified?: boolean
}

/** `openclaw config validate --json` result */
export interface ConfigValidationResult {
  valid: boolean
  configPath: string
  issues: Array<{ path: string; message: string; allowedValues?: string[] }>
}

/** Backup verify result */
export interface BackupVerifyResult {
  ok: boolean
  archivePath?: string
  message?: string
}

/** Usage insights from on-disk session stores */
export interface UsageInsightsPeriod {
  days: number
  sessions: number
  inputTokens: number
  outputTokens: number
  byChannel: Record<string, number>
}

export interface UsageInsightsSummary {
  generatedAt: string
  periods: {
    d7: UsageInsightsPeriod
    d30: UsageInsightsPeriod
  }
  primaryModel?: string
  fallbacks: string[]
}

/** `logs.tail` RPC response */
export interface LogsTailResult {
  file?: string
  cursor?: number
  size?: number
  lines?: string[]
  truncated?: boolean
  reset?: boolean
}

/** Update-available push payload */
export interface UpdateAvailablePayload {
  version: string
}

/** Update download progress */
export interface UpdateProgressPayload {
  percent: number
  bytesPerSecond?: number
  transferred?: number
  total?: number
  completed?: boolean
  error?: string
}

/** LLM providers + profiles list */
export interface ProvidersListResult {
  profiles: Array<{ profileId: string; provider: string; hasKey: boolean }>
  providers: Array<{
    providerId: string
    baseUrl?: string
    api?: string
    hasApiKey: boolean
    models?: Array<{ id: string; name?: string }>
  }>
  modelDefaults: { primary?: string; fallbacks?: string[] }
  authOrder: Record<string, string[]>
}

/** Agent action event payload */
export interface AgentAction {
  type: string
  filePath?: string
  message?: string
  timestamp: number
}

/** Agent diff event payload */
export interface AgentDiff {
  filePath: string
  original: string
  modified: string
  timestamp: number
}

/** IPC event unsubscribe handle */
export type Unsubscribe = () => void

export interface ModelsAuthProgressPayload {
  requestId: string
  provider: string
  message?: string
  deviceCode?: string
  verificationUrl?: string
  browserOpened?: boolean
  prompt?: {
    promptId: string
    kind: 'text' | 'confirm'
    message: string
    placeholder?: string
    initialValue?: boolean
  }
}

/** Preload `electronAPI` surface */
export interface ElectronAPI {
  // ─── Invoke channels ───────────────────────────────────────────────────────
  gatewayStart: () => Promise<GatewayStartResult>
  gatewayStop: () => Promise<void>
  gatewayRestart: () => Promise<GatewayStartResult>
  gatewayStatus: () => Promise<GatewayStatus>
  gatewayVerify: () => Promise<{ ok: boolean; port: number }>
  configRead: () => Promise<OpenClawConfig>
  configWrite: (config: OpenClawConfig) => Promise<void>
  configExists: () => Promise<boolean>
  configValidate: () => Promise<ConfigValidationResult>
  shellGetConfig: () => Promise<ShellConfig>
  shellSetConfig: (config: Partial<ShellConfig>) => Promise<void>
  systemGetLocale: () => Promise<string>
  systemOpenExternal: (url: string) => Promise<void>
  systemOpenPath: (path: string) => Promise<void>
  systemOpenLogDir: () => Promise<void>
  portCheck: (port: number) => Promise<PortCheckResult>
  wizardTestModel: (config: ModelConfig) => Promise<WizardTestModelResult>
  wizardCompleteSetup: (state: WizardState) => Promise<WizardCompleteResult>
  shellGetVersions: () => Promise<AppVersionInfo>
  shellResizeForMainInterface: () => Promise<void>
  shellSetWindowTitle: (title: string) => Promise<void>
  diagnosticsExport: () => Promise<{ path: string; checksum: string }>

  providersList: () => Promise<ProvidersListResult>
  providersSaveProfile: (opts: { profileId: string; provider: string; apiKey: string }) => Promise<void>
  providersDeleteProfile: (opts: { profileId: string; provider?: string }) => Promise<void>
  providersTest: (config: ModelConfig) => Promise<WizardTestModelResult>
  providersExport: (opts?: { maskKeys?: boolean }) => Promise<string>
  providersImport: (json: string) => Promise<{ imported: number; errors: string[] }>
  providersSaveProviderConfig: (opts: { providerId: string; config: Partial<ModelProviderConfig> }) => Promise<void>
  providersDeleteProvider: (opts: { providerId: string }) => Promise<void>
  providersSetModelDefaults: (opts: { primary?: string; fallbacks?: string[] }) => Promise<void>

  modelSettingsLoad: () => Promise<ModelSettingsLoadResult>
  modelSettingsApply: (payload: ModelSettingsApplyPayload) => Promise<ModelSettingsApplyResult>

  skillsList: (opts?: { source?: 'all' | 'bundled' | 'user' }) => Promise<SkillRegistryItem[]>
  skillsToggle: (opts: { skillKey: string; enabled: boolean }) => Promise<{ ok: boolean }>
  skillsReload: () => Promise<{ ok: boolean }>
  clawhubSearch: (opts: { query: string; limit?: number }) => Promise<{
    ok: boolean
    results: Array<{
      slug: string
      name?: string
      description?: string
      score?: number
      owner?: string
    }>
    message?: string
  }>
  clawhubInstall: (opts: { skillRef: string }) => Promise<{
    ok: boolean
    slug?: string
    message?: string
  }>
  extensionsList: (opts?: { source?: 'all' | 'bundled' | 'user' }) => Promise<ExtensionRegistryItem[]>
  extensionsToggle: (opts: { pluginId: string; enabled: boolean }) => Promise<{ ok: boolean }>
  registryReload: () => Promise<{ ok: boolean }>
  registryExport: (opts?: { skills?: string[]; extensions?: string[] }) => Promise<{ path: string; summary: RegistryExportSummary; checksum: string }>
  registryImport: (opts: { path: string; merge?: boolean }) => Promise<{ ok: boolean; merged: string[]; errors: string[] }>
  registryValidate: (opts: { kind: 'skill' | 'extension'; id: string }) => Promise<ValidationResult>

  updateCheck: () => Promise<UpdateCheckResult>
  updateDownloadShell: () => Promise<void>
  updateInstallShell: () => Promise<void>
  updateCancelDownload: () => Promise<void>
  updateVerifyBundle: () => Promise<BundleVerifyResult>
  updatePrestartCheck: () => Promise<PrestartCheckFrontend>
  updateGetPostUpdateValidation: () => Promise<PostUpdateValidationResult>
  diagnosticsRun: (opts?: { fix?: boolean }) => Promise<DiagnosticReport>
  diagnosticsSummary: () => Promise<{ ok: boolean; summary: string; topIssues: DiagnosticItem[] }>

  modelsList: () => Promise<{ models: Array<{ id: string; name?: string; provider?: string }> }>
  modelsSetDefault: (opts: { modelId: string } | { primary: string }) => Promise<{ ok: boolean }>
  modelsSetFallbacks: (opts: { fallbacks: string[] }) => Promise<{ ok: boolean }>
  modelsSetAliases: (opts: { aliases: Record<string, { alias?: string }> }) => Promise<{ ok: boolean }>
  modelsAuthLogin: (opts: {
    requestId: string
    provider: string
    method?: 'oauth' | 'api-key'
  }) => Promise<{ ok: boolean; exitCode: number; message: string; stdout: string; stderr: string; deviceCode?: string; verificationUrl?: string }>
  whatsappLoginStart: (opts?: {
    force?: boolean
    accountId?: string
    timeoutMs?: number
  }) => Promise<{
    qrDataUrl?: string | null
    message?: string | null
    connected?: boolean | null
    code?: string | null
  }>
  whatsappLoginWait: (opts?: {
    currentQrDataUrl?: string | null
    accountId?: string
    timeoutMs?: number
  }) => Promise<{
    qrDataUrl?: string | null
    message?: string | null
    connected?: boolean | null
    code?: string | null
  }>
  whatsappLogout: (opts?: { accountId?: string }) => Promise<{
    qrDataUrl?: string | null
    message?: string | null
    connected?: boolean | null
    code?: string | null
  }>
  gatewayApplyConnection: (opts: {
    mode: 'local' | 'remote'
    url?: string
    token?: string
    transport?: 'direct' | 'ssh'
    /** Local mode only: how the bundled gateway listens (needed for Mobile Connect QR). */
    bind?: 'loopback' | 'lan' | 'auto' | 'tailnet' | 'custom'
  }) => Promise<GatewayStatus>

  pluginsList: () => Promise<{ plugins: PluginInfo[]; workspaceDir?: string }>
  pluginsToggle: (opts: { id: string; enabled: boolean } | { pluginId: string; enabled: boolean }) => Promise<{ ok: boolean; message?: string }>
  pluginsInstall: (spec: string) => Promise<{ ok: boolean; pluginId?: string; message?: string }>
  pluginsUninstall: (opts: { id: string; keepFiles?: boolean } | { pluginId: string; keepFiles?: boolean }) => Promise<{ ok: boolean; message?: string }>

  logsTail: (opts?: { cursor?: number; limit?: number; maxBytes?: number }) => Promise<LogsTailResult>

  backupCreate: (opts?: { output?: string; includeWorkspace?: boolean; onlyConfig?: boolean; verify?: boolean }) => Promise<BackupCreateResult>
  backupVerify: (archivePath: string) => Promise<BackupVerifyResult>

  insightsUsage: () => Promise<UsageInsightsSummary>
  workspaceOpenNotes: () => Promise<{ path: string }>
  workspaceMemoryRead: () => Promise<{
    workspaceDir: string
    preferences: string
    memory: string
    soul: string
    user: string
  }>
  workspaceMemoryWrite: (opts: {
    kind: 'preferences' | 'memory' | 'soul' | 'user'
    content: string
  }) => Promise<{ path: string }>
  workspacePreferenceAppend: (opts: {
    text: string
    section?: 'Standing preferences' | 'Corrections'
  }) => Promise<{ path: string; appended: string }>
  workspaceExportAgentPack: () => Promise<{ archivePath: string; files: string[] }>
  workspaceImportAgentPack: () => Promise<{ workspaceDir: string; extracted: string[] }>
  modelsProbePrimary: () => Promise<{
    ok: boolean
    primary?: string
    provider?: string
    message: string
  }>

  pairingListPending: (opts: { channel: 'feishu' }) => Promise<PairingListPendingResult>
  pairingListApproved: (opts: { channel: 'feishu' }) => Promise<PairingListApprovedResult>
  pairingApprove: (opts: { channel: 'feishu'; code: string; openId?: string }) => Promise<PairingApproveResult>
  pairingRemoveApproved: (opts: { channel: 'feishu'; openId: string }) => Promise<{ ok: boolean }>

  devicePairingList: () => Promise<DevicePairingListResult>
  devicePairingApprove: (opts: { requestId: string }) => Promise<PairingApproveResult>

  /** Native multi-file picker; injects into Control UI chat composer */
  chatPickAttachments: () => Promise<{ ok: boolean; count: number; skipped: string[]; message?: string }>

  // ─── Agent Chat ───────────────────────────────────────────────────────────
  agentChat: (opts: {
    message: string
    conversationId?: string
    model?: string
    approvalPolicy?: 'ask' | 'full-access'
    attachments?: Array<{ path: string; name: string; content: string; truncated?: boolean }>
  }) => Promise<{
    ok: boolean
    response?: string
    conversationId?: string
    error?: string
  }>
  agentDiffApply: (opts: { filePath: string; content: string }) => Promise<{ ok: boolean; error?: string }>

  // ─── Registry ──────────────────────────────────────────────────────────────
  registryInstallFromUrl: (opts: { url: string }) => Promise<{
    ok: boolean
    skillName?: string
    skillPath?: string
    message?: string
  }>

  // ─── Editor (DeskClaw Code Editor) ─────────────────────────────────────────
  editorOpenFolder: () => Promise<{ path: string | null }>
  editorListDir: (dirPath: string) => Promise<{ items: Array<{ name: string; path: string; isDirectory: boolean }> }>
  editorReadFile: (filePath: string) => Promise<{ content: string }>
  editorWriteFile: (filePath: string, content: string) => Promise<{ ok: boolean }>
  editorCreateFile: (filePath: string, isDirectory?: boolean) => Promise<{ ok: boolean }>
  editorDeleteFile: (filePath: string, workspacePath: string) => Promise<{ ok: boolean }>
  gitStatus: (cwd: string) => Promise<{
    branch: string
    remote?: string
    ahead: number
    behind: number
    changes: Array<{ path: string; index: string; workingTree: string }>
  }>
  modelsAuthRespond: (opts: { requestId: string; promptId: string; value: string | boolean }) => Promise<{ accepted: boolean }>
  onModelsAuthProgress: (callback: (payload: ModelsAuthProgressPayload) => void) => Unsubscribe
  agentPickContext: () => Promise<Array<{
    path: string
    name: string
    content: string
    truncated?: boolean
    size: number
  }>>
  gitStage: (cwd: string, filePath?: string) => Promise<{ ok: boolean }>
  gitUnstage: (cwd: string, filePath?: string) => Promise<{ ok: boolean }>
  gitCommit: (cwd: string, message: string) => Promise<{ ok: boolean; output: string }>
  gitPush: (cwd: string) => Promise<{ ok: boolean; output: string }>
  gitPull: (cwd: string) => Promise<{ ok: boolean; output: string }>

  // ─── Terminal ──────────────────────────────────────────────────────────────
  terminalStart: (opts?: { cwd?: string }) => Promise<{ sessionId: string; shell: string }>
  terminalWrite: (sessionId: string, data: string) => Promise<{ ok: boolean }>
  terminalResize: (sessionId: string, cols: number, rows: number) => Promise<{ ok: boolean }>
  terminalKill: (sessionId: string) => Promise<{ ok: boolean }>

  // ─── Debugger ──────────────────────────────────────────────────────────────
  debugLaunch: (opts: { filePath: string }) => Promise<{ sessionId: string; inspectPort: number; pid: number | null }>
  debugStop: (sessionId: string) => Promise<{ ok: boolean }>
  debugStatus: (sessionId?: string) => Promise<{
    running: boolean
    filePath?: string
    inspectPort?: number
    devtoolsUrl?: string | null
    pid?: number | null
    uptime?: number
    sessions?: string[]
  }>

  // ─── Event subscriptions ───────────────────────────────────────────────────
  onGatewayStatusChange: (callback: (status: GatewayStatus) => void) => Unsubscribe
  onGatewayLog: (callback: (log: GatewayLogPayload) => void) => Unsubscribe
  onStreamGatewayLogs: (callback: (log: StructuredLogPayload) => void) => Unsubscribe
  onUpdateAvailable: (callback: (info: UpdateAvailablePayload) => void) => Unsubscribe
  onUpdateProgress: (callback: (progress: UpdateProgressPayload) => void) => Unsubscribe
  onTerminalData: (callback: (sessionId: string, data: string) => void) => Unsubscribe
  onTerminalExit: (callback: (sessionId: string, code: number) => void) => Unsubscribe
  onDebugDevtoolsUrl: (callback: (sessionId: string, url: string) => void) => Unsubscribe
  onDebugOutput: (callback: (sessionId: string, text: string) => void) => Unsubscribe
  onDebugExit: (callback: (sessionId: string, code: number) => void) => Unsubscribe
  onAgentChatChunk: (callback: (conversationId: string | undefined, chunk: string, fullText: string) => void) => Unsubscribe
  onAgentChatDone: (callback: (conversationId: string | undefined, fullText: string) => void) => Unsubscribe
  onAgentAction: (callback: (action: AgentAction) => void) => Unsubscribe
  onAgentDiff: (callback: (diff: AgentDiff) => void) => Unsubscribe
}
