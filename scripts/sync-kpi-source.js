#!/usr/bin/env node

/**
 * Portable build-time sync for the KPI source shared by Main and kpi-app.
 * Standalone-only navigation stays in apply-standalone-patches.js.
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

function fail(message) {
  console.error(`ERROR: ${message}`)
  process.exit(1)
}

for (const required of [mainPage, mainTemplate, standalonePage, standaloneTemplate, patchScript]) {
  if (!fs.existsSync(required)) fail(`Missing required file: ${required}`)
}

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

function verify() {
  const mismatches = []
  if (fs.readFileSync(standalonePage, 'utf8') !== expectedStandalonePage()) {
    mismatches.push('kpi-app/src/app/page.tsx')
  }
  if (!fs.readFileSync(standaloneTemplate).equals(fs.readFileSync(mainTemplate))) {
    mismatches.push('kpi-app/src/app/template.tsx')
  }
  if (mismatches.length) {
    fail(`KPI standalone is out of sync: ${mismatches.join(', ')}`)
  }
  console.log('KPI page and template are synced with Main App.')
}

if (checkOnly) {
  verify()
} else {
  fs.copyFileSync(mainPage, standalonePage)
  execFileSync(process.execPath, [patchScript, standalonePage], { stdio: 'inherit' })
  fs.copyFileSync(mainTemplate, standaloneTemplate)
  verify()
}
