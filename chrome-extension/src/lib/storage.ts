const TOKEN_KEY = 'brainDump.token'
const ENDPOINT_KEY = 'brainDump.endpoint'

const DEFAULT_ENDPOINT = 'ws://127.0.0.1:51789'

export async function loadToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY)
  const value = result[TOKEN_KEY]
  return typeof value === 'string' && value.length > 0 ? value : null
}

export async function saveToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token })
}

export async function clearToken(): Promise<void> {
  await chrome.storage.local.remove(TOKEN_KEY)
}

export async function loadEndpoint(): Promise<string> {
  const result = await chrome.storage.local.get(ENDPOINT_KEY)
  const value = result[ENDPOINT_KEY]
  return typeof value === 'string' && value.length > 0 ? value : DEFAULT_ENDPOINT
}

export async function saveEndpoint(endpoint: string): Promise<void> {
  await chrome.storage.local.set({ [ENDPOINT_KEY]: endpoint })
}
