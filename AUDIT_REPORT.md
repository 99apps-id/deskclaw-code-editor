# DeskClaw Code Editor — Laporan Audit Repository

**Tanggal:** 2026-08-01
**Repository:** `99apps-id/deskclaw-code-editor`
**Versi saat ini:** `0.1.1+deskclaw.2026.7.1` (bundle OpenClaw `2026.7.1-2`)
**Metodologi:** Audit statis + eksekusi nyata (`pnpm install`, `type-check`, `lint`, `test`, `pnpm audit`) pada HEAD (`6bc6165`)

> Catatan: laporan ini menggantikan `AUDIT_REPORT.md` versi sebelumnya (2026-07-25), yang ditulis untuk nama proyek lama (`openclaw-desktop-plus`) dan tidak memverifikasi klaimnya dengan menjalankan tooling. Semua temuan di bawah diverifikasi langsung terhadap kode dan hasil build/test aktual.

---

## 1. Ringkasan Eksekutif

DeskClaw Code Editor adalah aplikasi desktop Electron (Windows/macOS/Linux) yang membungkus editor Monaco + terminal + Git/GitHub tooling di sekitar agent AI otonom OpenClaw, dengan Control UI gateway yang di-embed sebagai iframe. Basis kode ~34.000 baris TypeScript/TSX di 171 file, terbagi rapi antara `main` (Electron), `preload`, `renderer` (React 19), dan `shared`.

| Kategori | Status | Catatan |
|---|---|---|
| **Build/Type-check** | ✅ Lulus | `tsc --noEmit` bersih, tanpa error |
| **Lint** | ✅ Lulus | `eslint .` bersih, tanpa warning/error |
| **Unit test** | ✅ Lulus | 48/48 test lulus di 9 file (~1.1s) |
| **Dependency audit** | 🔴 Perlu tindakan | 23 advisory (`pnpm audit`): 2 critical, 10 high, 8 moderate, 3 low — lihat §4 |
| **Keamanan Electron** | ✅ Baik | `contextIsolation: true`, `nodeIntegration: false`, whitelist origin gateway |
| **Penyimpanan kredensial** | ✅ Diperbaiki | `auth-profiles.json` tetap plaintext (kontrak gateway eksternal — lihat §3.1), tapi kini permission `0600`/`0700` owner-only |
| **Cakupan test** | 🟡 Terbatas | Hanya 9 file test untuk ~171 file source (≈5%); nol test untuk IPC handlers (2000+ baris) |
| **Dokumentasi** | ✅ Sangat baik | README, CHANGELOG, SECURITY.md, docs/ lengkap dan mutakhir |

**Grade keseluruhan: B** — arsitektur dan hygiene kode solid, tapi ada gap nyata di penyimpanan kredensial dan dependency dev yang membawa CVE lama.

---

## 2. Yang Sudah Diverifikasi Berjalan Baik

### 2.1 Isolasi proses Electron
`src/main/window/manager.ts:185-187` — `contextIsolation: true`, `nodeIntegration: false`, akses Node hanya lewat `contextBridge` di preload. Ini adalah baseline keamanan Electron yang benar dan masih berlaku di HEAD.

### 2.2 Validasi origin/token gateway
`src/main/security/gateway-request-auth.ts` — hanya menyisipkan token ke request yang: (a) protokolnya di whitelist (`http/https/ws/wss`), (b) host-nya loopback (`127.0.0.1`/`localhost`/`::1`), (c) port cocok dengan port gateway yang diharapkan, (d) belum punya parameter `token` (anti double-injection). Logikanya defensif dan tervalidasi di kode aktual.

### 2.3 Ekstraksi workspace pack aman
`src/main/workspace/workspace-memory.ts` — daftar file yang boleh diekspor/diimpor pakai allowlist (`PACK_FILES`), dengan penolakan path yang mengandung `..` atau diawali `/`. Ini mencegah path traversal saat mengekspor/mengimpor memory pack.

### 2.4 Kualitas kode
- `tsc --noEmit` dan `eslint .` bersih total di HEAD — tidak ada technical debt "diam-diam menumpuk".
- 48 unit test lulus, mencakup: agregasi usage insights, model-ref normalization, config migration, file-service, model health signal, gateway-remote logic.

