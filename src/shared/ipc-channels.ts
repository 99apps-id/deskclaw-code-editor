/**
 * IPC channel names — shared by main and renderer.
 * Matches the API exposed from preload.
 */

// ─── Request/response (ipcRenderer.invoke / ipcMain.handle) ─────────────────────

/** Start gateway */
export const IPC_GATEWAY_START = 'gateway:start' as const

/** Stop gateway */
export const IPC_GATEWAY_STOP = 'gateway:stop' as const

/** Restart gateway */
export const IPC_GATEWAY_RESTART = 'gateway:restart' as const

/** Gateway status query */
export const IPC_GATEWAY_STATUS = 'gateway:status' as const
export const IPC_GATEWAY_VERIFY = 'gateway:verify' as const

/** Read OpenClaw config */
export const IPC_CONFIG_READ = 'config:read' as const

/** Write OpenClaw config */
export const IPC_CONFIG_WRITE = 'config:write' as const

/** Whether OpenClaw config file exists */
export const IPC_CONFIG_EXISTS = 'config:exists' as const

/** Config schema validation (`openclaw config validate --json`) */
export const IPC_CONFIG_VALIDATE = 'config:validate' as const

/** Read shell config */
export const IPC_SHELL_GET_CONFIG = 'shell:getConfig' as const

/** Write shell config */
export const IPC_SHELL_SET_CONFIG = 'shell:setConfig' as const

/** System/app locale for i18n */
export const IPC_SYSTEM_GET_LOCALE = 'system:getLocale' as const

/** Open URL in system browser */
export const IPC_SYSTEM_OPEN_EXTERNAL = 'system:openExternal' as const

/** Reveal path in file manager */
export const IPC_SYSTEM_OPEN_PATH = 'system:openPath' as const

/** TCP port availability check */
export const IPC_PORT_CHECK = 'port:check' as const

/** Wizard: test model connectivity */
export const IPC_WIZARD_TEST_MODEL = 'wizard:testModel' as const

/** Wizard: atomically write config + credentials + start gateway */
export const IPC_WIZARD_COMPLETE_SETUP = 'wizard:completeSetup' as const

/** Open log / user data directory */
export const IPC_SYSTEM_OPEN_LOG_DIR = 'system:openLogDir' as const

/** App version / bundle info */
export const IPC_SHELL_GET_VERSIONS = 'shell:getVersions' as const

/** Resize window for main shell + embedded Control UI */
export const IPC_SHELL_RESIZE_FOR_MAIN_INTERFACE = 'shell:resizeForMainInterface' as const

/** Set main BrowserWindow title (sync with renderer i18n) */
export const IPC_SHELL_SET_WINDOW_TITLE = 'shell:setWindowTitle' as const

/** Export redacted diagnostics bundle */
export const IPC_DIAGNOSTICS_EXPORT = 'diagnostics:export' as const

/** Providers: list profiles */
export const IPC_PROVIDERS_LIST = 'providers:list' as const

/** Providers: save profile */
export const IPC_PROVIDERS_SAVE_PROFILE = 'providers:saveProfile' as const

/** Providers: delete profile */
export const IPC_PROVIDERS_DELETE_PROFILE = 'providers:deleteProfile' as const

/** Providers: test connection */
export const IPC_PROVIDERS_TEST = 'providers:test' as const

/** Providers: export profiles */
export const IPC_PROVIDERS_EXPORT = 'providers:export' as const

/** Providers: import profiles */
export const IPC_PROVIDERS_IMPORT = 'providers:import' as const

/** Providers: save provider block in config */
export const IPC_PROVIDERS_SAVE_CONFIG = 'providers:saveProviderConfig' as const

/** Providers: set default model / fallbacks */
export const IPC_PROVIDERS_SET_MODEL_DEFAULTS = 'providers:setModelDefaults' as const

/** Providers: delete a provider config block from models.providers */
export const IPC_PROVIDERS_DELETE_PROVIDER = 'providers:deleteProvider' as const

/** Settings: load model editor snapshot (infer from openclaw.json) */
export const IPC_MODEL_SETTINGS_LOAD = 'modelSettings:load' as const

