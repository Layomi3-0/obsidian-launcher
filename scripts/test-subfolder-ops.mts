/**
 * Test note operations on notes inside subfolders.
 * Simulates the FIXED flow: findNotePath → direct filesystem write.
 *
 * Usage: npx tsx scripts/test-subfolder-ops.mts
 */

import { execFile } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const CLI = '/Applications/Obsidian.app/Contents/MacOS/obsidian'
const VAULT_PATH = '/Users/jkupo/Documents/Resources/Kupo-brain'
const TIMEOUT = 15_000

function exec(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(CLI, args, { timeout: TIMEOUT, maxBuffer: 10 * 1024 * 1024 }, (error, stdout) => {
      if (error) { reject(error); return }
      resolve(stdout.split('\n')
        .filter(l => !l.includes('Loading updated') && !l.includes('installer is out of date') && !l.includes('better CLI'))
        .join('\n').trim())
    })
  })
}

function findNotePath(name: string): Promise<string | null> {
  return exec(['file', `file=${name}`]).then(output => {
    const pathLine = output.split('\n').find(l => l.startsWith('path\t'))
    const nameLine = output.split('\n').find(l => l.startsWith('name\t'))
    const foundPath = pathLine?.split('\t')[1]?.trim() || null
    const foundName = nameLine?.split('\t')[1]?.trim() || null
    if (!foundPath || !foundName) return null
    if (foundName.toLowerCase() !== name.toLowerCase()) return null
    return foundPath
  }).catch(() => null)
}

// Simulates the FIXED overwriteNote: direct filesystem write
async function overwriteNote(name: string, content: string): Promise<{ success: boolean; path: string | null }> {
  const notePath = await findNotePath(name)
  if (!notePath) return { success: false, path: null }

  const absPath = join(VAULT_PATH, notePath)
  writeFileSync(absPath, content, 'utf-8')
  return { success: true, path: notePath }
}

// Simulates the FIXED appendToNote: direct filesystem append
async function appendToNote(name: string, content: string): Promise<boolean> {
  const notePath = await findNotePath(name)
  if (!notePath) return false

  const absPath = join(VAULT_PATH, notePath)
  const existing = readFileSync(absPath, 'utf-8')
  writeFileSync(absPath, existing + '\n' + content, 'utf-8')
  return true
}

async function main() {
  console.log('=== SUBFOLDER OPERATIONS TEST (FIXED) ===\n')

  const NOTE_NAME = '_test-subfolder-fix'
  const NOTE_PATH = `Projects/${NOTE_NAME}.md`
  const ABS_PATH = join(VAULT_PATH, NOTE_PATH)

  // Setup: create in subfolder via CLI
  console.log('── Setup ──')
  await exec(['create', `name=${NOTE_NAME}`, `path=${NOTE_PATH}`, 'content=# Test\n\nOriginal.'])
  console.log(`  Created at ${NOTE_PATH}`)

  // Test 1: findNotePath
  console.log('\n── Test 1: findNotePath ──')
  const path = await findNotePath(NOTE_NAME)
  const t1 = path === NOTE_PATH
  console.log(`  ${t1 ? '✅' : '❌'} Resolved to: ${path}`)

  // Test 2: overwrite via filesystem
  console.log('\n── Test 2: overwrite (filesystem) ──')
  const ow = await overwriteNote(NOTE_NAME, '# Test\n\nOverwritten content!')
  const afterOw = readFileSync(ABS_PATH, 'utf-8')
  const t2 = afterOw.includes('Overwritten content!')
  console.log(`  ${t2 ? '✅' : '❌'} Content overwritten in subfolder`)

  // Check no root duplicate
  const rootDup = existsSync(join(VAULT_PATH, `${NOTE_NAME}.md`))
  const t2b = !rootDup
  console.log(`  ${t2b ? '✅' : '❌'} No root duplicate`)

  // Test 3: append via filesystem
  console.log('\n── Test 3: append (filesystem) ──')
  await appendToNote(NOTE_NAME, '\n## New Section\n\nAppended text.')
  const afterApp = readFileSync(ABS_PATH, 'utf-8')
  const t3 = afterApp.includes('Appended text.') && afterApp.includes('Overwritten content!')
  console.log(`  ${t3 ? '✅' : '❌'} Appended to correct file, original content preserved`)

  // Cleanup
  console.log('\n── Cleanup ──')
  await exec(['delete', `path=${NOTE_PATH}`])
  if (rootDup) try { await exec(['delete', `path=${NOTE_NAME}.md`]) } catch {}

  const allPass = t1 && t2 && t2b && t3
  console.log(`\n=== ${allPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'} ===`)
}

main().catch(console.error)
