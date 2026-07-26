# Safe Patch Utility

This directory contains a small helper (`safe-patch.mjs`) for environments where the native `Edit` tool does not persist changes reliably.

## When to use

- The `Edit` tool reports success but the file content does not change.
- Paths with backslashes cause Bash to fail on Windows.

## How to use

```bash
# Replace first occurrence of a string
node scripts/safe-patch.mjs src/shared/types.ts replace "old text" "new text"

# Replace all occurrences
node scripts/safe-patch.mjs src/shared/types.ts replace-all "old" "new"

# Append or prepend text (use \\n for newlines)
node scripts/safe-patch.mjs src/shared/types.ts append "\n// end marker\n"
```

## Bash path tips for Windows

Always use forward slashes or `cd` first:

```bash
# Bad
ls C:\Project\openclaw-desktop\src

# Good
cd /c/Project/openclaw-desktop
ls src
```

## Reading directories

`Read` on a directory fails. Use `Bash` first:

```bash
ls src/shared
```
