import { useEffect, useMemo, useRef, useState } from 'react'
import { bridge } from '@/lib/bridge'
import { loadToken, loadEndpoint } from '@/lib/storage'
import { captureContext } from '@/lib/browser-context'
import { attachSidepanelLifecycle } from '@/lib/sidepanel-lifecycle'
import { detectMentionTrigger, stripMentionTrigger } from '@/lib/mention'
import type { ChatMessage, ConnectionStatus, MentionedTab } from '@/lib/types'
import { SearchInput } from './components/SearchInput'
import { AIResponse } from './components/AIResponse'
import { ContextStrip } from './components/ContextStrip'
import { MentionPicker } from './components/MentionPicker'
import { Header } from './components/Header'
import { UnpairedEmpty } from './components/UnpairedEmpty'

interface ActiveTab {
  id?: number
  title?: string
  url?: string
}

export function App() {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [statusError, setStatusError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [bridgeReady, setBridgeReady] = useState(false)
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>({})
  const [mentionedTabs, setMentionedTabs] = useState<MentionedTab[]>([])
  const [focusSignal, setFocusSignal] = useState(0)
  const activeRequestIdRef = useRef<string | null>(null)
  const hasLoadedCurrentRef = useRef(false)

  const mentionFilter = useMemo(() => detectMentionTrigger(query), [query])
  const showPicker = mentionFilter !== null
  const excludeIds = useMemo(
    () => [activeTab.id, ...mentionedTabs.map((m) => m.tabId)].filter((n): n is number => typeof n === 'number'),
    [activeTab.id, mentionedTabs],
  )

  useEffect(() => { void initBridge(setToken, setStatus, setStatusError, setBridgeReady) }, [])
  useEffect(() => subscribeChunks(activeRequestIdRef, setMessages, setIsStreaming), [])
  useEffect(() => watchActiveTab(setActiveTab), [])
  useEffect(() => attachSidepanelLifecycle(), [])
  useEffect(() => loadCurrentOnce(status, hasLoadedCurrentRef, setMessages), [status])
  useEffect(() => pruneClosedMentions(setMentionedTabs), [])

  const handleSubmit = async () => {
    const text = query.trim()
    if (!text || isStreaming || !bridge.isConnected()) return
    setQuery('')
    const requestId = makeRequestId()
    activeRequestIdRef.current = requestId
    setMessages((m) => [...m, { role: 'user', content: text }, { role: 'assistant', content: '' }])
    setIsStreaming(true)
    const ctx = await captureContext(true, mentionedTabs.map((m) => m.tabId))
    bridge.query(requestId, text, [], ctx)
  }

  const handleCancel = () => {
    if (!activeRequestIdRef.current) return
    bridge.cancel(activeRequestIdRef.current)
  }

  const handleWikilink = (note: string) => {
    bridge.rpc('noteOpen', { path: note }).catch((err) => console.error('[wikilink]', err))
  }

  const handleNewChat = () => {
    if (activeRequestIdRef.current) bridge.cancel(activeRequestIdRef.current)
    bridge.rpc('newConversation').catch((err) => console.warn('[app] newConversation failed:', err))
    setMessages([])
    setQuery('')
    setMentionedTabs([])
    setIsStreaming(false)
    activeRequestIdRef.current = null
    setFocusSignal((s) => s + 1)
  }

  const handleLoadConversation = async (id: string) => {
    if (activeRequestIdRef.current) bridge.cancel(activeRequestIdRef.current)
    try {
      const loaded = await bridge.rpc<ChatMessage[]>('loadConversation', { id })
      setMessages(Array.isArray(loaded) ? loaded : [])
      setQuery('')
      setMentionedTabs([])
      setIsStreaming(false)
      activeRequestIdRef.current = null
      setFocusSignal((s) => s + 1)
    } catch (err) {
      console.warn('[app] loadConversation failed:', err)
    }
  }

  const handleMentionSelect = (tab: MentionedTab) => {
    setQuery((prev) => stripMentionTrigger(prev))
    setMentionedTabs((prev) => (prev.some((t) => t.tabId === tab.tabId) ? prev : [...prev, tab]))
    setFocusSignal((s) => s + 1)
  }

  const handleRemoveMention = (tabId: number) => {
    setMentionedTabs((prev) => prev.filter((t) => t.tabId !== tabId))
    setFocusSignal((s) => s + 1)
  }

  useEffect(() => attachNewChatShortcut(handleNewChat), [])

  if (!bridgeReady) {
    return <div className="qlx-app"><LoadingState /></div>
  }

  if (!token || status === 'unauthorized') {
    return (
      <div className="qlx-app">
        <Header status={status} statusError={statusError} onNewChat={handleNewChat} onLoadConversation={handleLoadConversation} />
        <UnpairedEmpty reason={status === 'unauthorized' ? 'Token rejected — re-pair to continue.' : undefined} />
      </div>
    )
  }

  return (
    <div className="qlx-app">
      <Header status={status} statusError={statusError} onNewChat={handleNewChat} onLoadConversation={handleLoadConversation} />
      <AIResponse messages={messages} isStreaming={isStreaming} onWikilinkClick={handleWikilink} />
      <div className="qlx-input-area">
        {showPicker && (
          <MentionPicker
            filter={mentionFilter}
            excludeIds={excludeIds}
            onSelect={handleMentionSelect}
            onClose={() => setQuery((q) => stripMentionTrigger(q))}
          />
        )}
        <ContextStrip
          activeTitle={activeTab.title}
          activeUrl={activeTab.url}
          mentioned={mentionedTabs}
          onRemoveMention={handleRemoveMention}
        />
        <SearchInput
          query={query}
          isAiMode={true}
          onQueryChange={setQuery}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isStreaming={isStreaming}
          focusSignal={focusSignal}
          suppressEnterSubmit={showPicker}
        />
        <Footer />
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="qlx-empty">
      <div className="qlx-empty-hint">Connecting…</div>
    </div>
  )
}

function Footer() {
  return (
    <div className="qlx-footer">
      <span><kbd>↵</kbd> Send</span>
      <span><kbd>@</kbd> Mention tab</span>
      <span><kbd>⌃N</kbd> New chat</span>
    </div>
  )
}

async function initBridge(
  setToken: (t: string | null) => void,
  setStatus: (s: ConnectionStatus) => void,
  setStatusError: (e: string | null) => void,
  setBridgeReady: (b: boolean) => void,
): Promise<void> {
  const [savedToken, endpoint] = await Promise.all([loadToken(), loadEndpoint()])
  setToken(savedToken)
  setBridgeReady(true)
  if (!savedToken) {
    setStatus('idle')
    return
  }
  bridge.onStatus((s, err) => {
    setStatus(s)
    setStatusError(err ?? null)
  })
  try {
    await bridge.connect(endpoint, savedToken)
  } catch (err) {
    console.warn('[app] connect failed:', err)
  }
}

function loadCurrentOnce(
  status: ConnectionStatus,
  hasLoadedRef: React.MutableRefObject<boolean>,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
): void {
  if (status !== 'connected' || hasLoadedRef.current) return
  hasLoadedRef.current = true
  bridge.rpc<{ id: string; messages: ChatMessage[] }>('currentConversation')
    .then((data) => {
      console.log(`[panel] resumed session ${data?.id} with ${data?.messages?.length ?? 0} messages`)
      if (data?.messages?.length > 0) setMessages(data.messages)
    })
    .catch((err) => console.warn('[panel] currentConversation failed:', err))
}

function subscribeChunks(
  activeRequestIdRef: React.MutableRefObject<string | null>,
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  setIsStreaming: (b: boolean) => void,
): () => void {
  return bridge.onChunk((data) => {
    if (data.requestId !== activeRequestIdRef.current) return
    if (data.chunk) setMessages((prev) => appendChunkToLast(prev, data.chunk))
    if (data.done) {
      setIsStreaming(false)
      activeRequestIdRef.current = null
      if (data.interrupted) setMessages((prev) => markLastInterrupted(prev))
    }
  })
}

function appendChunkToLast(messages: ChatMessage[], chunk: string): ChatMessage[] {
  if (messages.length === 0) return messages
  const updated = [...messages]
  const last = updated[updated.length - 1]
  if (last.role !== 'assistant') return messages
  updated[updated.length - 1] = { ...last, content: last.content + chunk }
  return updated
}

function markLastInterrupted(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length === 0) return messages
  const updated = [...messages]
  const last = updated[updated.length - 1]
  if (last.role !== 'assistant') return messages
  updated[updated.length - 1] = { ...last, interrupted: true }
  return updated
}

