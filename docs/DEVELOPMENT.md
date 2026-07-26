# Development

Local development for **OpenClaw Desktop Plus** (Electron + React).

## Prerequisites

- Node.js **>= 22.22.3**
- **pnpm**
- Windows 10/11, macOS, or Linux

## Setup

```bash
git clone https://github.com/99apps-id/openclaw-desktop-plus.git
cd openclaw-desktop-plus
pnpm install
pnpm dev
```

## Useful commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Run Electron + Vite in development |
| `pnpm lint` | ESLint |
| `pnpm type-check` | TypeScript (`tsc --noEmit`) |
| `pnpm build` | Production Electron build (`electron-vite`) |
| `pnpm smoke` | CSP + gateway smoke checks |
| `pnpm package` | Package for current platform |
| `pnpm package:win` | Package for Windows (NSIS) |
| `pnpm package:mac` | Package for macOS (DMG, x64) |
| `pnpm package:mac:arm` | Package for macOS (DMG, arm64) |
| `pnpm package:linux` | Package for Linux (AppImage + deb + rpm) |

## Layout

```
src/main/       Electron main process
src/renderer/   React shell UI + i18n (en, fr, ja, ko, es)
src/preload/    IPC bridge
src/shared/     Shared types and constants
scripts/        Bundle download, patches, packaging helpers
resources/      Icons, installer assets, generated bundle pieces
```

## UI languages

Shell UI locales: **English**, French, Japanese, Korean, Spanish.  
Chinese (`zh-CN` / `zh-TW`) locales were removed; OS Chinese locales fall back to English.

## Configuration paths (runtime)

| Data | Path |
| --- | --- |
| OpenClaw state | Windows: `%USERPROFILE%\.openclaw\` · macOS/Linux: `~/.openclaw/` |
| Shell config | Windows: `%APPDATA%\OpenClaw Desktop Plus\` · macOS: `~/Library/Application Support/OpenClaw Desktop Plus/` · Linux: `~/.config/OpenClaw Desktop Plus/` |

## Platform-specific notes

### Windows
- Run `pnpm run download-node` to download the bundled Node.js binary for Windows
- Auto-start via Windows Registry
- URI scheme registration for `openclaw://` links

### macOS
- Run `pnpm run download-node` (the script detects darwin and downloads the macOS Node.js binary)
- Gatekeeper warning on first launch (unsigned build)
- Tray icon appears in the menu bar

### Linux
- Run `pnpm run download-node` (detects linux and downloads the Linux Node.js binary)
- Requires `libayatana-appindicator3-1` or `libappindicator` for tray icon:
  ```bash
  sudo apt install libayatana-appindicator3-1
  ```
- Auto-start uses `.config/autostart/` via `.desktop` file

## Related docs

- [USER_GUIDE.md](USER_GUIDE.md) — operator guide (panels, ClawHub, remote gateway, WhatsApp)
- [PACKAGING.md](PACKAGING.md) — packaging for Windows, macOS, Linux
- [INSTALLER_TROUBLESHOOTING.md](INSTALLER_TROUBLESHOOTING.md) — black screen / mixed bundles
- [../README.md](../README.md) — product overview
- [../CONTRIBUTING.md](../CONTRIBUTING.md)
