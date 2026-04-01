import { parentPort } from 'worker_threads'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface EmbedRequest {
  type: 'embed'
  notePath: string
  content: string
}

interface EmbedResponse {
  type: 'embed:result'
  notePath: string
  embedding: number[]
  success: boolean
  error?: string
}

interface BatchRequest {
  type: 'embed:batch'
  notes: { path: string; content: string }[]
  apiKey: string
}

let client: GoogleGenerativeAI | null = null

parentPort?.on('message', async (msg: EmbedRequest | BatchRequest) => {
  if (msg.type === 'embed:batch') {
    await handleBatch(msg)
  }
})

async function handleBatch(msg: BatchRequest): Promise<void> {
  if (!client) {
    client = new GoogleGenerativeAI(msg.apiKey)
  }

  const model = client.getGenerativeModel({ model: 'gemini-embedding-001' })
  const batchSize = 10
  const delayMs = 500

  for (let i = 0; i < msg.notes.length; i += batchSize) {
    const batch = msg.notes.slice(i, i + batchSize)

    for (const note of batch) {
      try {
        // Truncate content for embedding (max ~8000 tokens ≈ 32000 chars)
        const truncated = note.content.slice(0, 32000)
        const result = await model.embedContent(truncated)
        const embedding = result.embedding.values

        const response: EmbedResponse = {
          type: 'embed:result',
          notePath: note.path,
          embedding,
          success: true,
        }
        parentPort?.postMessage(response)
      } catch (err) {
        const response: EmbedResponse = {
          type: 'embed:result',
          notePath: note.path,
          embedding: [],
          success: false,
          error: String(err),
        }
        parentPort?.postMessage(response)
      }
    }

    // Rate limiting delay between batches
    if (i + batchSize < msg.notes.length) {
      await sleep(delayMs)
    }
  }

  parentPort?.postMessage({ type: 'embed:batch:complete' })
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
