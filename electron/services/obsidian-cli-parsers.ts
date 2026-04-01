import { execFile } from 'child_process'

export interface CLISearchResult {
  path: string
  title: string
}

export interface CLITag {
  name: string
}

export function filterCLIOutput(raw: string): string {
  return raw
    .split('\n')
    .filter(line =>
      !line.includes('Loading updated app package') &&
      !line.includes('installer is out of date') &&
      !line.includes('better CLI support'),
    )
    .join('\n')
    .trim()
}

export function parsePathLines(output: string): CLISearchResult[] {
  return output
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const path = line.trim()
      const title = path.replace(/\.md$/, '').split('/').pop() || path
      return { path, title }
    })
}

export function prepareContent(content: string): string {
  if (content.length > 100_000) {
    console.warn(`[obsidian-cli] Very large content: ${content.length} chars — may be truncated by CLI`)
  }
  return `content=${content}`
}

const CLI_TIMEOUT = 15_000

export function execCLI(
  binaryPath: string,
  args: string[],
  onSpawnError: () => void,
): Promise<string> {
  const argSummary = args.map(a => a.length > 80 ? `${a.slice(0, 80)}…(${a.length} chars)` : a)
  console.log(`[obsidian-cli] exec: ${argSummary.join(' ')}`)

  return new Promise((resolve, reject) => {
    execFile(binaryPath, args, { timeout: CLI_TIMEOUT, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (stderr?.trim()) {
        console.warn(`[obsidian-cli] stderr (${args[0]}):`, stderr.trim())
      }
      if (error) {
        const isSpawnError = 'code' in error && (error.code === 'ENOENT' || error.code === 'EACCES')
        if (isSpawnError) onSpawnError()
        console.error(`[obsidian-cli] exec error (${args[0]}):`, error.message)
        reject(error)
        return
      }
      const result = filterCLIOutput(stdout)
      console.log(`[obsidian-cli] stdout (${args[0]}): ${result.length > 200 ? result.slice(0, 200) + '…' : result}`)
      resolve(result)
    })
  })
}
