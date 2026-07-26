#!/usr/bin/env node
/**
 * Safe file patcher for environments where the Edit tool is unreliable.
 *
 * Usage:
 *   node scripts/safe-patch.mjs <file> <mode> <args...>
 *
 * Modes:
 *   replace <old> <new>        Replace first occurrence of <old> with <new>.
 *   replace-all <old> <new>    Replace all occurrences.
 *   append <text>              Append <text> to end of file.
 *   prepend <text>             Prepend <text> to start of file.
 *
 * Examples:
 *   node scripts/safe-patch.mjs src/shared/types.ts replace "export interface PairingApproveResult {\n  ok: boolean\n}" "export interface PairingApproveResult {\n  ok: boolean\n  // ...\n}"
 *
 * The old/new strings are read as literal text. Use \n in arguments for newlines.
 */
import fs from 'node:fs'
import path from 'node:path'

function unescape(str) {
  return str.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
}

function main() {
  const [, , filePath, mode, ...args] = process.argv

  if (!filePath || !mode) {
    console.error('Usage: node safe-patch.mjs <file> <replace|replace-all|append|prepend> [...args]')
    process.exit(1)
  }

  const absolutePath = path.resolve(filePath)
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`)
    process.exit(1)
  }

  let content = fs.readFileSync(absolutePath, 'utf-8')

  switch (mode) {
    case 'replace': {
      if (args.length !== 2) {
        console.error('replace mode requires exactly 2 arguments: <old> <new>')
        process.exit(1)
      }
      const [oldStr, newStr] = args.map(unescape)
      if (!content.includes(oldStr)) {
        console.error('Old string not found in file')
        process.exit(1)
      }
      content = content.replace(oldStr, newStr)
      break
    }
    case 'replace-all': {
      if (args.length !== 2) {
        console.error('replace-all mode requires exactly 2 arguments: <old> <new>')
        process.exit(1)
      }
      const [oldStr, newStr] = args.map(unescape)
      content = content.split(oldStr).join(newStr)
      break
    }
    case 'append': {
      if (args.length !== 1) {
        console.error('append mode requires exactly 1 argument: <text>')
        process.exit(1)
      }
      content += unescape(args[0])
      break
    }
    case 'prepend': {
      if (args.length !== 1) {
        console.error('prepend mode requires exactly 1 argument: <text>')
        process.exit(1)
      }
      content = unescape(args[0]) + content
      break
    }
    default:
      console.error(`Unknown mode: ${mode}`)
      process.exit(1)
  }

  fs.writeFileSync(absolutePath, content, 'utf-8')
  console.log(`Patched: ${absolutePath}`)
}

main()
