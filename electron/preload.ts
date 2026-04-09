import { contextBridge, ipcRenderer } from 'electron'

const api = {
  search: (query: string) => ipcRenderer.invoke('search:query', query),

  openNote: (path: string) => ipcRenderer.invoke('note:open', path),

  hideWindow: () => ipcRenderer.send('window:hide'),
  setCompact: () => ipcRenderer.send('window:compact'),
  setExpanded: () => ipcRenderer.send('window:expand'),

  onCompactChange: (callback: (compact: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: boolean) => callback(value)
    ipcRenderer.on('window:compact', handler)
    return () => ipcRenderer.removeListener('window:compact', handler)
  },

  getSessionContext: () => ipcRenderer.invoke('session:context'),

  sendAIQuery: (requestId: string, query: string, attachments?: { id: string; name: string; mimeType: string; base64: string; size: number }[]) =>
    ipcRenderer.send('ai:query', requestId, query, attachments ?? []),

  cancelAIQuery: (requestId: string) => ipcRenderer.send('ai:cancel', requestId),

  captureNote: (content: string, suggestedPath: string) =>
    ipcRenderer.invoke('capture:note', content, suggestedPath),

  runCommand: (command: string, args: string) =>
    ipcRenderer.invoke(`command:${command}`, args),

  getAIProvider: () => ipcRenderer.invoke('ai:provider:get'),

  setAIProvider: (provider: string) => ipcRenderer.invoke('ai:provider:set', provider),

  onStreamChunk: (callback: (data: { requestId: string; chunk: string; done: boolean; interrupted?: boolean }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { requestId: string; chunk: string; done: boolean; interrupted?: boolean }) => {
      callback(data)
    }
    ipcRenderer.on('ai:chunk', handler)
    return () => ipcRenderer.removeListener('ai:chunk', handler)
  },

  // Obsidian CLI
  obsidianSearch: (query: string) => ipcRenderer.invoke('obsidian:search', query),

  getDailyNote: () => ipcRenderer.invoke('obsidian:daily'),

  appendToDaily: (content: string) => ipcRenderer.invoke('obsidian:daily:append', content),

  getTags: () => ipcRenderer.invoke('obsidian:tags'),

  getBacklinks: (name: string) => ipcRenderer.invoke('obsidian:backlinks', name),

  readNote: (name: string) => ipcRenderer.invoke('obsidian:read', name),

  moveNote: (file: string, to: string) => ipcRenderer.invoke('obsidian:move', file, to),

  getProperties: (name: string) => ipcRenderer.invoke('obsidian:properties', name),

  // Kanban
  getKanbanSummary: () => ipcRenderer.invoke('kanban:summary'),

  // Config / Onboarding
  getSettings: () => ipcRenderer.invoke('config:get'),
  saveSettings: (settings: { vaultPath: string; apiKey: string; provider: string; onboarded: boolean; kanbanEnabled: boolean; kanbanPath: string; projectsFolder: string }) =>
    ipcRenderer.invoke('config:save', settings),
  pickFolder: () => ipcRenderer.invoke('config:pick-folder'),
  validateApiKey: (key: string, provider?: string) => ipcRenderer.invoke('config:validate-key', key, provider || 'claude'),
  initServices: () => ipcRenderer.invoke('services:init'),
  getProjectSummary: () => ipcRenderer.invoke('project:summary'),

  openUrl: (url: string) => ipcRenderer.invoke('open:url', url),

  // Conversations
  getConversations: () => ipcRenderer.invoke('conversation:list'),
  loadConversation: (id: string) => ipcRenderer.invoke('conversation:load', id),
  newConversation: () => ipcRenderer.invoke('conversation:new'),
  deleteConversation: (id: string) => ipcRenderer.invoke('conversation:delete', id),

  onWindowShown: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('window:shown', handler)
    return () => ipcRenderer.removeListener('window:shown', handler)
  },

  onWindowHidden: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('window:hidden', handler)
    return () => ipcRenderer.removeListener('window:hidden', handler)
  },
}

contextBridge.exposeInMainWorld('launcher', api)

console.log('[preload] launcher API exposed to renderer')
