# Packaging

How to build platform installers for **OpenClaw Desktop Plus**.

Output lands under `dist/`.

All packaging scripts expect **`build/node/`** and **`build/openclaw/`** to exist (created by `pnpm run prepare-deps`).

## Windows (NSIS)

```bash
pnpm run package:win
```

Output: `dist/OpenClaw-Desktop-Plus-Setup-<version>.exe`

### Signing
- Unsigned local builds: default (`CSC_IDENTITY_AUTO_DISCOVERY=false` when no cert).
- Signed: set `CSC_LINK` + `CSC_KEY_PASSWORD` (see `pnpm run package:win:signed`).
- CI may use SignPath when `USE_SIGNPATH=true`.

## macOS (DMG)

```bash
# Intel Mac
pnpm run package:mac

# Apple Silicon Mac
pnpm run package:mac:arm
```

Output: `dist/OpenClaw-Desktop-Plus-<version>-mac-<arch>.dmg`

### Notes
- **Notarization not yet configured.** Gatekeeper warning on first launch.
- The `resources/entitlements.mac.plist` file grants `com.apple.security.cs.allow-unsigned-executable-memory` for bundled Node.js.
- Codesign requires `CSC_LINK` + `CSC_KEY_PASSWORD` environment variables (Apple Developer identity).

## Linux (AppImage + deb + rpm)

```bash
pnpm run package:linux
```

Output:
- `dist/OpenClaw-Desktop-Plus-<version>-linux-x64.AppImage`
- `dist/OpenClaw-Desktop-Plus-<version>-linux-x64.deb`
- `dist/OpenClaw-Desktop-Plus-<version>-linux-x64.rpm`

### Notes
- AppImage is self-contained and runs on any Linux distribution.
- `.deb` is for Debian/Ubuntu-based distributions.
- `.rpm` is for Fedora/RHEL-based distributions.
- Tray icon requires `libayatana-appindicator3-1` or `libappindicator`:
  ```bash
  sudo apt install libayatana-appindicator3-1
  ```

## Version pins

| Field | Location | Meaning |
| --- | --- | --- |
| `version` | `package.json` | Shell semver (+ OpenClaw pin suffix) |
| `openclawBundleVersion` | `package.json` | Exact npm OpenClaw version to download |
| `bundledOpenClawVersion` | `resources/bundle-manifest.json` | Written by `prepare-bundle` |

Release Git tags must be `v` + `package.json` `version`, e.g. `v0.8.0+openclaw.2026.7.1-2`.

## Control UI

The npm OpenClaw package may omit `dist/control-ui/`. Desktop builds it from the matching GitHub tag (`ensure-openclaw-control-ui`).

If Vite fails on your platform:

1. Build Control UI on Linux/WSL (`scripts/ci-build-openclaw-control-ui.ts` or CI artifact), or
2. Populate `build/openclaw/dist/control-ui/`, then run `download-openclaw` with `OPENCLAW_SKIP_CONTROL_UI_BUILD=1`.

## Publish target

`electron-builder` publish config points at:

`https://github.com/99apps-id/openclaw-desktop-plus`

## CI release

Manual or tag-driven workflow: `.github/workflows/release.yml`.

For `workflow_dispatch`, always pass the **full existing tag** (including `+`). Empty tag checks out the wrong ref and can produce mixed OpenClaw / Control UI bundles (black screen).

## Verification

```bash
pnpm run check-openclaw-versions
pnpm run verify-bundle
pnpm run verify-packaged-win   # after package:win only
```

See also [INSTALLER_TROUBLESHOOTING.md](INSTALLER_TROUBLESHOOTING.md).
