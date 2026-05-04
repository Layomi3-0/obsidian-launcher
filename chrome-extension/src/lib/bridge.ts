import type { Attachment, BrowserContext, ConnectionStatus, StreamChunkData } from './types'

type ChunkListener = (data: StreamChunkData) => void
type StatusListener = (status: ConnectionStatus, error?: string) => void

interface PendingRpc {
  resolve: (data: unknown) => void
  reject: (err: Error) => void
}

const RECONNECT_DELAY_MS = 1500
const RPC_TIMEOUT_MS = 15000

export class Bridge {
  private ws: WebSocket | null = null
  private status: ConnectionStatus = 'idle'
  private reconnectTimer: number | null = null
  private chunkListeners = new Set<ChunkListener>()
  private statusListeners = new Set<StatusListener>()
  private pendingRpc = new Map<string, PendingRpc>()
  private authResolve: (() => void) | null = null
  private authReject: ((err: Error) => void) | null = null

  connect(endpoint: string, token: string): Promise<void> {
    if (this.status === 'connecting' || this.status === 'connected') return Promise.resolve()
    this.setStatus('connecting')
    return new Promise<void>((resolve, reject) => {
      this.authResolve = resolve
      this.authReject = reject
      this.openSocket(endpoint, token)
    })
  }

  disconnect(): void {
    if (this.reconnectTimer != null) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.ws?.close()
    this.ws = null
    this.setStatus('idle')
  }

  isConnected(): boolean {
    return this.status === 'connected'
  }

  rpc<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.isConnected()) return Promise.reject(new Error('Not connected'))
    const requestId = makeRequestId()
    return new Promise<T>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pendingRpc.delete(requestId)
        reject(new Error(`RPC timeout: ${method}`))
      }, RPC_TIMEOUT_MS)
      this.pendingRpc.set(requestId, {
        resolve: (data) => { clearTimeout(timeout); resolve(data as T) },
        reject: (err) => { clearTimeout(timeout); reject(err) },
      })
      this.send({ type: 'rpc', requestId, method, params })
    })
  }

  query(requestId: string, query: string, attachments: Attachment[], browserContext?: BrowserContext): void {
    this.send({ type: 'query', requestId, query, attachments, browserContext })
  }

  cancel(requestId: string): void {
    this.send({ type: 'cancel', requestId })
  }

  onChunk(cb: ChunkListener): () => void {
    this.chunkListeners.add(cb)
    return () => this.chunkListeners.delete(cb)
  }

  onStatus(cb: StatusListener): () => void {
    this.statusListeners.add(cb)
    cb(this.status)
    return () => this.statusListeners.delete(cb)
  }

  private openSocket(endpoint: string, token: string): void {
    try {
      this.ws = new WebSocket(endpoint)
    } catch (err) {
      this.handleFailure(endpoint, token, err instanceof Error ? err.message : 'WebSocket failed')
      return
    }

    this.ws.onopen = () => this.send({ type: 'auth', token })
    this.ws.onmessage = (event) => this.handleMessage(event.data)
    this.ws.onerror = () => this.handleFailure(endpoint, token, 'Connection error')
    this.ws.onclose = () => this.handleClose(endpoint, token)
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') return
    let msg: any
    try { msg = JSON.parse(raw) } catch { return }

    if (msg.type === 'auth:ok') return this.handleAuthOk()
    if (msg.type === 'auth:fail') return this.handleAuthFail(msg.error || 'Unauthorized')
    if (msg.type === 'chunk') return this.dispatchChunk(msg)
    if (msg.type === 'rpc:result') return this.resolveRpc(msg.requestId, msg.data)
    if (msg.type === 'rpc:error') return this.rejectRpc(msg.requestId, msg.error)
  }

  private handleAuthOk(): void {
    this.setStatus('connected')
    this.authResolve?.()
    this.authResolve = this.authReject = null
  }

  private handleAuthFail(error: string): void {
    this.setStatus('unauthorized', error)
    this.authReject?.(new Error(error))
    this.authResolve = this.authReject = null
    this.ws?.close()
  }

  private handleFailure(endpoint: string, token: string, error: string): void {
    if (this.status === 'unauthorized') return
    this.setStatus('error', error)
    this.authReject?.(new Error(error))
    this.authResolve = this.authReject = null
    this.scheduleReconnect(endpoint, token)
  }

  private handleClose(endpoint: string, token: string): void {
    if (this.status === 'unauthorized' || this.status === 'idle') return
    this.setStatus('error', 'Disconnected')
    this.scheduleReconnect(endpoint, token)
  }

  private scheduleReconnect(endpoint: string, token: string): void {
    if (this.reconnectTimer != null) return
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.openSocket(endpoint, token)
    }, RECONNECT_DELAY_MS)
  }

  private dispatchChunk(msg: any): void {
    const data: StreamChunkData = {
      requestId: msg.requestId,
      chunk: msg.chunk ?? '',
      done: !!msg.done,
      interrupted: msg.interrupted,
    }
    for (const cb of this.chunkListeners) cb(data)
  }

  private resolveRpc(requestId: string, data: unknown): void {
    const pending = this.pendingRpc.get(requestId)
    if (!pending) return
    this.pendingRpc.delete(requestId)
    pending.resolve(data)
  }

  private rejectRpc(requestId: string, error: string): void {
    const pending = this.pendingRpc.get(requestId)
    if (!pending) return
    this.pendingRpc.delete(requestId)
    pending.reject(new Error(error))
  }

  private setStatus(status: ConnectionStatus, error?: string): void {
    this.status = status
    for (const cb of this.statusListeners) cb(status, error)
  }

  private send(obj: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify(obj))
  }
}

function makeRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const bridge = new Bridge()
