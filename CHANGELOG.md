# Changelog

All notable changes to OpenClaw Desktop Plus will be documented in this file.

## [Unreleased]

### Audit

- Re-verified the bundled OpenClaw version against the npm registry and the project's own `check-openclaw-versions.ts` gate: `openclawBundleVersion` (`2026.7.1-2`) already matches `openclaw@latest` as of 2026-08-05 — no bundle version bump needed.

### Fixed

- **Security:** `pnpm audit --prod` surfaced 3 advisories (2 low, 1 moderate) for `dompurify` pulled in transitively by `monaco-editor@0.56.0` (the latest published `monaco-editor`, which itself pins the vulnerable `dompurify@3.4.8`). Added a `pnpm.overrides` entry pinning `dompurify` to `^3.4.13` (patched); `pnpm audit --prod` and `pnpm run type-check` are clean after the fix. See `AUDIT_REPORT.md` for details, including upcoming upstream OpenClaw features tracked on the `beta` channel (`2026.7.2-beta.7`) for future adoption once promoted to stable.

## [0.10.0] - 2026-07-26

### Added

- **Cross-platform support (Windows, macOS, Linux):**
  - Platform-agnostic OS detection (`getPlatformInfo`, `isWindows`, `isMacOS`, `isLinux`) in `platform.ts`
  - macOS DMG build target (x64 + arm64) with entitlements for bundled Node.js
  - Linux build targets (AppImage, deb, rpm) with AppStream metadata
  - Platform-aware Node.js binary download (`download-node.ts` now detects OS and architecture)
  - Cross-platform port checking: Windows `netstat`, macOS `lsof`, Linux `ss`
  - Linux autostart via `.config/autostart/.desktop` file
  - macOS notarization support via `afterSign` hook (ready when credentials are configured)
  - CI release pipeline now builds for all three platforms
  - Graceful tray icon fallback on Linux when `libappindicator` is not installed
  - `updateOpenClawConfig()` with mutex to prevent concurrent config write races

- **Provider management:**
  - Delete provider config block from UI + IPC (`providers:deleteProvider`)
  - Edit auth profile (pre-fill add form with existing profile data)
  - Provider seed configs for `bedrock`, `google-vertex`, `google-gemini-cli`, `qwen-portal`, `openai-codex`, `github-copilot`
  - Auto-seed provider config when setting model default (prevents gateway start failures)

- **Vision model auto-fallback:**
  - "Auto (use primary)" checkbox for `imageModel` and `pdfModel` in Vision settings
  - When auto is selected, gateway falls back to the primary chat model for image/PDF attachments

- **OAuth device code display:**
  - Device/machine code extraction from CLI output (GitHub device flow, etc.)
  - Visual device code box with `select-all` and verification URL link
  - Available in both Model Settings and Setup Wizard

- **Gateway event handling:**
  - `onEvent` callback in `GatewayRpcClient` for gateway-pushed events (tool-events, notifications)

- **Documentation:**
  - Cross-platform install guides for Windows/macOS/Linux in README, USER_GUIDE, DEVELOPMENT, PACKAGING

### Fixed

- **Mobile Connect / QR pairing:** After activating Mobile Connect, navigation now opens the device-pair approval panel instead of the Control UI nodes page. Users see pending pairing requests immediately.

- **Model provider change failure:** `modelsSetDefault` now auto-seeds the provider config in `models.providers` when changing to a new provider, preventing gateway start failures.

- **Config race condition:** All config-modifying IPC handlers now use `updateOpenClawConfig()` with an async mutex to prevent read-modify-write race conditions.

- **models.list slow fallback:** Reduced RPC timeout from 15s to 5s for the models list request, so the Models panel loads faster when the gateway is down.

- **Hardcoded Windows paths:** Replaced `%USERPROFILE%`, backslash paths, and Windows-specific error messages with cross-platform alternatives.

- **Hardcoded `node.exe` in scripts:** Updated `download-openclaw.ts`, `prepare-bundle.ts`, `verify-bundle.ts`, `verify-native-modules.ts` to use platform-appropriate Node.js binary name.

- **Windows-only commands in scripts:** Added platform guards for `cmd /c rmdir` (fallback to `rmSync` on Unix) and `PowerShell` cert generation.

- **Update system cross-platform:** Asset selection, download paths, and installer execution now handle `.dmg` (macOS) and `.AppImage` (Linux) in addition to `.exe` (Windows).

