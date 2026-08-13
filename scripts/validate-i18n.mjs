#!/usr/bin/env node
/**
 * Ensures every locale JSON file has the same key structure as en.json.
 * Exits with code 1 if any locale is missing keys or has extras.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localesDir = path.resolve(__dirname, '../src/i18n/locales')
const baseFile = path.join(localesDir, 'en.json')

function collectKeys(object, prefix = '') {
  const keys = []
  for (const [key, value] of Object.entries(object)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...collectKeys(value, full))
    } else {
      keys.push(full)
    }
  }
  return keys
}

const base = JSON.parse(fs.readFileSync(baseFile, 'utf8'))
const baseKeys = new Set(collectKeys(base))
let failed = false

for (const file of fs.readdirSync(localesDir).filter((name) => name.endsWith('.json'))) {
  if (file === 'en.json') continue
  const locale = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'))
  const localeKeys = new Set(collectKeys(locale))
  const missing = [...baseKeys].filter((key) => !localeKeys.has(key))
  const extra = [...localeKeys].filter((key) => !baseKeys.has(key))
  if (missing.length || extra.length) {
    failed = true
    console.error(`\n${file}:`)
    if (missing.length) console.error(`  missing (${missing.length}):`, missing.join(', '))
    if (extra.length) console.error(`  extra (${extra.length}):`, extra.join(', '))
  }
}

if (failed) {
  console.error('\nLocale validation failed. All locale files must match en.json key structure.')
  process.exit(1)
}

console.log(`i18n OK — ${baseKeys.size} keys across ${fs.readdirSync(localesDir).filter((n) => n.endsWith('.json')).length} locales`)
