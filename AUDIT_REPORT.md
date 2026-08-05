# DeskClaw Code Editor - Repository Audit Report

**Date:** 2026-08-05
**Repository:** `99apps-id/deskclaw-code-editor`
**Current Version:** `0.1.1+deskclaw.2026.7.1`
**Audit Performed By:** Claude (Claude Code)

> Replaces the previous `AUDIT_REPORT.md`, which was a copy of the `openclaw-desktop-plus` report and did not describe this repository.

---

## Executive Summary

DeskClaw Code Editor is an **AI-native code editor / IDE** (Windows, macOS, Linux) built on Electron + Monaco, powered by an embedded, autonomous **OpenClaw** agent (chat panel, inline `Ctrl+K` edit, commit-message generation, ClawHub skill marketplace, GitHub tooling). This audit re-verified the bundled OpenClaw version against the npm registry, ran a dependency security audit, and reviewed the codebase structure.

### Quick Findings

| Category | Status | Notes |
|----------|--------|-------|
| **OpenClaw bundle version** | ✅ Current | `openclawBundleVersion` (`2026.7.1-2`) matches npm `openclaw@latest` as of 2026-08-05 |
| **Dependency security** | ✅ Fixed | `pnpm audit --prod` found 3 advisories (dompurify via `monaco-editor`); patched via pnpm override, now clean |
| **Version consistency** | ✅ Pass | `scripts/check-openclaw-versions.ts` reports pin, bundle-manifest, and shell version all aligned |
| **Type safety** | ✅ Pass | `pnpm run type-check` clean |
| **Test Coverage** | ⚠️ Partial | 9 test files, mostly in `src/main` and `src/shared`; renderer/editor UI surface is thin |
| **Documentation** | ✅ Good | README, CHANGELOG, PRODUCT.md, CONTRIBUTING, SECURITY present |

---

## 1. OpenClaw Upstream Version Check

```
$ npm view openclaw version
2026.7.1-2

$ pnpm exec tsx scripts/check-openclaw-versions.ts
check-openclaw-versions: expected OpenClaw 2026.7.1-2
  [registry] npm openclaw@latest → 2026.7.1-2
  [ok] openclaw bundle pin matches npm openclaw@latest
  [ok] bundle-manifest shellVersion → 0.1.1+deskclaw.2026.7.1
  [ok] bundle-manifest bundledOpenClawVersion → 2026.7.1-2
  OK: OpenClaw version pins and on-disk refs are aligned
```

**Conclusion:** `openclawBundleVersion` already tracks npm's `latest` dist-tag for the `openclaw` package (same pin as the sibling `openclaw-desktop-plus` repo, since both bundle the upstream agent gateway). **No version bump is required or possible right now.**

### 1.1 Upstream release channel context (npm `openclaw` dist-tags, checked 2026-08-05)

| Tag | Version | Published | Notes |
|-----|---------|-----------|-------|
| `latest` | `2026.7.1-2` | 2026-07-18 | What this repo bundles |
| `beta` | `2026.7.2-beta.7` | 2026-08-02 | Pre-release; not recommended for production bundling |
| `extended-stable` | `2026.6.34` | 2026-08-04 | Older LTS-style line |
| `alpha` | `2026.5.19-alpha.1` | — | Experimental |

**Features landing in the `2026.7.2` beta line** (roadmap awareness — not bundled yet): state-safety/crash-recovery for persisted agent data, durable channel delivery, session rewind/branching, MCP Apps, structured questions, and coding-agent integration improvements (`openclaw attach` for external editors, better long-running session/goal support) — the last of which is directly relevant to this editor's own agent-chat and inline-edit features and worth prioritizing once it reaches `latest`.

**Recommendation:** re-run `pnpm run check-openclaw-versions -- --align-latest` once `2026.7.2` promotes off `beta`.

---

## 2. Dependency & Security Audit

**Before fix:**

```
$ pnpm audit --prod
3 vulnerabilities found (2 low, 1 moderate)
  - GHSA-cmwh-pvxp-8882  dompurify <=3.4.10  (via monaco-editor)
  - GHSA-c2j3-45gr-mqc4  dompurify <=3.4.11  (via monaco-editor)
  - GHSA-vxr8-fq34-vvx9  dompurify <3.4.9    (via monaco-editor)
```

`monaco-editor@0.56.0` (the latest published version — confirmed via `npm view monaco-editor version`) depends directly on the vulnerable `dompurify@3.4.8`; there is no newer `monaco-editor` release to bump to. **Fix applied:** added a `pnpm.overrides` entry pinning `dompurify` to `^3.4.13` (latest patched release) in `package.json`, then reinstalled.

