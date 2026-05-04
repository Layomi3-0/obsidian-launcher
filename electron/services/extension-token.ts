import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { randomBytes } from 'crypto'

const TOKEN_DIR = join(homedir(), '.quick-launcher')
const TOKEN_PATH = join(TOKEN_DIR, 'extension-token')

export function loadOrCreateToken(): string {
  if (existsSync(TOKEN_PATH)) {
    const existing = readFileSync(TOKEN_PATH, 'utf-8').trim()
    if (existing.length >= 32) return existing
  }
  return persistNewToken()
}

export function getTokenPath(): string {
  return TOKEN_PATH
}

function persistNewToken(): string {
  if (!existsSync(TOKEN_DIR)) mkdirSync(TOKEN_DIR, { recursive: true })
  const token = randomBytes(32).toString('hex')
  writeFileSync(TOKEN_PATH, token, { encoding: 'utf-8', mode: 0o600 })
  chmodSync(TOKEN_PATH, 0o600)
  console.log(`[extension-token] Wrote new token to ${TOKEN_PATH}`)
  return token
}