- **Unused imports:** Removed unused `useMemo` from `AboutView.tsx`, unused `TFunction` from `FeishuAccessView.tsx`.

- **Hardcoded English strings:** Localized "Gateway did not become ready..." and "Restarting Gateway…" with i18n keys.

- **Missing i18n keys:** Added `shell.devicePair.*` keys (18+ strings) and `shell.embed.gatewayTimeout`/`restartingGateway` to `en.json`.

### Fixed

- **Device pairing navigation:** Added the Mobile Connect / device-pair panel to the desktop shell navigation and embedded panel routing so users can approve mobile pairing requests from the desktop app.

## [0.9.2] - 2026-07-25

### Fixed

- **Tools profile migration:** Replace invalid `agents.defaults.tools` migration with `tools.profile` migration. Set profile to `full` when missing, unknown, `messaging`, or `minimal` so core tools (read/write/edit/exec/apply_patch/fetch) are available in the webchat UI.

## [0.9.1] - 2026-07-25

### Fixed

- **Default agent tools:** Ensure `agents.defaults.tools` always enables `read`, `write`, `edit`, `exec`, `process`, `apply_patch`, and `fetch` so the chat agent can execute tools from the webchat UI.

### Added

- **Unit tests:** Added coverage for agent tool default migration (`openclaw-config`).

## [0.9.0] - 2026-07-25

### Added

- **Workspace notes:** On first setup (and idempotently on launch), seed `workspace/notes/` plus SOUL/MEMORY/USER/HEARTBEAT templates when missing; existing SOUL gets a Personal notes section without overwriting custom HEARTBEAT.
- **Habit learning (lightweight):** Seed `notes/preferences.md` and append async habit-capture rules to SOUL/HEARTBEAT/MEMORY so the agent learns user preferences over time without reflecting on every reply or auto-installing skills.
- **Preferences & memory panel:** Settings editor for `notes/preferences.md`, `MEMORY.md`, and `SOUL.md`, plus quick feedback append, and export/import of an agent identity pack (zip).
- **Primary model probe:** Dashboard pings the configured primary model on load and can re-probe on demand.
- **WhatsApp pairing polish:** Clearer linked state after QR success; Windows toast when `whatsapp-pairing.json` has pending codes.
- **Onboarding tip:** Dismissible Dashboard tip explaining notes + habit learning.
- **Model health banner:** Dashboard watches gateway logs for primary-down / failover / rate-limit signals and links to Failover settings.
- **Usage insights:** Dashboard shows 7- and 30-day session counts and token totals from local session stores.
- **Backup UI:** Settings → Backup creates a verified OpenClaw state archive (full or config-only).

### Fixed

- **Channels Save:** Preserve WhatsApp `dmPolicy` / `allowFrom` / `selfChatMode` (and related policy fields) instead of replacing the whole `channels.whatsapp` object and falling back to pairing.

## [0.8.2] - 2026-07-24

### Added

- **Unit tests:** Vitest for `model-ref`, `gateway-remote`, and Control UI flag merge; `pnpm test` runs in CI.

### Fixed

- **NSIS installer:** Default off `useZip` (opt-in via `OPENCLAW_FAST_INSTALLER=1`) to avoid “Failed to decompress files / Error opening ZIP file” on large bundles.

## [0.8.1] - 2026-07-24

### Added

- **ClawHub (local gateway):** Skills panel search/install via `openclaw skills search|install`; remote mode blocks local install and deep-links to Control UI Skills.
- **Control UI shortcuts:** Tasks, Automations, MCP from Dashboard, Skills, and the floating Control UI toolbar (local + remote deep-links with token preserved).
- **Docs:** Rewrote [README](README.md); added [docs/USER_GUIDE.md](docs/USER_GUIDE.md); removed outdated Chinese UI screenshots from the previous fork.

### Fixed

- **Model refs:** Qualify primary/fallbacks on set-default paths; avoid double `provider/provider/id` when catalog ids are already qualified; custom endpoint restores previous primary before gateway restart.
- **WhatsApp QR:** Native Channels QR with auto `loginWait` refresh loop.
- **Custom providers:** Upsert models by id instead of wiping sibling catalog entries.
- **Control UI shortcuts:** Use real Control UI routes (`/automation`, `/settings/mcp`); preserve remote `controlUi` base path when deep-linking.
- **Release CI:** Publish/upload globs match `OpenClaw-Desktop-Plus-Setup-*.exe` (was still looking for legacy `OpenClaw-Setup-*.exe`).
- **Control UI CI:** Fall back to `npx tsdown` when local `npm install tsdown` crashes (npm `edgesOut`).

