import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { BrowserWindow } from 'electron'
import {
  IPC_AGENT_ACTION,
  IPC_AGENT_CHAT_CHUNK,
  IPC_AGENT_CHAT_DONE,
} from '../../shared/ipc-channels.js'
import { GatewayRpcClient } from '../gateway/rpc-client.js'

export interface AgentChatOptions {
  port: number
  token?: string
  password?: string
  message: string
  getMainWindow: () => BrowserWindow | null
  conversationId?: string
  model?: string
  approvalPolicy?: 'ask' | 'full-access'
  attachments?: Array<{ path: string; name: string; content: string; truncated?: boolean }>
}

export interface AgentChatResult {
  ok: boolean
  response?: string
  conversationId?: string
  error?: string
}

type ChatPayload = {
  state?: 'delta' | 'final' | 'aborted' | 'error'
  sessionKey?: string
  runId?: string
  deltaText?: string
  replace?: boolean
  message?: unknown
  errorMessage?: string
}

function messageText(message: unknown): string {
  if (typeof message === 'string') return message
  if (!message || typeof message !== 'object') return ''
  const record = message as Record<string, unknown>
  if (typeof record.text === 'string') return record.text
  if (!Array.isArray(record.content)) return ''
  return record.content.map((block) => {
    if (typeof block === 'string') return block
    if (!block || typeof block !== 'object') return ''
    const value = block as Record<string, unknown>
    return typeof value.text === 'string' ? value.text : ''
  }).join('')
}

function mimeFor(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase()
  return ({
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.json': 'application/json', '.pdf': 'application/pdf',
    '.md': 'text/markdown', '.html': 'text/html', '.css': 'text/css',
    '.js': 'text/javascript', '.ts': 'text/typescript',
  } as Record<string, string>)[extension] ?? 'text/plain'
}

export async function agentChat(opts: AgentChatOptions): Promise<AgentChatResult> {
  const sessionKey = opts.conversationId || 'agent:main:main'
  const runId = randomUUID()
  const policy = opts.approvalPolicy === 'full-access'
    ? '\n\nPermission mode: full access. You may edit workspace files and run required commands.'
    : '\n\nPermission mode: ask. Request approval before edits, commands, or other important actions.'
  const client = new GatewayRpcClient({
    port: opts.port,
    token: opts.token,
    password: opts.password,
    timeoutMs: 20_000,
    maxRetries: 1,
  })
  const send = (channel: string, ...args: unknown[]) => {
    const window = opts.getMainWindow()
    if (window && !window.isDestroyed()) window.webContents.send(channel, ...args)
  }

  let response = ''
  let settled = false
  let finish!: (result: AgentChatResult) => void
  const completion = new Promise<AgentChatResult>((resolve) => { finish = resolve })
  const timeout = setTimeout(() => {
    if (!settled) {
      settled = true
      finish({ ok: false, error: 'OpenClaw response timed out.', conversationId: sessionKey })
    }
  }, 300_000)

  client.onEvent = (event, raw) => {
    if (event === 'chat') {
      const payload = (raw || {}) as ChatPayload
      if (payload.sessionKey && payload.sessionKey !== sessionKey) return
      if (payload.runId && payload.runId !== runId) return
      if (payload.state === 'delta') {
        const delta = payload.deltaText ?? messageText(payload.message)
        response = payload.replace ? delta : response + delta
        send(IPC_AGENT_CHAT_CHUNK, sessionKey, delta, response)
      } else if (payload.state === 'final') {
        response = messageText(payload.message) || response
        send(IPC_AGENT_CHAT_DONE, sessionKey, response)
        if (!settled) {
          settled = true
          finish({ ok: true, response, conversationId: sessionKey })
        }
      } else if (payload.state === 'error' || payload.state === 'aborted') {
        const error = payload.errorMessage || (payload.state === 'aborted' ? 'OpenClaw run was aborted.' : 'OpenClaw run failed.')
        send(IPC_AGENT_CHAT_DONE, sessionKey, response || error)
        if (!settled) {
          settled = true
          finish({ ok: false, response: response || undefined, conversationId: sessionKey, error })
        }
      }
      return
    }
    if (event === 'tool') {
      const payload = (raw || {}) as Record<string, unknown>
      const type = typeof payload.type === 'string' ? payload.type : 'tool'
      const message = typeof payload.message === 'string'
        ? payload.message
        : typeof payload.name === 'string'
          ? payload.name
          : typeof payload.toolName === 'string'
            ? payload.toolName
            : ''
      const filePath = typeof payload.filePath === 'string' ? payload.filePath : undefined
      if (message || filePath) {
        send(IPC_AGENT_ACTION, { type, message: message || undefined, filePath, timestamp: Date.now() })
      }
    }
  }

  try {
    await client.connect()
    if (opts.model) {
      await client.request('sessions.patch', { key: sessionKey, model: opts.model }, { timeoutMs: 20_000 })
    }
    await client.request('chat.send', {
      sessionKey,
      message: `${opts.message}${policy}`,
      deliver: false,
      idempotencyKey: runId,
      attachments: (opts.attachments ?? []).map((attachment) => {
        const mimeType = mimeFor(attachment.name)
        return {
          type: mimeType.startsWith('image/') ? 'image' : 'file',
          mimeType,
          fileName: attachment.name,
          content: Buffer.from(attachment.content, 'utf8').toString('base64'),
        }
      }),
    }, { timeoutMs: 30_000 })
    return await completion
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message, conversationId: sessionKey }
  } finally {
    clearTimeout(timeout)
    client.close()
  }
}

export function applyAgentDiff(filePath: string, content: string): { ok: boolean; error?: string } {
  try {
    fs.writeFileSync(filePath, content, 'utf-8')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
