# ZCode Agent Instructions

This file provides instructions for the ZCode agent when working in this repo on Windows.

## Reliable Windows Tooling

In this environment, the native `Read`, `Edit`, and `Bash` tools can be unreliable on Windows. Follow these rules:

1. **Bash paths**: Always use forward slashes or `cd` first.
   ```bash
   cd /c/Project/openclaw-desktop && ls src
   ```

2. **Directory listing**: Use `ls`/`find` via Bash; `Read` on directories fails.

3. **File editing**: Prefer `scripts/safe-patch.mjs` over the `Edit` tool.
   ```bash
   node scripts/safe-patch.mjs src/shared/types.ts replace "old" "new"
   ```

4. **Verification**: After any edit, verify the change with `grep` or `Read`.

See also: `scripts/safe-patch.README.md`