/** Settings: apply model editor (merge config + optional gateway restart) */
export const IPC_MODEL_SETTINGS_APPLY = 'modelSettings:apply' as const

/** Skills list */
export const IPC_SKILLS_LIST = 'skills:list' as const

/** Skills enable/disable */
export const IPC_SKILLS_TOGGLE = 'skills:toggle' as const

/** Skills rescan/reload */
export const IPC_SKILLS_RELOAD = 'skills:reload' as const

/** Skills: search ClawHub (local gateway only) */
export const IPC_CLAWHUB_SEARCH = 'clawhub:search' as const

/** Skills: install from ClawHub (local gateway only) */
export const IPC_CLAWHUB_INSTALL = 'clawhub:install' as const

/** Extensions list */
export const IPC_EXTENSIONS_LIST = 'extensions:list' as const

/** Extensions enable/disable */
export const IPC_EXTENSIONS_TOGGLE = 'extensions:toggle' as const

/** Registry reload */
export const IPC_REGISTRY_RELOAD = 'registry:reload' as const

/** Registry export */
export const IPC_REGISTRY_EXPORT = 'registry:export' as const

/** Registry import */
export const IPC_REGISTRY_IMPORT = 'registry:import' as const

/** Registry validate */
export const IPC_REGISTRY_VALIDATE = 'registry:validate' as const

/** Check for updates (GitHub / electron-updater) */
export const IPC_UPDATE_CHECK = 'update:check' as const

/** Download shell update */
export const IPC_UPDATE_DOWNLOAD_SHELL = 'update:downloadShell' as const

/** Install shell update (backup, quit, install) */
export const IPC_UPDATE_INSTALL_SHELL = 'update:installShell' as const

/** Cancel in-progress download */
export const IPC_UPDATE_CANCEL_DOWNLOAD = 'update:cancelDownload' as const

/** Bundle verification result */
export const IPC_UPDATE_VERIFY_BUNDLE = 'update:verifyBundle' as const

/** Pre-start check result */
export const IPC_UPDATE_PRESTART_CHECK = 'update:prestartCheck' as const

/** Post-update validation (read-once) */
export const IPC_UPDATE_GET_POST_UPDATE_VALIDATION = 'update:getPostUpdateValidation' as const

/** Run full diagnostics (doctor proxy) */
export const IPC_DIAGNOSTICS_RUN = 'diagnostics:run' as const

/** Diagnostics summary */
export const IPC_DIAGNOSTICS_SUMMARY = 'diagnostics:summary' as const

/** Models list (RPC proxy) */
export const IPC_MODELS_LIST = 'models:list' as const

/** Models: set default */
export const IPC_MODELS_SET_DEFAULT = 'models:setDefault' as const

/** Models: set fallbacks */
export const IPC_MODELS_SET_FALLBACKS = 'models:setFallbacks' as const

/** Models: set aliases */
export const IPC_MODELS_SET_ALIASES = 'models:setAliases' as const

/** Models: auth login (OAuth / API key via bundled CLI) */
export const IPC_MODELS_AUTH_LOGIN = 'models:authLogin' as const
export const IPC_MODELS_AUTH_PROGRESS = 'models:authProgress' as const
export const IPC_MODELS_AUTH_RESPOND = 'models:authRespond' as const

/** WhatsApp: start QR login (gateway web.login.start) */
export const IPC_WHATSAPP_LOGIN_START = 'whatsapp:loginStart' as const

/** WhatsApp: wait for QR scan (gateway web.login.wait) */
export const IPC_WHATSAPP_LOGIN_WAIT = 'whatsapp:loginWait' as const

/** WhatsApp: logout / clear session */
export const IPC_WHATSAPP_LOGOUT = 'whatsapp:logout' as const

/** Apply gateway.mode + gateway.remote and reconnect (local start or remote attach) */
export const IPC_GATEWAY_APPLY_CONNECTION = 'gateway:applyConnection' as const

/** Plugins list (CLI proxy) */
export const IPC_PLUGINS_LIST = 'plugins:list' as const

/** Plugins enable/disable */
export const IPC_PLUGINS_TOGGLE = 'plugins:toggle' as const

/** Plugins install */
export const IPC_PLUGINS_INSTALL = 'plugins:install' as const