## [0.8.0] - 2026-07-24

### Changed

- **Author / publisher:** Installer metadata uses **99apps.id** (no `@AgentKernel` / email-as-publisher); contact email remains in `package.json` `author.email` only.
- **Branding:** Product renamed to **OpenClaw Desktop Plus** (`productName`, shortcuts, i18n, README); `package.json` `name` → `openclaw-desktop-plus`; installer artifact `OpenClaw-Desktop-Plus-Setup-…`. Shell config migrates once from `%APPDATA%\OpenClaw Desktop` to `…\OpenClaw Desktop Plus`. **`appId` → `com.openclaw.desktop-plus`** (new Windows product identity — uninstall the previous `com.openclaw.desktop` build before installing; in-place upgrade from the old appId is not supported).
- **Repository:** Home / publish / updater URLs point to [99apps-id/openclaw-desktop-plus](https://github.com/99apps-id/openclaw-desktop-plus).
- **Locales:** Removed Simplified/Traditional Chinese UI packs and docs; Chinese OS locales fall back to English. Docs and source comments are English-only.
- **Bundled OpenClaw:** npm **2026.4.2** → **2026.7.1-2** (then `openclaw@latest`). Upstream: [v2026.7.1](https://github.com/openclaw/openclaw/releases/tag/v2026.7.1) · [docs](https://docs.openclaw.ai/releases/2026.7.1).
- **Bundled Node.js:** **22.16.0** → **22.23.1** (upstream `engines` `>=22.22.3` on 22.x); sync `download-node`, version checks, CI `NODE_VERSION_CI`, `package.json` `engines`.
- **Control UI source tags:** npm republish versions (e.g. `2026.7.1-2`) fall back to baseline GitHub tag (`v2026.7.1`) when `v…-N` is missing; materialize `workspace:*` packages for Vite (`ensure-openclaw-control-ui.ts`).
- **Desktop UX:** Top-bar Models / Channels; default-model panel; WhatsApp multi-account; wizard multi-account; GPT-5.6 presets.
- **Release:** Shell **`0.8.0+openclaw.2026.7.1-2`**; tag **`v0.8.0+openclaw.2026.7.1-2`**.
- **Docs:** README / CONTRIBUTING / release examples aligned to **0.8.0** and **2026.7.1-2**.

### Fixed

- **Models:** Operator precedence bug in `ModelSettingsSection` “custom model” detection (empty `modelId` misclassified as custom when presets exist).

### Added

- **Coding chat attach:** Shell **Attach** button (native multi-file dialog) injects images/documents into the Control UI composer; iframe `allow` for clipboard/camera; composer hint + drop affordance; Settings/Models **Vision & PDF models** (`agents.defaults.imageModel` / `pdfModel`). Vision save preserves structured `{ primary, fallbacks }`; custom endpoint field only shows real overrides vs seed; attach batch capped (8 files / 32 MiB).
- **Custom endpoint:** Optional API base URL override on Models / wizard for any built-in provider (`models.providers.<id>.baseUrl`) — proxies, LiteLLM, alternate OpenRouter gateways.
- **Failover & key rotation:** Models/Settings panel to edit model fallback chain, `auth.cooldowns.rateLimitedProfileRotations`, and add extra API keys as rotatable auth profiles (OpenRouter-style rate-limit resilience).
- **Chat ASCII / QR:** Embedded Control UI injects monospace-preserving CSS and sharp QR image rendering for ASCII art and QR codes in chat.
- **Remote gateway:** Settings → Gateway connection — `gateway.mode` local/remote, `gateway.remote.url` / token / transport; skip local process when remote; Control UI iframe loads from the remote HTTP origin.
- **Provider OAuth:** In-app **Sign in with OAuth** (bundled `openclaw models auth login`) for OpenRouter (API key or OAuth), OpenAI Codex, GitHub Copilot, Gemini CLI, Qwen Portal, Chutes; expanded OpenRouter model presets.
- **P0 Models:** Live Gateway `models.list` catalog; one-click set default model + restart gateway; periodic chip refresh.
- **P0 Channels:** WhatsApp QR steps + deep-link to Control UI `/channels`; Telegram / Discord / Feishu credential editors; Slack strip notice.
- **P0 Control UI:** Top-bar Reload; load-error banner.
- **P1 Dashboard:** One-click `doctor` / `doctor --fix`.
- **P1 Skills:** Plugin install entry; Slack/Bedrock strip notice.

### Notes (shell / user config)

- Upstream Control UI / onboarding overhaul; channel, model, and gateway reliability. After upgrade with custom plugin paths, run **`openclaw doctor --fix`**.
- Embedded iframe still auto-maintains `gateway.controlUi.allowInsecureAuth`, `dangerouslyDisableDeviceAuth`, and loopback `allowedOrigins: ["*"]` when unset.
- Bundle patches: Feishu `registerFull` once (skip on 2026.7+ without adjacency), Slack filtered from `listBundledChatChannelEntries`, amazon-bedrock stripped, Lark SDK inject, Electron Lit transpile revalidated on **2026.7.1-2**.
- Control UI build: install `@lit/context`; Vite aliases via `ui/node_modules`; restore npm `package.json` after root install; hoist `@openclaw/*` after root `npm install`.

## [0.7.0] - 2026-04-03

### Changed

- **Gateway ready:** Mark `running` only after TCP connect **and** `GET /` (with token query) returns non-5xx, avoiding Control UI iframe errors while plugins/auth still initialize (`process-manager.ts`).
- **Gateway bind types:** Add **`tailnet`** / **`custom`** (`process-manager.ts`, `shared/types.ts`).
- **Bundled OpenClaw finish:** `download-openclaw` always runs Feishu Lark SDK inject, Feishu `registerFull` patch, Slack channel strip; unique npm temp dirs on Windows (`download-openclaw.ts`, `ensure-openclaw-feishu-sdk.ts`, `patch-openclaw-strip-slack-channel.ts`).
- **Packaging / verify:** `prepare-bundle` / `verify-bundle` / `verify-packaged-win` aligned; smoke scripts updated.
- **Release:** Shell **`0.7.0+openclaw.2026.4.2`**; tag **`v0.7.0+openclaw.2026.4.2`**. Bundled OpenClaw npm **`2026.4.2`**.
- **Docs:** Aligned to **0.7.0** / **2026.4.2**.

## [0.6.6] - 2026-04-03

### Changed

- **Bundled OpenClaw:** npm **2026.4.2**. Upstream: [v2026.4.2](https://github.com/openclaw/openclaw/releases/tag/v2026.4.2).
- **Release:** Shell **`0.6.6+openclaw.2026.4.2`**; tags are **`v` + `package.json` `version`**.
- **Docs:** Aligned to **2026.4.2**.

### Notes (shell / user config)

- **Breaking (migrate):** xAI `x_search` moves to `plugins.entries.xai.config.xSearch.*`; Firecrawl `web_fetch` to `plugins.entries.firecrawl.config.webFetch.*`. Use **`openclaw doctor --fix`**.
- Desktop still starts gateway via **`node` + `openclaw.mjs gateway run`**. If you customized x_search or Firecrawl web_fetch, run **`openclaw doctor`** after upgrade.

## [0.6.4] - 2026-04-03

### Fixed

- **Control UI / Internal Server Error (follow-up):** Upstream `checkBrowserOrigin` rejects missing/`null` WebSocket `Origin` before loopback allow. Main process fills `Origin` on loopback gateway requests (`gateway-request-origin.ts`). For loopback bind with empty `allowedOrigins`, merge `allowedOrigins: ["*"]`. Wizard writes the same for `bind === 'loopback'`.
- **Packaging:** After copy, `prepare-bundle` removes `dist/extensions/amazon-bedrock` (missing `@aws-sdk/client-bedrock` otherwise spam-logs).

## [0.6.3] - 2026-04-02

### Fixed

- **Control UI / config:** Always merge `allowInsecureAuth` / `dangerouslyDisableDeviceAuth` for non-remote gateways even when `gateway` was missing; `writeOpenClawConfig` re-merges before every write; short write retries on Windows file locks.

## [0.6.2] - 2026-04-01

### Changed

- **Release tags:** Git tags match `v` + `package.json` `version` (e.g. `v0.6.2+openclaw.2026.3.31`). Quote tags in PowerShell when they contain `+`.

## [0.6.1] - 2026-04-01

### Fixed

- **Control UI:** For non-remote gateways, force `allowInsecureAuth: true` and `dangerouslyDisableDeviceAuth: true` so Electron iframe auth matches wizard defaults.

## [0.6.0] - 2026-04-01

### Fixed

- **Control UI / `package.json`:** Restore real OpenClaw `package.json` after root `npm install` (stub name no longer left behind).
- **prepare-bundle:** Force re-copy when resources still have the control-ui stub package name.

### Changed

- **Release:** Shell **`0.6.0+openclaw.2026.3.31`**; tag **`v0.6.0`**. Bundled OpenClaw **2026.3.31**.
- **Docs:** Aligned to **v0.6.0**.

## [0.5.0] - 2026-03-31

### Changed

- **Bundled OpenClaw:** **2026.3.28** → **2026.3.31**. Feishu fixes and upstream breakages; desktop still applies `patch-openclaw-feishu-register-once` on `dist/extensions/feishu/index.js`.
- **Release:** Shell **`0.5.0+openclaw.2026.3.31`**; tag **`v0.5.0`**.
- **Docs / CI:** Aligned to **2026.3.31**.

## [0.4.11] - 2026-03-31

### Changed

- **Bundled OpenClaw:** npm **2026.3.28**.
- **Wizard MiniMax presets:** M2.7 series only.
- **Feishu `registerFull` patch:** Also scan `auth-profiles-*.js`; re-patch resources even when copy is skipped.
- **Release:** Shell `0.4.11+openclaw.2026.3.28`; manifest aligned.

## [0.4.10] - 2026-03-27

### Added

- **Settings → Models:** Load/edit default and per-agent models from `openclaw.json` (provider, model ID, API key, Moonshot region), connection test, write-back with auth-profiles.
- **Packaging:** Feishu `registerFull` once-guard patch to avoid duplicate tool registration spam.

### Changed

- **Release:** Shell `0.4.10+openclaw.2026.3.24`; manifest aligned.

## [0.4.9] - 2026-03-27

### Fixed

- **MiniMax / wizard:** Align generated `openclaw.json` with onboard-style configs: `auth.order.minimax` uses `["global"]`, `agents.defaults.model.primary` uses the bare model id, `models.providers.minimax` includes `apiKey` alongside auth-profiles, and config load keeps the inline key (sync to `minimax:global` without stripping JSON). Migration rewrites legacy `["minimax:global"]` order entries to `["global"]`.
- **Wizard model list (MiniMax):** Default preset is `MiniMax-M2.7-highspeed` (first in list); dropdown labels use the exact API model ids (including `-highspeed` / hyphen suffixes) so they match `openclaw.json`.

### Changed

- **Release:** Shell `0.4.9+openclaw.2026.3.24`; `resources/bundle-manifest.json` `shellVersion` aligned with `package.json`.

## [0.4.8] - 2026-03-27

### Fixed

- **Setup wizard (MiniMax):** Default `models.providers.minimax.baseUrl` uses `https://api.minimaxi.com/anthropic`, matching working user configs; `api.minimax.io` can break Anthropic-compatible routing for some accounts.

### Changed

- **Release:** Shell `0.4.8+openclaw.2026.3.24`; `resources/bundle-manifest.json` `shellVersion` aligned with `package.json`.

## [0.4.7] - 2026-03-27

### Changed

- **Release:** Bump Shell version to `0.4.7+openclaw.2026.3.24`; `resources/bundle-manifest.json` `shellVersion` aligned with `package.json`.

## [0.4.6] - 2026-03-28

### Changed

- **CI / Release:** Document pnpm `cache: pnpm` behavior; set `cache-dependency-path: pnpm-lock.yaml` on `setup-node`; print checkout ref + SHA + one-line log in verify / release jobs for build provenance. Windows packaging: widen Electron binary cache key with `electron-builder.config.cjs` / `electron-builder.yml` so invalidation tracks builder config changes, not only the lockfile.
- **Gateway:** When a MiniMax auth profile is configured and inherited `MINIMAX_*` env keys are stripped for the child process, log whether the guard ran and which keys were removed (or that none were present).

## [0.4.5] - 2026-03-27

### Fixed

- **Release metadata:** `resources/bundle-manifest.json` `shellVersion` is aligned with `package.json` so `check-openclaw-versions` / packaged builds report the correct shell version (follow-up to v0.4.4 tag pointing at a commit before manifest sync).

## [0.4.4] - 2026-03-27

### Fixed

- **MiniMax HTTP 401 (follow-up):** Run config migrations **immediately before spawning the gateway** so `openclaw.json` on disk is corrected before the child reads it. MiniMax `anthropic-messages` entries now persist **`authHeader: false` whenever it was not already `false`** (not only when it was `true`), so upstream rewrites cannot leave an ambiguous default that still sends Bearer.
- **MiniMax env vs profile:** When `auth.profiles` includes a `minimax:*` profile, the gateway child environment no longer passes through `MINIMAX_API_KEY` / `MINIMAX_CODE_PLAN_KEY` from the desktop process, so profile-based credentials are not overridden by stray shell env.

### Changed

- **Gateway logs:** Dedupe repeated Feishu tool registration lines within a short window and emit a single summary line when many repeats are suppressed.

## [0.4.3] - 2026-03-26

### Fixed

- **MiniMax 401 when `openclaw.json` key looks correct:** OpenClaw resolves credentials as **auth-profiles.json → env → `models.providers.*.apiKey`**. A stale **`minimax:global`** entry in `auth-profiles.json` overrides the key embedded under `models.providers.minimax`, so edits to JSON alone could still yield `invalid api key`. On config load (and after wizard / provider config writes), **`models.providers.minimax.apiKey` is synced into `minimax:global` and removed from JSON** so the profile and gateway always agree. The setup wizard no longer duplicates API keys into `models.providers` for providers that use auth profiles.

## [0.4.2] - 2026-03-26

### Fixed

- **MiniMax HTTP 401 `invalid api key`:** MiniMax’s Anthropic-compatible API expects **Anthropic-style `x-api-key`**. The shell had set `authHeader: true` (**Bearer**), which MiniMax rejects even when the key is valid. Migrated to **`authHeader: false`**. The blanket third-party `anthropic-messages` migration **excludes** MiniMax.

### Changed

- **Feishu DM pairing notifications:** Replaced polling with **`fs.watch` on `~/.openclaw/credentials`** (debounced); **dedupe by `openId`**.

## [0.4.1] - 2026-03-26

### Changed

- **Setup wizard:** Sanitize (trim) API keys, model IDs, custom provider fields, Cloudflare gateway fields, and gateway auth token before write.
- **Custom provider:** Wizard output includes an **`agents.defaults.models`** alias entry for the selected model.

## [0.3.4] - 2026-03-26

### Fixed

- **MiniMax / third-party Anthropic HTTP 401:** Set **`authHeader: true`** on non-`api.anthropic.com` `anthropic-messages` hosts (later revised for MiniMax in 0.4.2).

## [0.3.3] - 2026-03-26

### Fixed

- **MiniMax (401):** Map MiniMax `default` / `minimax:default` → **`minimax:global`** in auth order and profiles.

## [0.3.2] - 2026-03-26

### Fixed

- **Model auth (401) hardening:** Always store credentials under canonical profile ids (`provider:name`); migrate shorthand keys on startup.

## [0.3.1] - 2026-03-26

### Fixed

- **Upstream model auth (401):** Wizard `auth.order` uses full profile IDs; normalize shorthand in add/remove helpers.
- **Xiaomi MiMo seed:** `https://api.xiaomimimo.com/v1` with `openai-completions`.

### Changed

- **Wizard model presets:** Updated for bundled OpenClaw **2026.3.23-2**.

## [0.3.0] - 2026-03-25

### Fixed

- **Embedded Control UI:** Removed WebSocket operator pre-probe that could stick the shell on “Gateway starting”; mount iframe when gateway is running.
- **Config read timeout:** `config:read` raced with **10s** timeout when building control URL.

## [0.2.22] - 2026-03-25

### Fixed

- **Control UI (Lit field decorators in Electron):** Desktop-only Vite/tsconfig patches for Lit decorators; rebuild when `.electron-lit-compat-v1` missing.

## [0.2.21] - 2026-03-25

### Fixed

- **Control UI:** Desktop-only esbuild pass on `dist/control-ui` (`target: chrome130`) for Electron.
- **In-app updates:** Map “stable” channel to electron-updater **`latest`** (`latest.yml`).

## [0.2.20] - 2026-03-25

### Changed

- **Electron:** Upgrade to **41.x** (Chromium **146**).

### Fixed

- **Gateway response headers:** Only relax CSP / `frame-ancestors` on `mainFrame` / `subFrame`.

## [0.2.18] - 2026-03-25

### Changed

- **Release CI:** `OPENCLAW_SKIP_NPM_LATEST_CHECK=1` so version checks validate the pin without npm `latest` drift.

### Documentation

- README: pinned OpenClaw, bundle `2026.3.23-2`, CI behavior; installer naming for **v0.2.18**.

### Added

- **`scripts/check-openclaw-versions.ts`:** `--skip-npm-latest-check` / `OPENCLAW_SKIP_NPM_LATEST_CHECK`.

## [0.2.17] - 2026-03-25

### Added

- **Pinned OpenClaw bundle:** `openclawBundleVersion` in root `package.json`.
- **`verify-packaged-win`:** Validates packaged Windows layout after electron-builder.

### Documentation

- Installer troubleshooting / release hardening notes (see `docs/INSTALLER_TROUBLESHOOTING.md`).

## [0.2.16] - 2026-03-25

### Added

- **Install integrity:** Fail fast when `bundle-manifest.json` `shellVersion` mismatches `app.getVersion()`.
- **Bundle validation:** Verify Control UI module script assets on disk.

## [0.2.15] - 2026-03-25

### Changed

- **Diagnostics:** Narrower typing for desktop doctor dependency injection.

## [0.2.14] - 2026-03-25

### Fixed

- **Local gateway Control UI root:** Strip `gateway.controlUi.root` outside bundled `dist/control-ui`.
- **Gateway auth token injection:** Apply token redirect on `mainFrame` / `subFrame` as well as WebSockets.

### Changed

- **Diagnostics:** Warn when `gateway.controlUi.root` is outside the bundled UI.

## [0.2.13] - 2026-03-24

### Fixed

- **Control UI black screen:** Run bundled OpenClaw children with `cwd` = `resources/openclaw`.
- **Stale `gateway.controlUi.root`:** Remove incomplete UI roots on config read.

## [0.2.1] - 2026-03-24

### Updated

- **Bundled OpenClaw runtime:** `2026.3.22`.
- **`download-openclaw`:** Explicit `[policy]` log for default `latest` installs.

### Fixed

- **Extension registry:** Scan `dist/extensions` with legacy fallback.
- **Embedded Control UI:** `allowInsecureAuth` for local gateways; RPC client full operator scopes + `tool-events`.
- **Gateway process liveness:** TCP-first health, NO_PROXY loopback, 3 consecutive failures, 12s probe.
- **Control UI iframe:** Remount on gateway leave-running or PID change.
- **Control UI build:** Copy upstream `src/` and `apps/` for Vite imports.
- **ESLint:** Ignore `build/**`.

### Documentation

- README compatibility section for OpenClaw **2026.3.22**.
- CONTRIBUTING packaging notes.

## [0.2.0] - 2026-03-22

### Added

- **Feishu Access panel** — credentials, pending pairing, code approval, allowlist.
- **Pairing IPC** via bundled OpenClaw runtime.
- **Tray menu localization**.
- **Installer license** (English).

### Changed

- **Shell UX** refinements; expanded i18n keys (en and other supported locales).

## [0.1.1] - 2026-03-20

### Fixed

- **Kuae Coding Plan behind HTTPS proxy:** Merge `NO_PROXY` for `.kuaecloud.net` on gateway spawn. Opt out: `OPENCLAW_SKIP_KUAE_NO_PROXY=1`.

### Updated

- **Bundled OpenClaw:** `2026.3.13`.

### Documentation

- README FAQ and changelog.

## [0.1.0] - 2026-03-10

### Added

- Initial release of OpenClaw Desktop (later OpenClaw Desktop Plus)
- NSIS Windows installer with bundled Node.js 22 and OpenClaw
- 5-step setup wizard
- 50+ AI providers; multi-channel configuration
- Desktop management panels and Control UI iframe
- System tray, auto-start, themes
- Multi-language UI (English and other non-Chinese locales retained in later builds)
- electron-updater, backup/restore, diagnostics, single-instance, window state
