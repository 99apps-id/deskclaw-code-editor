import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createEditorEntry,
  deleteEditorEntry,
  listEditorDirectory,
  readEditorFile,
  readEditorFileAsync,
  writeEditorFile,
} from './file-service'

const temporaryDirectories: string[] = []

function workspace() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'deskclaw-editor-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

describe('editor file service', () => {
  it('creates, lists, reads, edits, and saves a text file', () => {
    const directory = workspace()
    const filePath = path.join(directory, 'main.ts')

    createEditorEntry(filePath, false)
    expect(listEditorDirectory(directory)).toEqual([
      { name: 'main.ts', path: filePath, isDirectory: false },
    ])
    expect(readEditorFile(filePath).content).toBe('')

    writeEditorFile(filePath, 'export const ready = true\n')
    expect(readEditorFile(filePath).content).toBe('export const ready = true\n')
  })

  it('rejects binary files instead of silently opening corrupt text', () => {
    const directory = workspace()
    const filePath = path.join(directory, 'asset.bin')
    fs.writeFileSync(filePath, Buffer.from([1, 2, 0, 4]))
    expect(() => readEditorFile(filePath)).toThrow('Binary files cannot be opened')
  })

  it('places directories before files and includes dotfiles', () => {
    const directory = workspace()
    fs.mkdirSync(path.join(directory, 'src'))
    fs.writeFileSync(path.join(directory, '.env.example'), 'KEY=')
    expect(listEditorDirectory(directory).map((item) => item.name)).toEqual(['src', '.env.example'])
  })

  it('reads asynchronously and only deletes entries inside the active workspace', async () => {
    const directory = workspace()
    const outside = workspace()
    const insideFile = path.join(directory, 'inside.txt')
    const outsideFile = path.join(outside, 'outside.txt')
    fs.writeFileSync(insideFile, 'inside')
    fs.writeFileSync(outsideFile, 'outside')

    await expect(readEditorFileAsync(insideFile)).resolves.toEqual({ content: 'inside' })
    await expect(deleteEditorEntry(outsideFile, directory)).rejects.toThrow('inside the active workspace')
    expect(fs.existsSync(outsideFile)).toBe(true)
    await expect(deleteEditorEntry(insideFile, directory)).resolves.toEqual({ ok: true })
    expect(fs.existsSync(insideFile)).toBe(false)
  })
})
