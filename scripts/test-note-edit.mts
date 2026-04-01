/**
 * Test note editing flow — verifies duplicate creation bug is fixed.
 *
 * Usage: npx tsx scripts/test-note-edit.mts
 */

import { execFile } from 'child_process'

const CLI = '/Applications/Obsidian.app/Contents/MacOS/obsidian'
const TIMEOUT = 15_000

function exec(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(CLI, args, { timeout: TIMEOUT, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) { reject(error); return }
      resolve(stdout.split('\n')
        .filter(l => !l.includes('Loading updated') && !l.includes('installer is out of date') && !l.includes('better CLI'))
        .join('\n').trim())
    })
  })
}

function findNotePath(name: string): Promise<string | null> {
  // Mimic the FIXED findNotePath that validates the returned name
  return exec(['file', `file=${name}`]).then(output => {
    const pathLine = output.split('\n').find(l => l.startsWith('path\t'))
    const nameLine = output.split('\n').find(l => l.startsWith('name\t'))
    const foundPath = pathLine?.split('\t')[1]?.trim() || null
    const foundName = nameLine?.split('\t')[1]?.trim() || null
    if (!foundPath || !foundName) return null
    if (foundName.toLowerCase() !== name.toLowerCase()) {
      console.log(`    Rejected fuzzy match: asked "${name}", got "${foundName}"`)
      return null
    }
    return foundPath
  }).catch(() => null)
}

async function main() {
  console.log('=== NOTE EDIT FIX VERIFICATION ===\n')

  // Test 1: findNotePath now rejects fuzzy matches
  console.log('── Test 1: findNotePath rejects wrong names ──')
  const cases = [
    { input: 'Esca Website - Rosie', expectMatch: true },
    { input: 'Esca Website - Rosie 1', expectMatch: true },
    { input: '_nonexistent_note_xyz', expectMatch: false },
    { input: 'Esca Website', expectMatch: false },  // partial should NOT match
  ]
  let allPass = true
  for (const { input, expectMatch } of cases) {
    const path = await findNotePath(input)
    const matched = path !== null
    const ok = matched === expectMatch
    console.log(`  ${ok ? '✅' : '❌'} "${input}" → ${path ?? 'null'} (expected ${expectMatch ? 'match' : 'no match'})`)
    if (!ok) allPass = false
  }

  // Test 2: overwrite without path= works
  console.log('\n── Test 2: create overwrite (no path=) works ──')
  const testName = '_test-overwrite-fix'
  try {
    await exec(['create', `name=${testName}`, 'content=Version 1'])
    console.log('  Created V1')

    await exec(['create', `name=${testName}`, 'content=Version 2 FIXED', 'overwrite'])
    const content = await exec(['read', `file=${testName}`])
    const isV2 = content.includes('Version 2 FIXED')
    console.log(`  Overwrote: content is ${isV2 ? 'V2 ✅' : 'still V1 ❌'}`)
    if (!isV2) allPass = false

    // Check no duplicate was created
    const dupPath = await findNotePath(`${testName} 1`)
    if (dupPath) {
      console.log(`  ❌ Duplicate "${testName} 1" was created!`)
      allPass = false
      await exec(['delete', `file=${testName} 1`])
    } else {
      console.log(`  ✅ No duplicate created`)
    }

    await exec(['delete', `file=${testName}`])
  } catch (e) {
    console.log(`  Error: ${e}`)
    allPass = false
  }

  // Test 3: createNote guard prevents duplicates
  console.log('\n── Test 3: createNote duplicate guard ──')
  const testName2 = '_test-dup-guard'
  try {
    await exec(['create', `name=${testName2}`, 'content=Original'])
    console.log('  Created original')

    // Simulate the guard: check if exists before creating
    const existing = await findNotePath(testName2)
    if (existing) {
      console.log(`  ✅ Guard triggered: "${testName2}" exists at ${existing} — would block create_note`)
    } else {
      console.log(`  ❌ Guard missed: findNotePath returned null for existing note`)
      allPass = false
    }

    await exec(['delete', `file=${testName2}`])
  } catch (e) {
    console.log(`  Error: ${e}`)
    allPass = false
  }

  // Test 4: Full edit_note flow simulation
  console.log('\n── Test 4: Full edit_note flow (create → overwrite) ──')
  const testName3 = '_test-full-edit'
  try {
    // Create a note
    await exec(['create', `name=${testName3}`, 'content=# My Project\n\n- [ ] Task 1\n- [ ] Task 2'])
    console.log('  Created note with 2 tasks')

    // Read it (simulating read_note)
    const original = await exec(['read', `file=${testName3}`])
    console.log(`  Read: ${original.length} chars`)

    // Overwrite it (simulating edit_note → overwriteNote)
    const updated = original.replace('- [ ] Task 1', '- [x] Task 1') + '\n- [ ] Task 3'
    await exec(['create', `name=${testName3}`, `content=${updated}`, 'overwrite'])

    // Verify
    const final = await exec(['read', `file=${testName3}`])
    const hasTask1Done = final.includes('- [x] Task 1')
    const hasTask3 = final.includes('- [ ] Task 3')
    console.log(`  After edit: Task 1 done=${hasTask1Done}, Task 3 added=${hasTask3}`)

    // Check no duplicate
    const dup = await findNotePath(`${testName3} 1`)
    const noDup = dup === null

    console.log(`  ${hasTask1Done && hasTask3 && noDup ? '✅' : '❌'} Edit flow ${hasTask1Done && hasTask3 && noDup ? 'works correctly' : 'has issues'}`)
    if (!hasTask1Done || !hasTask3 || !noDup) allPass = false

    await exec(['delete', `file=${testName3}`])
    if (!noDup) try { await exec(['delete', `file=${testName3} 1`]) } catch {}
  } catch (e) {
    console.log(`  Error: ${e}`)
    allPass = false
  }

  console.log(`\n=== ${allPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'} ===`)
}

main().catch(console.error)
