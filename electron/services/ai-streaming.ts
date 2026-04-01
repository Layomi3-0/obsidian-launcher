import type { GoogleGenerativeAI } from '@google/generative-ai'
import type Anthropic from '@anthropic-ai/sdk'
import { getClaudeTools, getGeminiTools, executeTool } from './ai-tools'
import type { ObsidianCLI } from './obsidian-cli'

export interface StreamOptions {
  disableTools?: boolean
  conversationHistory?: { role: string; content: string }[]
}

const MAX_TOOL_TURNS = 5

function formatToolResult(result: { success: boolean; displayMessage: string }): string {
  return `\n\n> ${result.success ? '✓' : '✗'} ${result.displayMessage}\n\n`
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
  const chat = startGeminiChat(geminiClient, model, systemPrompt, obsidianCLI, options)
  let response = await chat.sendMessageStream(userMessage)
  console.log(`[ai:gemini] Streaming... (history: ${(options?.conversationHistory ?? []).length} msgs)`)

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const functionCalls = yield* consumeGeminiStream(response)
    if (functionCalls.length === 0) break

    const toolResults = []
    for (const fc of functionCalls) {
      const result = await executeTool(fc.name, fc.args, obsidianCLI!)
      yield formatToolResult(result)
      toolResults.push(toGeminiToolResponse(fc.name, result))
    }

    response = await chat.sendMessageStream(toolResults)
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

async function* consumeGeminiStream(response: any): AsyncGenerator<string, GeminiFunctionCall[]> {
  const functionCalls: GeminiFunctionCall[] = []

  for await (const chunk of response.stream) {
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

// --- Claude ---

export async function* streamClaude(
  anthropicClient: Anthropic,
  model: string,
  systemPrompt: string,
  userMessage: string,
  obsidianCLI: ObsidianCLI | null,
  options?: StreamOptions,
): AsyncGenerator<string> {
  const vaultAvailable = obsidianCLI?.isAvailable() ?? false
  const tools = options?.disableTools ? [] : getClaudeTools(vaultAvailable)
  const messages = toClaudeMessages(options?.conversationHistory ?? [], userMessage)
  console.log(`[ai:claude] Messages: ${messages.length} (${(options?.conversationHistory ?? []).length} history + 1 new)`)

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const stream = startClaudeStream(anthropicClient, model, systemPrompt, messages, tools)
    const { textParts, toolBlocks } = yield* consumeClaudeStream(stream)
    if (toolBlocks.length === 0) break

    messages.push({ role: 'assistant', content: toAssistantContent(textParts, toolBlocks) })

    const toolResults: any[] = []
    for (const block of toolBlocks) {
      const result = await executeTool(block.name, block.input, obsidianCLI!)
      yield formatToolResult(result)
      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result.message })
    }

    messages.push({ role: 'user', content: toolResults })
  }
}

function toClaudeMessages(
  history: { role: string; content: string }[],
  userMessage: string,
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = history.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }))
  messages.push({ role: 'user', content: userMessage })
  return messages
}

function startClaudeStream(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  tools: any[],
) {
  const config: any = { model, max_tokens: 4096, system: systemPrompt, messages }
  if (tools.length > 0) config.tools = tools
  return client.messages.stream(config)
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

async function* consumeClaudeStream(stream: any): AsyncGenerator<string, ClaudeStreamResult> {
  const textParts: string[] = []
  const toolBlocks: ClaudeToolBlock[] = []
  let pendingId = ''
  let pendingName = ''
  let pendingInput = ''

  for await (const event of stream) {
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