---

## 3. Temuan Keamanan Baru (Belum Ada di Audit Sebelumnya)

### 3.1 ✅ DIPERBAIKI — Kredensial provider (plaintext di disk, sekarang dibatasi permission owner-only)
**File:** `src/main/providers/auth-profile-store.ts`, `src/main/wizard/auth-profile-writer.ts`, `src/main/utils/secure-file.ts` (baru)

API key dan token OAuth semua provider (OpenAI, Anthropic, MiniMax, Copilot-proxy, dll.) disimpan sebagai JSON di `auth-profiles.json`. Investigasi lanjutan menemukan bahwa file ini **bukan murni milik aplikasi Electron ini** — ia adalah kontrak on-disk yang dibaca langsung oleh proses gateway OpenClaw eksternal (binary terpisah yang di-download via `scripts/download-openclaw.ts`, bukan bagian dari repo ini) untuk autentikasi ke LLM provider. Ini dikonfirmasi oleh komentar di `openclaw-config.ts:251`: *"Gateway resolves upstream model auth as: auth-profiles.json → env → models.providers.*.apiKey"*, dan format filenya sengaja disamakan dengan output `openclaw onboard`.

**Kenapa `safeStorage` tidak bisa dipakai langsung di file ini:** ciphertext dari Electron `safeStorage` terikat ke entry OS-keychain milik aplikasi Electron ini sendiri. Proses gateway eksternal (binary Node/CLI terpisah) tidak punya cara mendekripsinya. Mengenkripsi `key`/`token` di file ini akan **mematahkan autentikasi ke semua provider AI secara diam-diam** untuk semua pengguna. Rerouting kredensial lewat environment variable saat spawn gateway juga tidak aman dilakukan di sini karena nama env var per-provider (terutama untuk custom/self-hosted provider) adalah kontrak internal gateway eksternal yang tidak terlihat dari kode di repo ini — hanya nama env var MiniMax yang diketahui (`MINIMAX_API_KEY`, `MINIMAX_CODE_PLAN_KEY`).

**Perbaikan yang diterapkan:** file `auth-profiles.json` dan direktori induknya sekarang ditulis dengan permission owner-only (`0600` untuk file, `0700` untuk direktori) lewat helper baru `src/main/utils/secure-file.ts`, dipakai konsisten di kedua modul penulis (`auth-profile-store.ts` untuk UI Settings, `auth-profile-writer.ts` untuk setup wizard). Ini kompatibel penuh dengan gateway (proses yang sama, user OS yang sama, tetap bisa baca), sekaligus mencegah proses/pengguna OS lain di mesin yang sama membaca kredensial. `chmod` dijalankan ulang di setiap write, jadi file lama dengan permission longgar (mis. `0644`) otomatis diketatkan pada write berikutnya. Di Windows, langkah ini adalah no-op permission-wise (mengandalkan default ACL profil user), karena Node tidak punya API ACL native yang setara.

**Rekomendasi lanjutan (opsional, effort lebih besar):** jika enkripsi at-rest penuh tetap diinginkan, jalur yang valid adalah refactor arsitektur — gateway di-spawn dari file konfigurasi generated on-the-fly oleh aplikasi ini setiap start (didekripsi dari store `safeStorage` terpisah tepat sebelum spawn), bukan menyimpan plaintext permanen. Ini butuh verifikasi terhadap source gateway asli agar tidak merusak resolusi auth untuk custom/self-hosted provider, jadi sengaja tidak dilakukan tanpa konfirmasi eksplisit dan test end-to-end terhadap gateway sungguhan.

### 3.2 🟡 String interpolation ke PowerShell command (Prioritas Sedang)
**File:** `src/main/registry/skill-installer.ts:165-169`

```typescript
const psResult = spawnSync('powershell', [
  '-NoProfile', '-Command',
  `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`,
])
```

