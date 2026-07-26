import { useMemo } from 'react'
import { FileText } from 'lucide-react'

interface MarkdownPreviewPanelProps {
  content: string
  fileName: string
}

export function MarkdownPreviewPanel({ content, fileName }: MarkdownPreviewPanelProps) {
  // Convert Markdown headings, lists, bold, italics, code blocks, links to simple HTML
  const renderedHtml = useMemo(() => {
    let html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 style="font-size:1.1em;font-weight:600;margin:12px 0 6px;">$1</h3>')
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-size:1.3em;font-weight:600;margin:16px 0 8px;border-bottom:1px solid var(--color-rule);padding-bottom:4px;">$1</h2>')
    html = html.replace(/^# (.*$)/gim, '<h1 style="font-size:1.6em;font-weight:700;margin:20px 0 10px;border-bottom:1px solid var(--color-rule);padding-bottom:6px;">$1</h1>')

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre style="background:var(--color-paper-3);padding:10px;border-radius:6px;font-family:var(--font-code);font-size:12px;overflow-x:auto;margin:10px 0;"><code>$1</code></pre>')

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background:var(--color-paper-3);padding:2px 5px;border-radius:4px;font-family:var(--font-code);font-size:11px;">$1</code>')

    // Bold & Italics
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')

    // Unordered Lists
    html = html.replace(/^\s*[-*+]\s+(.*$)/gim, '<li style="margin-left:20px;list-style-type:disc;">$1</li>')

    // Line breaks
    html = html.replace(/\n/g, '<br />')

    return html
  }, [content])

  return (
    <div className="flex h-full w-full flex-col bg-[var(--color-paper-2)] border-l border-[var(--color-rule)] overflow-hidden">
      <div className="flex h-8 items-center gap-2 border-b border-[var(--color-rule)] px-3 text-xs font-semibold text-[var(--color-ink-2)] bg-[var(--color-paper-2)] shrink-0">
        <FileText className="h-4 w-4 text-[var(--color-accent-strong)]" />
        <span>Preview: {fileName}</span>
      </div>
      <div
        className="flex-1 p-4 overflow-y-auto workbench-scroll text-xs text-[var(--color-ink)] leading-relaxed select-text font-sans"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </div>
  )
}
