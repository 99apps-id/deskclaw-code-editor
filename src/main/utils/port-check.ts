/** TCP port availability + optional owning PID (Windows) */

import net from 'net'
import { execSync } from 'child_process'

/** Port probe result */
export interface PortCheckResult {
  available: boolean
  pid?: number
  processName?: string
}

/**
 * @returns available=true if free; else false with pid when known (Windows)
 */
export function checkPort(port: number): Promise<PortCheckResult> {
  return new Promise((resolve) => {
    const server = net.createServer()

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(getPortOccupantInfo(port))
      } else {
        resolve({ available: false })
      }
    })

    server.once('listening', () => {
      server.close(() => {
        resolve({ available: true })
      })
    })

    server.listen(port, '127.0.0.1')
  })
}

/**
 * Resolve listening PID — cross-platform (Windows netstat, macOS lsof, Linux ss)
 */
function getPortOccupantInfo(port: number): PortCheckResult {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf-8',
        windowsHide: true,
      })

      const lines = output.trim().split('\n')
      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        const pidPart = parts[parts.length - 1]
        if (pidPart && pidPart !== '0' && /^\d+$/.test(pidPart)) {
          const pid = parseInt(pidPart, 10)
          return { available: false, pid }
        }
      }
    } else if (process.platform === 'darwin') {
      // macOS: lsof -iTCP -sTCP:LISTEN
      try {
        const output = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -F p 2>/dev/null`, {
          encoding: 'utf-8',
        })
        const match = output.match(/p(\d+)/)
        if (match?.[1]) {
          return { available: false, pid: parseInt(match[1], 10) }
        }
      } catch {
        // lsof not available
      }
    } else if (process.platform === 'linux') {
      // Linux: ss -tlnp
      try {
        const output = execSync(`ss -tlnp sport = :${port} 2>/dev/null`, {
          encoding: 'utf-8',
        })
        const match = output.match(/pid=(\d+)/)
        if (match?.[1]) {
          return { available: false, pid: parseInt(match[1], 10) }
        }
      } catch {
        // ss not available
      }
    }
  } catch {
    // If command fails, still report "in use" when connect fails
  }

  return { available: false }
}