`zipPath`/`extractDir` dibangun dari `skillsDir` (user data dir) + `skillName` yang sudah di-sanitize regex whitelist (`sanitizeName`), jadi risiko terbatas pada kasus di mana **path direktori home Windows pengguna sendiri** mengandung karakter kutip tunggal (`'`) — jarang tapi bukan nol (mis. nama pengguna Windows dengan apostrof). Karena string disisipkan langsung ke `-Command` (bukan lewat parameter terpisah), karakter kutip bisa memutus string PowerShell.

**Rekomendasi:** ganti ke argumen terpisah / gunakan `-EncodedCommand`, atau escape kutip tunggal dengan `''` sebelum interpolasi.

### 3.3 🟡 Instalasi skill dari URL eksternal = supply-chain surface
**File:** `src/main/registry/skill-installer.ts` (seluruh file)

Fitur "ClawHub Skill Marketplace" mengizinkan instalasi skill dari GitHub repo/Gist/`skill.sh`/raw URL apa pun ke direktori skill lokal yang kemudian dibaca sebagai instruksi oleh agent AI. Ini secara desain adalah **prompt-injection / supply-chain vector** — skill pihak ketiga yang di-install dapat berisi instruksi yang memanipulasi perilaku agent OpenClaw. Ini bukan bug (fitur marketplace memang begitu), tapi tidak ada indikasi sandboxing/review terhadap konten `SKILL.md` yang diunduh sebelum dipakai agent.

**Rekomendasi:** tambahkan tinjauan/preview isi skill sebelum instalasi final (sudah ada di UI?), dan pertimbangkan menandai skill yang diinstal dari sumber non-official ClawHub secara visual berbeda di UI.

### 3.4 Konfirmasi ulang temuan lama (masih berlaku)
- `'unsafe-inline'` di `style-src` CSP untuk gateway (`gateway-response-headers.ts`) — risiko rendah-menengah, masih ada.
- Token diselipkan sebagai query-param URL (`?token=...`) alih-alih header — masih berlaku, tapi dibatasi ke loopback saja (lihat §2.2), jadi eksposur terbatas ke proses lokal yang bisa membaca URL (mis. logging).

---

## 4. Dependency Audit (`pnpm audit`)

**23 advisory: 2 critical, 10 high, 8 moderate, 3 low.** Rinciannya:

| Severity | Paket | Rantai dependency | Dampak riil |
|---|---|---|---|
| High/High | `xlsx@0.18.5` | **dependency langsung**, tapi **tidak dipakai di `src/`** (grep kosong) | Prototype pollution + ReDoS — tapi dead code di runtime app |
| High | `adm-zip` | devDependency, dipakai hanya di `scripts/download-node.ts` (build-time) | 4GB memory alloc dari ZIP jahat — bukan attack surface end-user karena build-time only |
| High | `sharp` | devDependency, dipakai untuk generate icon (build-time) | CVE libvips — build-time only |
| High×2, Critical×2, Moderate×5 | `jimp`/`request`/`form-data`/`qs`/`tough-cookie`/`minimist`/`uuid` | transitif lewat `to-ico → resize-img → jimp` (devDependency, build-time icon generation) | Tidak reachable dari kode aplikasi yang di-ship ke user |
| High | `brace-expansion` | transitif lewat `electron-builder` (build-time) | Tidak reachable saat runtime app |
| Low×3 | `dompurify` | transitif lewat `monaco-editor` (**runtime**, dipakai untuk render markdown editor) | Worth memantau, tapi severity rendah dan butuh HTML tak terpercaya sampai ke DOMPurify config API |
| Low | `esbuild` | devDependency (dev server) | Hanya relevan saat `pnpm dev`, bukan build produksi |

**Poin penting:** hampir semua advisory *high/critical* berada di rantai `to-ico → resize-img → jimp` (devDependency untuk generate icon `.ico`) dan `electron-builder` — **tidak masuk ke output paket yang dijalankan end-user** karena tidak pernah di-bundle ke `out/`. Risiko nyata jauh lebih rendah dari sekadar membaca angka "2 critical, 10 high".

