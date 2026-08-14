#!/usr/bin/env node

/**
 * Portable build-time sync for the KPI source shared by Main and kpi-app.
 * Standalone-only navigation stays in apply-standalone-patches.js.
 *
 * Shared visual assets/components are copied here as well so the standalone KPI
 * always receives the same background and linked-page loading experience as Main.
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const checkOnly = process.argv.includes('--check')
const mainPage = path.join(root, 'src', 'app', 'kpi', 'page.tsx')
const mainTemplate = path.join(root, 'src', 'app', 'kpi', 'template.tsx')
const standalonePage = path.join(root, 'kpi-app', 'src', 'app', 'page.tsx')
const standaloneTemplate = path.join(root, 'kpi-app', 'src', 'app', 'template.tsx')
const patchScript = path.join(root, 'scripts', 'apply-standalone-patches.js')
const tableUiPatchScript = path.join(root, 'scripts', 'apply-kpi-table-ui-fixes.js')

const sharedCopies = [
  {
    source: path.join(root, 'src', 'app', 'api', 'health', 'route.ts'),
    target: path.join(root, 'kpi-app', 'src', 'app', 'api', 'health', 'route.ts'),
    label: 'kpi-app/src/app/api/health/route.ts',
  },
  {
    source: mainTemplate,
    target: standaloneTemplate,
    label: 'kpi-app/src/app/template.tsx',
  },
  {
    source: path.join(root, 'src', 'components', 'embedded-program-data-loader.tsx'),
    target: path.join(root, 'kpi-app', 'src', 'components', 'embedded-program-data-loader.tsx'),
    label: 'kpi-app/src/components/embedded-program-data-loader.tsx',
  },
  {
    source: path.join(root, 'public', 'kpi-tech-bg.webp'),
    target: path.join(root, 'kpi-app', 'public', 'kpi-tech-bg.webp'),
    label: 'kpi-app/public/kpi-tech-bg.webp',
  },
  {
    source: path.join(root, 'public', 'kpi-tech-logo.webp'),
    target: path.join(root, 'kpi-app', 'public', 'kpi-tech-logo.webp'),
    label: 'kpi-app/public/kpi-tech-logo.webp',
  },
  {
    source: path.join(root, 'public', 'kpi-ui-overrides.css'),
    target: path.join(root, 'kpi-app', 'public', 'kpi-ui-overrides.css'),
    label: 'kpi-app/public/kpi-ui-overrides.css',
  },
  {
    source: path.join(root, 'public', 'kpi-circuit-v3.css'),
    target: path.join(root, 'kpi-app', 'public', 'kpi-circuit-v3.css'),
    label: 'kpi-app/public/kpi-circuit-v3.css',
  },
  {
    source: path.join(root, 'public', 'kpi-cyber-room-v4.css'),
    target: path.join(root, 'kpi-app', 'public', 'kpi-cyber-room-v4.css'),
    label: 'kpi-app/public/kpi-cyber-room-v4.css',
  },
  {
    source: path.join(root, 'public', 'kpi-loader-fix-v1.css'),
    target: path.join(root, 'kpi-app', 'public', 'kpi-loader-fix-v1.css'),
    label: 'kpi-app/public/kpi-loader-fix-v1.css',
  },
  {
    source: path.join(root, 'public', 'kpi-performance-v1.css'),
    target: path.join(root, 'kpi-app', 'public', 'kpi-performance-v1.css'),
    label: 'kpi-app/public/kpi-performance-v1.css',
  },
]

function fail(message) {
  console.error(`ERROR: ${message}`)
  process.exit(1)
}

for (const required of [mainPage, patchScript, tableUiPatchScript, ...sharedCopies.map((item) => item.source)]) {
  if (!fs.existsSync(required)) fail(`Missing required file: ${required}`)
}

/**
 * Generates the expected standalone KPI page after applying standalone patches.
 * @return {string} The patched standalone page source.
 */
function expectedStandalonePage() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nmc-kpi-sync-'))
  const tempPage = path.join(tempDir, 'page.tsx')
  try {
    fs.copyFileSync(mainPage, tempPage)
    execFileSync(process.execPath, [patchScript, tempPage], { stdio: 'pipe' })
    return fs.readFileSync(tempPage, 'utf8')
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

/**
 * Compares two files for equivalent content.
 * @param {string} source - Path to the source file.
 * @param {string} target - Path to the file being compared.
 * @return {boolean} `true` if both files have equivalent content, `false` if the target is missing or the contents differ.
 */
function sameFile(source, target) {
  if (!fs.existsSync(target)) return false

  const binaryExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'])
  if (binaryExtensions.has(path.extname(source).toLowerCase())) {
    return fs.readFileSync(source).equals(fs.readFileSync(target))
  }

  return normalizeText(fs.readFileSync(source, 'utf8')) === normalizeText(fs.readFileSync(target, 'utf8'))
}

/**
 * Normalizes Windows-style line endings to Unix-style line endings.
 * @param {string} value - The text to normalize.
 * @return {string} The text with CRLF line endings replaced by LF line endings.
 */
function normalizeText(value) {
  return value.replace(/\r\n/g, '\n')
}

/**
 * Verifies that the standalone KPI app matches the synchronized Main App sources and assets.
 */
function verify() {
  const mismatches = []

  if (
    !fs.existsSync(standalonePage)
    || normalizeText(fs.readFileSync(standalonePage, 'utf8')) !== normalizeText(expectedStandalonePage())
  ) {
    mismatches.push('kpi-app/src/app/page.tsx')
  }

  for (const item of sharedCopies) {
    if (!sameFile(item.source, item.target)) {
      mismatches.push(item.label)
    }
  }

  if (mismatches.length) {
    fail(`KPI standalone is out of sync: ${mismatches.join(', ')}`)
  }

  console.log('KPI page, template, loaders and shared visual assets are synced with Main App.')
}

if (checkOnly) {
  verify()
} else {
  // Apply presentation-only table fixes to the canonical KPI source first.
  // Then copy that exact source to standalone, preserving the one-source model.
  execFileSync(process.execPath, [tableUiPatchScript], { stdio: 'inherit' })

  fs.mkdirSync(path.dirname(standalonePage), { recursive: true })
  fs.copyFileSync(mainPage, standalonePage)
  execFileSync(process.execPath, [patchScript, standalonePage], { stdio: 'inherit' })

  for (const item of sharedCopies) {
    fs.mkdirSync(path.dirname(item.target), { recursive: true })
    fs.copyFileSync(item.source, item.target)
  }

  verify()
}
