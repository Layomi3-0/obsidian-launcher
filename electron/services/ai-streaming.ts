import type { GoogleGenerativeAI } from '@google/generative-ai'
import type Anthropic from '@anthropic-ai/sdk'
import { getClaudeTools, getGeminiTools, executeTool } from './ai-tools'
import type { ObsidianCLI } from './obsidian-cli'
import type { Attachment } from '../ai-handler'

export interface StreamOptions {
  disableTools?: boolean
  conversationHistory?: { role: string; content: string }[]
  attachments?: Attachment[]
  signal?: AbortSignal
}

const MAX_TOOL_TURNS = 15

function formatToolResult(result: { success: boolean; displayMessage: string }): string {
  return `\n\n> ${result.success ? '✓' : '✗'} ${result.displayMessage}\n\n`
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const err = new Error('Aborted')
    err.name = 'AbortError'
    throw err
  }
}

// --- Gemini ---

export async function* streamGemini(
  geminiClient: GoogleGenerativeAI,
  model: string,
  systemPrompt: string,
  userMessage: string,
  obsidianCLI: ObsidianCLI | null,
  options?: StreamOptions,
): AsyncGenerator<string> {
  const signal = options?.signal
  throwIfAborted(signal)

  const chat = startGeminiChat(geminiClient, model, systemPrompt, obsidianCLI, options)
  const messageParts = buildGeminiMessageParts(userMessage, options?.attachments ?? [])
  let response = await chat.sendMessageStream(messageParts)
  console.log(`[ai:gemini] Streaming... (history: ${(options?.conversationHistory ?? []).length} msgs)`)

  let hitLimit = false
  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    throwIfAborted(signal)
    const functionCalls = yield* consumeGeminiStream(response, signal)
    if (functionCalls.length === 0) break

    const toolResults = []
    for (const fc of functionCalls) {
      throwIfAborted(signal)
      const result = await executeTool(fc.name, fc.args, obsidianCLI!)
      throwIfAborted(signal)
      yield formatToolResult(result)
      toolResults.push(toGeminiToolResponse(fc.name, result))
    }

    if (turn === MAX_TOOL_TURNS - 1) {
      hitLimit = true
      break
    }

    throwIfAborted(signal)
    response = await chat.sendMessageStream(toolResults)
  }

  if (hitLimit) {
    console.warn(`[ai:gemini] Hit tool turn limit (${MAX_TOOL_TURNS})`)
    yield '\n\n> ⚠ I ran out of tool turns before finishing. Please try again or break your request into smaller steps.\n\n'
  }

  console.log('[ai:gemini] Stream complete')
}

function startGeminiChat(
  client: GoogleGenerativeAI,
  model: string,
  systemPrompt: string,
  obsidianCLI: ObsidianCLI | null,
  options?: StreamOptions,
) {
  const vaultAvailable = obsidianCLI?.isAvailable() ?? false
  const modelConfig: any = { model, systemInstruction: systemPrompt }
  if (!options?.disableTools) {
    modelConfig.tools = getGeminiTools(vaultAvailable)
  }

  const history = (options?.conversationHistory ?? []).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }))

  return client.getGenerativeModel(modelConfig).startChat({ history })
}

interface GeminiFunctionCall {
  name: string
  args: Record<string, string>
}

async function* consumeGeminiStream(response: any, signal?: AbortSignal): AsyncGenerator<string, GeminiFunctionCall[]> {
  const functionCalls: GeminiFunctionCall[] = []

  for await (const chunk of response.stream) {
    throwIfAborted(signal)
    const text = chunk.text()
    if (text) yield text

    for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
      if ('functionCall' in part && part.functionCall) {
        functionCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args as Record<string, string>,
        })
      }
    }
  }

  return functionCalls
}

function toGeminiToolResponse(name: string, result: { message: string; success: boolean }) {
  return { functionResponse: { name, response: { result: result.message, success: result.success } } }
}

function buildGeminiMessageParts(text: string, attachments: Attachment[]): any[] {
  const parts: any[] = []
  for (const att of attachments) {
    if (isInlineableAttachment(att)) {
      parts.push({ inlineData: { mimeType: att.mimeType, data: att.base64 } })
    }
  }
  parts.push({ text })
  return parts
}

function isInlineableAttachment(att: Attachment): boolean {
  return att.mimeType.startsWith('image/') || att.mimeType === 'application/pdf'
}

// --- Claude ---