function watchActiveTab(setActiveTab: (t: ActiveTab) => void): () => void {
  const refresh = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      setActiveTab({ id: tab?.id, title: tab?.title, url: tab?.url })
    } catch { /* ignore */ }
  }
  void refresh()
  const onActivated = () => void refresh()
  const onUpdated = (_id: number, info: chrome.tabs.TabChangeInfo) => {
    if (info.status === 'complete' || info.title) void refresh()
  }
  chrome.tabs.onActivated.addListener(onActivated)
  chrome.tabs.onUpdated.addListener(onUpdated)
  return () => {
    chrome.tabs.onActivated.removeListener(onActivated)
    chrome.tabs.onUpdated.removeListener(onUpdated)
  }
}

function pruneClosedMentions(setMentionedTabs: React.Dispatch<React.SetStateAction<MentionedTab[]>>): () => void {
  const onRemoved = (tabId: number) => {
    setMentionedTabs((prev) => prev.filter((t) => t.tabId !== tabId))
  }
  chrome.tabs.onRemoved.addListener(onRemoved)
  return () => chrome.tabs.onRemoved.removeListener(onRemoved)
}

function attachNewChatShortcut(handleNewChat: () => void): () => void {
  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N') && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      handleNewChat()
    }
  }
  document.addEventListener('keydown', onKey, true)
  return () => document.removeEventListener('keydown', onKey, true)
}

function makeRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
