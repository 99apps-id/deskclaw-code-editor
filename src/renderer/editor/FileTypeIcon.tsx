import {
  Braces,
  Database,
  File,
  FileCode2,
  FileJson2,
  FileText,
  Globe2,
  Hash,
  Image,
  Package,
  Palette,
  Settings2,
  TerminalSquare,
  Type,
} from 'lucide-react'

const ICON_CLASS = 'h-4 w-4 shrink-0'

export function FileTypeIcon({ name, className = ICON_CLASS }: { name: string; className?: string }) {
  const lower = name.toLowerCase()
  const extension = lower.includes('.') ? lower.split('.').pop() ?? '' : ''

  if (['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'].includes(lower)) {
    return <Package className={className} style={{ color: 'oklch(72% 0.16 75)' }} />
  }
  if (['ts', 'tsx'].includes(extension)) {
    return <FileCode2 className={className} style={{ color: 'oklch(70% 0.16 245)' }} />
  }
  if (['js', 'jsx', 'mjs', 'cjs'].includes(extension)) {
    return <Braces className={className} style={{ color: 'oklch(79% 0.15 95)' }} />
  }
  if (extension === 'json' || extension === 'json5') {
    return <FileJson2 className={className} style={{ color: 'oklch(77% 0.14 105)' }} />
  }
  if (['html', 'htm', 'vue', 'svelte'].includes(extension)) {
    return <Globe2 className={className} style={{ color: 'oklch(70% 0.18 35)' }} />
  }
  if (['css', 'scss', 'sass', 'less'].includes(extension)) {
    return <Palette className={className} style={{ color: 'oklch(69% 0.17 300)' }} />
  }
  if (['py', 'go', 'rs', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'swift', 'kt'].includes(extension)) {
    return <FileCode2 className={className} style={{ color: 'oklch(72% 0.15 155)' }} />
  }
  if (['sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd'].includes(extension)) {
    return <TerminalSquare className={className} style={{ color: 'oklch(75% 0.13 170)' }} />
  }
  if (['md', 'mdx', 'txt', 'log', 'rst'].includes(extension)) {
    return <FileText className={className} style={{ color: 'oklch(72% 0.08 245)' }} />
  }
  if (['sql', 'sqlite', 'db'].includes(extension)) {
    return <Database className={className} style={{ color: 'oklch(72% 0.15 205)' }} />
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(extension)) {
    return <Image className={className} style={{ color: 'oklch(72% 0.18 335)' }} />
  }
  if (['yaml', 'yml', 'toml', 'ini', 'env'].includes(extension) || lower.startsWith('.env')) {
    return <Settings2 className={className} style={{ color: 'oklch(73% 0.13 55)' }} />
  }
  if (['xml', 'graphql', 'gql'].includes(extension)) {
    return <Hash className={className} style={{ color: 'oklch(72% 0.17 335)' }} />
  }
  if (['woff', 'woff2', 'ttf', 'otf'].includes(extension)) {
    return <Type className={className} style={{ color: 'oklch(71% 0.13 285)' }} />
  }
  return <File className={className} style={{ color: 'var(--color-ink-2)' }} />
}