export async function* streamClaude(
  anthropicClient: Anthropic,
  model: string,
  systemPrompt: string,
  userMessage: string,
  obsidianCLI: ObsidianCLI | null,
  options?: StreamOptions,
): AsyncGenerator<string> {
  const signal = options?.signal
  throwIfAborted(signal)

  const vaultAvailable = obsidianCLI?.isAvailable() ?? false
  const tools = options?.disableTools ? [] : getClaudeTools(vaultAvailable)
  const messages = toClaudeMessages(options?.conversationHistory ?? [], userMessage, options?.attachments ?? [])
  console.log(`[ai:claude] Messages: ${messages.length} (${(options?.conversationHistory ?? []).length} history + 1 new, ${(options?.attachments ?? []).length} attachments)`)

  let hitLimit = false
  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    throwIfAborted(signal)
    if (turn > 0) ageToolResults(messages)
    const stream = startClaudeStream(anthropicClient, model, systemPrompt, messages, tools, signal)
    const { textParts, toolBlocks } = yield* consumeClaudeStream(stream, signal)
    if (toolBlocks.length === 0) break

    messages.push({ role: 'assistant', content: toAssistantContent(textParts, toolBlocks) })

    const toolResults: any[] = []
    for (const block of toolBlocks) {
      throwIfAborted(signal)
      const result = await executeTool(block.name, block.input, obsidianCLI!)
      throwIfAborted(signal)
      yield formatToolResult(result)
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result.message })
    }

    if (turn === MAX_TOOL_TURNS - 1) {
      hitLimit = true
      break
    }

    messages.push({ role: 'user', content: toolResults })
  }

  if (hitLimit) {
    console.warn(`[ai:claude] Hit tool turn limit (${MAX_TOOL_TURNS})`)
    yield '\n\n> ⚠ I ran out of tool turns before finishing. Please try again or break your request into smaller steps.\n\n'
  }
}

function toClaudeMessages(
  history: { role: string; content: string }[],
  userMessage: string,
  attachments: Attachment[] = [],
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = history.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }))

  if (attachments.length > 0) {
    const contentBlocks: any[] = []
    for (const att of attachments) {
      const block = toClaudeAttachmentBlock(att)
      if (block) contentBlocks.push(block)
    }
    contentBlocks.push({ type: 'text', text: userMessage })
    messages.push({ role: 'user', content: contentBlocks })
  } else {
    messages.push({ role: 'user', content: userMessage })
  }

  return messages
}

function toClaudeAttachmentBlock(att: Attachment): any | null {
  if (att.mimeType.startsWith('image/')) {
    return {
      type: 'image',
      source: { type: 'base64', media_type: att.mimeType, data: att.base64 },
    }
  }
  if (att.mimeType === 'application/pdf') {
    return {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: att.base64 },
    }
  }
  return null
}

function startClaudeStream(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  tools: any[],
  signal?: AbortSignal,
) {
  const config: any = { model, max_tokens: 32768, system: systemPrompt, messages }
  if (tools.length > 0) config.tools = tools
  return client.messages.stream(config, signal ? { signal } : undefined)
}

interface ClaudeToolBlock {
  id: string
  name: string
  input: Record<string, string>
}

interface ClaudeStreamResult {
  textParts: string[]
  toolBlocks: ClaudeToolBlock[]
}

async function* consumeClaudeStream(stream: any, signal?: AbortSignal): AsyncGenerator<string, ClaudeStreamResult> {
  const textParts: string[] = []
  const toolBlocks: ClaudeToolBlock[] = []
  let pendingId = ''
  let pendingName = ''
  let pendingInput = ''

  for await (const event of stream) {
    throwIfAborted(signal)
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
      textParts.push(event.delta.text)
    }
    if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
      pendingId = event.content_block.id
      pendingName = event.content_block.name
      pendingInput = ''
    }
    if (event.type === 'content_block_delta' && event.delta.type === 'input_json_delta') {
      pendingInput += event.delta.partial_json
    }
    if (event.type === 'content_block_stop' && pendingId) {
      toolBlocks.push({ id: pendingId, name: pendingName, input: JSON.parse(pendingInput || '{}') })
      pendingId = ''
    }
  }

  return { textParts, toolBlocks }
}

// ── Tool Result Aging ──
// After the model has consumed tool results, older ones are replaced with
// a short placeholder. The tool_use record stays so the model knows it
// made the call, but the bulky payload is dropped.

const KEEP_RECENT_TOOL_RESULTS = 15

function ageToolResults(messages: any[]): void {
  let recentSeen = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== 'user' || !Array.isArray(msg.content)) continue

    for (let j = msg.content.length - 1; j >= 0; j--) {
      const block = msg.content[j]
      if (block.type !== 'tool_result') continue

      recentSeen++
      if (recentSeen > KEEP_RECENT_TOOL_RESULTS) {
        const originalLen = typeof block.content === 'string' ? block.content.length : 0
        const toolName = findToolName(messages, block.tool_use_id, i)
        block.content = `[Tool result consumed — ${toolName}, ${originalLen} chars]`
      }
    }
  }
}

function findToolName(messages: any[], toolUseId: string, beforeIndex: number): string {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== 'assistant' || !Array.isArray(msg.content)) continue
    for (const block of msg.content) {
      if (block.type === 'tool_use' && block.id === toolUseId) return block.name
    }
  }
  return 'unknown'
}

function toAssistantContent(textParts: string[], toolBlocks: ClaudeToolBlock[]): any[] {
  const content: any[] = []
  if (textParts.length > 0) {
    content.push({ type: 'text', text: textParts.join('') })
  }
  for (const block of toolBlocks) {
    content.push({ type: 'tool_use', id: block.id, name: block.name, input: block.input })
  }
  return content
}