/** Plugins uninstall */
export const IPC_PLUGINS_UNINSTALL = 'plugins:uninstall' as const

/** Log tail (RPC or aggregator fallback) */
export const IPC_LOGS_TAIL = 'logs:tail' as const

/** Backup create */
export const IPC_BACKUP_CREATE = 'backup:create' as const

/** Backup verify */
export const IPC_BACKUP_VERIFY = 'backup:verify' as const

/** Usage insights (session store aggregation) */
export const IPC_INSIGHTS_USAGE = 'insights:usage' as const

/** Open workspace notes folder in file manager */
export const IPC_WORKSPACE_OPEN_NOTES = 'workspace:openNotes' as const

/** Read SOUL / MEMORY / preferences snapshot */
export const IPC_WORKSPACE_MEMORY_READ = 'workspace:memoryRead' as const

/** Write one workspace memory file */
export const IPC_WORKSPACE_MEMORY_WRITE = 'workspace:memoryWrite' as const

/** Append a preference / feedback line */
export const IPC_WORKSPACE_PREFERENCE_APPEND = 'workspace:preferenceAppend' as const

/** Export agent identity pack (zip) */
export const IPC_WORKSPACE_EXPORT_AGENT_PACK = 'workspace:exportAgentPack' as const

/** Import agent identity pack (zip) */
export const IPC_WORKSPACE_IMPORT_AGENT_PACK = 'workspace:importAgentPack' as const

/** Probe primary model reachability */
export const IPC_MODELS_PROBE_PRIMARY = 'models:probePrimary' as const

/** Pairing: list pending (Feishu) */
export const IPC_PAIRING_LIST_PENDING = 'pairing:listPending' as const

/** Pairing: list approved senders (Feishu allowlist) */
export const IPC_PAIRING_LIST_APPROVED = 'pairing:listApproved' as const

/** Pairing: approve by code */
export const IPC_PAIRING_APPROVE = 'pairing:approve' as const

/** Pairing: remove approved open_id */
export const IPC_PAIRING_REMOVE_APPROVED = 'pairing:removeApproved' as const

/** Device pairing: list pending requests */
export const IPC_DEVICE_PAIRING_LIST = 'devicePairing:list' as const

/** Device pairing: approve a pending request */
export const IPC_DEVICE_PAIRING_APPROVE = 'devicePairing:approve' as const

/** Chat: native file picker → inject attachments into Control UI composer */
export const IPC_CHAT_PICK_ATTACHMENTS = 'chat:pickAttachments' as const

// ─── Editor (DeskClaw Code Editor) ────────────────────────────────────────────

/** Open folder dialog and return path */
export const IPC_EDITOR_OPEN_FOLDER = 'editor:openFolder' as const

/** Read directory contents */
export const IPC_EDITOR_LIST_DIR = 'editor:listDir' as const

/** Read file content */
export const IPC_EDITOR_READ_FILE = 'editor:readFile' as const

/** Write file content */
export const IPC_EDITOR_WRITE_FILE = 'editor:writeFile' as const

/** Create file or folder */
export const IPC_EDITOR_CREATE_FILE = 'editor:createFile' as const

/** Delete file or folder */
export const IPC_EDITOR_DELETE_FILE = 'editor:deleteFile' as const

/** Read Git repository state for a workspace */
export const IPC_GIT_STATUS = 'git:status' as const

/** Stage one path, or all changes when path is omitted */
export const IPC_GIT_STAGE = 'git:stage' as const

/** Unstage one path, or all changes when path is omitted */
export const IPC_GIT_UNSTAGE = 'git:unstage' as const

/** Commit staged changes */
export const IPC_GIT_COMMIT = 'git:commit' as const

/** Push the current branch to its configured remote */
export const IPC_GIT_PUSH = 'git:push' as const

/** Pull the current branch from its configured remote */
export const IPC_GIT_PULL = 'git:pull' as const

/** Install a skill from URL (GitHub, skill.sh, Gist) */
export const IPC_REGISTRY_INSTALL_FROM_URL = 'registry:installFromUrl' as const

// ─── Terminal ─────────────────────────────────────────────────────────────────

/** Start a shell session */
export const IPC_TERMINAL_START = 'terminal:start' as const