**Yang justru perlu tindakan nyata:**
1. **`xlsx` (dependency langsung, bukan dev)** — tidak dipakai sama sekali di `src/`. Hapus dari `package.json` untuk mengurangi attack surface dan ukuran bundle tanpa kehilangan fungsi apa pun.
2. **`to-ico`** (rantai jimp/request yang usang, request sudah deprecated sejak 2020) — pertimbangkan ganti dengan `sharp`-only pipeline untuk generate `.ico` (sharp sudah ada sebagai dependency), menghilangkan seluruh rantai `jimp/request/form-data/qs/tough-cookie/minimist/uuid`.
3. **`sharp`** — update ke versi terbaru yang menambal CVE libvips yang disebutkan (`CVE-2026-33327/33328/35590/35591`).

---

## 5. Kualitas Kode & Test Coverage

### 5.1 Test yang ada (9 file, 48 test — semua lulus)
`control-ui-flags`, `model-ref`, `usage-insights`, `gateway-remote`, `file-service`, `openclaw-config`, `workspace-memory`, `explorer-layout`, `model-health-signal`.

### 5.2 Gap cakupan test
- **`src/main/ipc/handlers.ts`** (2207 baris gabungan dengan index.ts) — pusat seluruh IPC surface (termasuk device pairing, terminal spawn, file ops) — **nol test**.
- **`src/main/registry/skill-installer.ts`** — parsing URL + ekstraksi arsip pihak ketiga — **nol test**, padahal ini permukaan paling sensitif secara keamanan (lihat §3.3).
- **`src/main/providers/auth-profile-store.ts`** — logic migrasi kredensial (§3.1) — **nol test**.
- Tidak ada test E2E/integrasi di luar smoke test CSP & gateway process.

### 5.3 Arsitektur
Pemisahan `main/preload/renderer/shared` konsisten dan jelas. Modul di `src/main/` dipecah per domain (`gateway`, `pairing`, `providers`, `security`, `workspace`, dst.) — struktur yang mudah dinavigasi untuk basis kode sebesar ini.

---

## 6. Rekomendasi Prioritas

### Tinggi (lakukan sebelum rilis berikutnya)
1. ✅ **Selesai** — permission `auth-profiles.json` dibatasi owner-only (§3.1). Enkripsi penuh via `safeStorage` sengaja tidak dilakukan karena akan merusak resolusi auth gateway eksternal; lihat opsi refactor di §3.1 jika ini tetap diinginkan.
2. Hapus dependency `xlsx` yang tidak terpakai (§4).
3. Tambah test untuk `skill-installer.ts` dan `auth-profile-store.ts` — dua modul dengan blast radius keamanan terbesar tapi cakupan test nol.

### Sedang
4. Perbaiki interpolasi string ke PowerShell `-Command` di `skill-installer.ts` (§3.2).
5. Ganti pipeline `to-ico`/`jimp` dengan `sharp`-only untuk menghapus rantai dependency usang (§4).
6. Update `sharp` ke versi tertambal CVE libvips terbaru.
7. Tambah test untuk `src/main/ipc/handlers.ts` (minimal untuk device pairing & terminal spawn).

### Rendah
8. Migrasi `style-src 'unsafe-inline'` ke nonce-based CSP untuk Control UI embed.
9. Dokumentasikan strategi keamanan skill marketplace pihak ketiga di `SECURITY.md` (siapa yang mereview konten skill sebelum diinstal).

---

## 7. Kesimpulan

Repo ini dalam kondisi sehat dari sisi hygiene teknis: tidak ada error type-check/lint, semua test lulus, dan pola isolasi Electron sudah benar. Perhatian utama bukan pada "kerentanan aktif yang dieksploitasi", melainkan **penyimpanan kredensial plaintext** (temuan baru, prioritas tinggi) dan **dependency devDependency usang** yang menyumbang mayoritas hitungan `pnpm audit` tapi berdampak minim di runtime karena tidak ter-bundle. Prioritaskan §6 "Tinggi" sebelum rilis publik berikutnya.

---
*Audit ini dijalankan dengan tooling nyata (`pnpm install/type-check/lint/test/audit`) terhadap commit `6bc6165` di branch `claude/repo-audit-analysis-bpv135`, bukan hanya pembacaan statis kode.*
