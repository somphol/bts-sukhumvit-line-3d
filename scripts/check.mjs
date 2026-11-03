#!/usr/bin/env node
// Dependency-free release checks for BTS Sukhumvit Line 3D.
//
//   node scripts/check.mjs
//
// Exit codes: 0 all checks pass, 1 at least one check failed.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SKILL = 'skills/bts-sukhumvit-line-3d'
const checks = []
const failures = []

function check(name, fn) {
  checks.push(name)
  try {
    const result = fn()
    if (result === false) failures.push(name)
  } catch (err) {
    failures.push(`${name} — ${err.message}`)
  }
}

function exists(rel) {
  return existsSync(join(ROOT, rel)) && statSync(join(ROOT, rel)).isFile()
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', 'dist-single'].includes(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.isFile()) out.push(full)
  }
  return out
}

function stripCode(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
}

const required = [
  'index.html',
  'style.css',
  'script.js',
  'README.md',
  'AGENTS.md',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  '.nojekyll',
  'docs/ARCHITECTURE.md',
  'docs/REPRODUCTION.md',
  'docs/DEPLOYMENT.md',
  'docs/TESTING.md',
  'scripts/check.mjs',
  `${SKILL}/SKILL.md`,
  `${SKILL}/ATTRIBUTION.md`,
  `${SKILL}/references/method.md`,
  `${SKILL}/references/lessons.md`,
  `${SKILL}/references/verification.md`,
  `${SKILL}/assets/template/index.html`,
  `${SKILL}/assets/template/style.css`,
  `${SKILL}/assets/template/script.js`
]

for (const rel of required) check(`required file: ${rel}`, () => exists(rel))

// Every local src/href in index.html must point at a real file.
const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
const refPattern = /\b(?:src|href)\s*=\s*["']([^"']+)["']/g
const seenRefs = new Set()
let match
while ((match = refPattern.exec(html))) {
  const raw = match[1].trim()
  if (!raw || raw.startsWith('#') || /^(https?:|mailto:|tel:|data:|\/\/)/i.test(raw)) continue
  const target = raw.split(/[?#]/)[0]
  if (!target || seenRefs.has(target)) continue
  seenRefs.add(target)
  check(`index.html local reference: ${target}`, () => exists(target))
}

// Relative Markdown links and images in the maintained docs must resolve.
const markdownFiles = [
  'README.md',
  'AGENTS.md',
  ...walk(join(ROOT, 'docs')).filter((f) => extname(f) === '.md'),
  ...walk(join(ROOT, SKILL)).filter((f) => extname(f) === '.md')
].map((f) => (f.startsWith(ROOT) ? relative(ROOT, f) : f))

const linkPattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g
for (const rel of markdownFiles) {
  const body = stripCode(readFileSync(join(ROOT, rel), 'utf8'))
  let link
  while ((link = linkPattern.exec(body))) {
    let target = link[1].trim().replace(/^<|>$/g, '')
    if (!target || target.startsWith('#') || /^(https?:|mailto:|tel:|data:)/i.test(target)) continue
    target = target.split(/[?#]/)[0]
    if (!target) continue
    const resolved = target.startsWith('/')
      ? join(ROOT, target)
      : resolve(dirname(join(ROOT, rel)), target)
    const label = `${rel} → ${target}`
    check(`Markdown link: ${label}`, () => existsSync(resolved))
  }
}

// Every JavaScript file must parse.
for (const file of walk(ROOT).filter((f) => extname(f) === '.js')) {
  const rel = relative(ROOT, file)
  check(`node --check: ${rel}`, () => {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
    return true
  })
}

// Every JSON file must parse.
for (const file of walk(ROOT).filter((f) => extname(f) === '.json')) {
  const rel = relative(ROOT, file)
  check(`JSON parse: ${rel}`, () => {
    JSON.parse(readFileSync(file, 'utf8'))
    return true
  })
}

// The skill template must stay byte-identical to the release sources.
for (const name of ['index.html', 'style.css', 'script.js']) {
  check(`skill template is byte-identical: ${name}`, () =>
    readFileSync(join(ROOT, name)).equals(readFileSync(join(ROOT, SKILL, 'assets/template', name)))
  )
}

if (failures.length) {
  for (const failure of failures) console.log(`FAIL ${failure}`)
  console.log(`\nFAIL ${failures.length} of ${checks.length} checks`)
  process.exit(1)
}

console.log(`OK ${checks.length} checks`)
