import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()

describe('Explorer layout regression', () => {
  it('keeps the resize handle out of the Explorer flex column flow', () => {
    const css = fs.readFileSync(path.join(projectRoot, 'src/renderer/styles/globals.css'), 'utf8')
    const explorer = fs.readFileSync(path.join(projectRoot, 'src/renderer/editor/FileExplorer.tsx'), 'utf8')
    const splitterRule = css.match(/\.panel-splitter\s*\{([^}]*)\}/)?.[1] ?? ''

    expect(splitterRule).not.toMatch(/position\s*:\s*relative/)
    expect(explorer).toContain('panel-splitter panel-splitter--vertical absolute')
    expect(explorer).toContain('min-h-0 flex-1 overflow-y-auto')
  })
})