**After fix:**

```
$ pnpm audit --prod
No known vulnerabilities found
```

`pnpm run type-check` was re-run after the override and remains clean, confirming the forced `dompurify` bump did not break the Monaco integration's TypeScript surface.

### 2.1 Version drift worth tracking (informational only)

| Package | Pinned | Latest on npm | Notes |
|---|---|---|---|
| `electron` | `^41.0.0` | `43.3.0` | Two majors behind, same gap as `openclaw-desktop-plus`. Plan a dedicated upgrade pass. |
| `monaco-editor` | `^0.56.0` | `0.56.0` | Already latest. |

---

## 3. Version Consistency & Build Health

- `pnpm exec tsx scripts/check-openclaw-versions.ts` → **OK**, pin/manifest aligned (see §1).
- `pnpm run type-check` → **clean**.
- `resources/bundle-manifest.json` (`shellVersion: 0.1.1+deskclaw.2026.7.1`, `bundledOpenClawVersion: 2026.7.1-2`) matches `package.json`.

---

## 4. Code Quality & Architecture

### 4.1 Structure

| Module | Purpose |
|--------|---------|
| `src/main/agent/` | Agent orchestration bridging to the OpenClaw gateway |
| `src/main/editor/` | File service, project/workspace file I/O for Monaco |
| `src/main/gateway/`, `src/main/config/` | OpenClaw gateway process + config handling (shared lineage with `openclaw-desktop-plus`) |
| `src/main/security/`, `src/main/window/` | Electron hardening (context isolation, sandboxed preload) |
| `src/renderer/editor/` | Monaco integration, editor layout |
| `src/renderer/shell/`, `src/renderer/components/` | VS Code-style shell chrome, panels (Git, Terminal, Problems, Skills marketplace, etc.) |

`src/main/window/manager.ts` confirms `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` (explicit), consistent with the sibling desktop-shell repo's security posture.

### 4.2 Test Coverage

| Test File | Coverage Area |
|-----------|---------------|
| `src/main/config/control-ui-flags.test.ts` | Embedded UI flags |
| `src/main/config/openclaw-config.test.ts` | Gateway config read/migrate |
| `src/main/editor/file-service.test.ts` | Editor file service |
| `src/main/insights/usage-insights.test.ts` | Session data aggregation |
| `src/main/models/model-ref.test.ts` | Model ID normalization |
| `src/main/workspace/workspace-memory.test.ts` | Preferences/memory export |
| `src/renderer/editor/explorer-layout.test.ts` | Renderer explorer layout |
| `src/shared/gateway-remote.test.ts` | Remote gateway logic |
| `src/shared/model-health-signal.test.ts` | Health pattern detection |

**Gap:** the flagship AI-native surfaces called out in the README — inline `Ctrl+K` edit, AI commit-message generation (`GitPanel.tsx`), AI error-fixer (`ProblemsPanel.tsx`), ClawHub marketplace install flow — have no dedicated unit tests. These are the editor's differentiators and the highest-value place to add coverage next.

---

## 5. Recommendations

### High priority
- None outstanding from a security standpoint after the `dompurify` override — `pnpm audit --prod` is clean and the OpenClaw pin is aligned.

### Medium priority
- Add unit/integration tests for the AI-native panels (Inline Edit, AI Commit Message, AI Error Fixer, ClawHub install) — currently untested despite being the product's flagship features.
- Plan a dedicated Electron 41 → 43 upgrade pass (shared concern with `openclaw-desktop-plus`).

### Low priority / watch list
- Re-run `pnpm run check-openclaw-versions -- --align-latest` once OpenClaw `2026.7.2` promotes off `beta`, particularly for its coding-agent/`attach` improvements relevant to this editor's chat panel.
- Keep `AUDIT_REPORT.md` scoped to this repository going forward (this pass fixes a prior copy-paste from `openclaw-desktop-plus`).

---

## 6. Conclusion

The OpenClaw bundle pin is **already current** with upstream's `latest` npm release (`2026.7.1-2`), verified against the npm registry and the project's own `check-openclaw-versions.ts` gate. One real dependency vulnerability chain (`dompurify` via `monaco-editor`) was found and fixed via a `pnpm.overrides` pin. No functional code changes were required for the OpenClaw version itself; this pass documents that currency and surfaces upcoming upstream features for planning purposes.

**End of Audit Report**
