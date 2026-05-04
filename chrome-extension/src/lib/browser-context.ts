import type { BrowserContext, MentionedTabContext } from './types'

export async function captureContext(
  includePageText: boolean,
  mentionedTabIds: number[] = [],
): Promise<BrowserContext> {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })

  const ctx: BrowserContext = {
    title: activeTab?.title,
    url: activeTab?.url,
  }

  await fillActiveTabContent(ctx, activeTab, includePageText)
  ctx.mentionedTabs = await captureMentionedTabs(mentionedTabIds, activeTab?.id)
  return ctx
}

async function fillActiveTabContent(
  ctx: BrowserContext,
  activeTab: chrome.tabs.Tab | undefined,
  includePageText: boolean,
): Promise<void> {
  const tabId = activeTab?.id
  if (!tabId || !canScript(activeTab.url)) return

  if (includePageText) {
    const extracted = await extractWithFallback(tabId, extractPageText)
    if (extracted) {
      ctx.selection = extracted.selection || undefined
      ctx.pageText = extracted.pageText || undefined
    }
    return
  }

  const selection = await extractWithFallback(tabId, extractSelection)
  if (selection) ctx.selection = selection
}

async function captureMentionedTabs(tabIds: number[], excludeId: number | undefined): Promise<MentionedTabContext[]> {
  const targets = tabIds.filter((id) => id !== excludeId)
  if (targets.length === 0) return []
  const results = await Promise.all(targets.map(captureSingleTab))
  return results.filter((r): r is MentionedTabContext => r !== null)
}

async function captureSingleTab(tabId: number): Promise<MentionedTabContext | null> {
  const tab = await chrome.tabs.get(tabId).catch(() => null)
  if (!tab) return null
  const result: MentionedTabContext = { title: tab.title ?? '', url: tab.url ?? '' }
  if (!canScript(tab.url)) return result
  if (tab.discarded) {
    await chrome.tabs.reload(tabId).catch(() => {})
    await wait(400)
  }
  const extracted = await extractWithFallback(tabId, extractPageText)
  if (extracted?.pageText) result.pageText = extracted.pageText
  if (extracted?.selection) result.selection = extracted.selection
  return result
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function canScript(url: string | undefined): boolean {
  if (!url) return false
  if (url.startsWith('chrome://')) return false
  if (url.startsWith('chrome-extension://')) return false
  if (url.startsWith('edge://')) return false
  if (url.startsWith('about:')) return false
  return true
}

async function extractWithFallback<T>(tabId: number, fn: () => T): Promise<T | null> {
  try {
    const results = await chrome.scripting.executeScript({ target: { tabId }, func: fn })
    return (results[0]?.result ?? null) as T | null
  } catch (err) {
    console.warn('[browser-context] scripting failed:', err)
    return null
  }
}

function extractSelection(): string {
  return window.getSelection()?.toString() ?? ''
}

function extractPageText(): { selection: string; pageText: string } {
  const selection = window.getSelection()?.toString() ?? ''
  const clone = document.body.cloneNode(true) as HTMLElement
  clone.querySelectorAll('script, style, noscript, iframe').forEach((el) => el.remove())
  // innerText needs layout (fails on background tabs); textContent always works.
  const raw = clone.innerText || clone.textContent || ''
  const collapsed = raw.replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  return { selection, pageText: collapsed.slice(0, 30000) }
}