/** Write data to a shell session */
export const IPC_TERMINAL_WRITE = 'terminal:write' as const

/** Resize a terminal session (cols, rows) */
export const IPC_TERMINAL_RESIZE = 'terminal:resize' as const

/** Kill a terminal session */
export const IPC_TERMINAL_KILL = 'terminal:kill' as const

/** Data from shell stdout/stderr (event, sent to renderer) */
export const IPC_TERMINAL_DATA = 'terminal:data' as const

/** Terminal session closed / process exited (event) */
export const IPC_TERMINAL_EXIT = 'terminal:exit' as const

// ─── Debugger (Node --inspect) ───────────────────────────────────────────────

/** Launch a debug session (spawn node --inspect) */
export const IPC_DEBUG_LAUNCH = 'debug:launch' as const

/** Stop a debug session */
export const IPC_DEBUG_STOP = 'debug:stop' as const

/** Get debug session status */
export const IPC_DEBUG_STATUS = 'debug:status' as const

/** DevTools WebSocket URL resolved (event, sent to renderer) */
export const IPC_DEBUG_DEVTOOLS_URL = 'debug:devtoolsUrl' as const

/** Debug session stdout/stderr (event) */
export const IPC_DEBUG_OUTPUT = 'debug:output' as const

/** Debug session exited (event) */
export const IPC_DEBUG_EXIT = 'debug:exit' as const

// ─── Agent Chat ──────────────────────────────────────────────────────────────

/** Send a chat message to the agent */
export const IPC_AGENT_CHAT = 'agent:chat' as const

/** Agent streaming response chunk (event) */
export const IPC_AGENT_CHAT_CHUNK = 'agent:chatChunk' as const

/** Agent done with response (event) */
export const IPC_AGENT_CHAT_DONE = 'agent:chatDone' as const

/** Agent file action (read/edit/exec - event) */
export const IPC_AGENT_ACTION = 'agent:action' as const

/** Agent inline diff for review */
export const IPC_AGENT_DIFF = 'agent:diff' as const

/** Accept/reject agent diff */
export const IPC_AGENT_DIFF_APPLY = 'agent:diffApply' as const

/** Pick local files to attach as bounded chat context */
export const IPC_AGENT_PICK_CONTEXT = 'agent:pickContext' as const

// ─── Events (ipcRenderer.on / webContents.send) ───────────────────────────────

/** Gateway status changed */
export const IPC_GATEWAY_STATUS_CHANGE = 'gateway:statusChange' as const

/** Gateway log line */
export const IPC_GATEWAY_LOG = 'gateway:log' as const

/** Structured gateway log stream */
export const IPC_STREAM_GATEWAY_LOGS = 'stream:gateway-logs' as const

/** Update available */
export const IPC_UPDATE_AVAILABLE = 'update:available' as const

/** Update download progress */
export const IPC_UPDATE_PROGRESS = 'update:progress' as const

// ─── Channel sets (bulk register/unregister) ─────────────────────────────────

/** All invoke channels */
export const IPC_INVOKE_CHANNELS = [
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
  IPC_DEBUG_LAUNCH,
  IPC_DEBUG_STOP,
  IPC_DEBUG_STATUS,
  IPC_AGENT_CHAT,
  IPC_AGENT_DIFF_APPLY,
  IPC_AGENT_PICK_CONTEXT,
] as const

/** All event channels */
export const IPC_EVENT_CHANNELS = [
  IPC_GATEWAY_STATUS_CHANGE,
  IPC_MODELS_AUTH_PROGRESS,
  IPC_GATEWAY_LOG,
  IPC_STREAM_GATEWAY_LOGS,
  IPC_UPDATE_AVAILABLE,
  IPC_UPDATE_PROGRESS,
  IPC_TERMINAL_DATA,
  IPC_TERMINAL_EXIT,
  IPC_DEBUG_DEVTOOLS_URL,
  IPC_DEBUG_OUTPUT,
  IPC_DEBUG_EXIT,
  IPC_AGENT_CHAT_CHUNK,
  IPC_AGENT_CHAT_DONE,
  IPC_AGENT_ACTION,
  IPC_AGENT_DIFF,
] as const
