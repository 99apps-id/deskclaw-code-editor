import fs from 'node:fs'
import path from 'node:path'

export interface EditorDirectoryItem {
  name: string
  path: string
  isDirectory: boolean
}

export function listEditorDirectory(dirPath: string): EditorDirectoryItem[] {
  if (!dirPath) throw new Error('Directory path is required')
  const normalized = path.normalize(dirPath)
  if (!fs.existsSync(normalized)) throw new Error(`Directory does not exist: ${dirPath}`)
  const stat = fs.statSync(normalized)
  if (!stat.isDirectory()) throw new Error('The selected path is not a directory')

  try {
    return fs.readdirSync(normalized, { withFileTypes: true })
      .map((entry) => {
        const fullPath = path.join(normalized, entry.name)
        let isDir = entry.isDirectory()
        if (entry.isSymbolicLink()) {
          try {
            isDir = fs.statSync(fullPath).isDirectory()
          } catch {
            isDir = false
          }
        }
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: isDir,
        }
      })
      .sort((left, right) => {
        if (left.isDirectory !== right.isDirectory) return left.isDirectory ? -1 : 1
        return left.name.localeCompare(right.name)
      })
  } catch (error) {
    throw new Error(`Failed to read directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export function readEditorFile(filePath: string): { content: string } {
  if (!filePath) throw new Error('File path is required')
  const stat = fs.statSync(filePath)
  if (!stat.isFile()) throw new Error('The selected path is not a file')
  if (stat.size > 10 * 1024 * 1024) throw new Error('Files larger than 10 MB are not opened in the text editor')
  const buffer = fs.readFileSync(filePath)
  if (buffer.subarray(0, Math.min(buffer.length, 8_000)).includes(0)) {
    throw new Error('Binary files cannot be opened in the text editor')
  }
  return { content: buffer.toString('utf8') }
}

export async function readEditorFileAsync(filePath: string): Promise<{ content: string }> {
  if (!filePath) throw new Error('File path is required')
  const stat = await fs.promises.stat(filePath)
  if (!stat.isFile()) throw new Error('The selected path is not a file')
  if (stat.size > 10 * 1024 * 1024) throw new Error('Files larger than 10 MB are not opened in the text editor')
  const buffer = await fs.promises.readFile(filePath)
  if (buffer.subarray(0, Math.min(buffer.length, 8_000)).includes(0)) {
    throw new Error('Binary files cannot be opened in the text editor')
  }
  return { content: buffer.toString('utf8') }
}

export function writeEditorFile(filePath: string, content: string): { ok: true } {
  if (!filePath) throw new Error('File path is required')
  if (!fs.existsSync(filePath)) throw new Error('The file no longer exists')
  if (!fs.statSync(filePath).isFile()) throw new Error('The selected path is not a file')
  fs.writeFileSync(filePath, content, 'utf8')
  return { ok: true }
}

export function createEditorEntry(filePath: string, isDirectory: boolean): { ok: true } {
  if (!filePath) throw new Error('File path is required')
  if (fs.existsSync(filePath)) throw new Error('A file or folder with that name already exists')
  if (isDirectory) fs.mkdirSync(filePath, { recursive: true })
  else {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, '', 'utf8')
  }
  return { ok: true }
}

export async function deleteEditorEntry(filePath: string, workspacePath: string): Promise<{ ok: true }> {
  if (!filePath) throw new Error('File path is required')
  if (!workspacePath) throw new Error('Workspace path is required')

  const root = await fs.promises.realpath(workspacePath)
  const target = await fs.promises.realpath(filePath)
  const relative = path.relative(root, target)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Only entries inside the active workspace can be deleted')
  }

  await fs.promises.rm(target, { recursive: true, force: false })
  return { ok: true }
}
