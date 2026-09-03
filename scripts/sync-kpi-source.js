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
const calendarRoomsPatchScript = path.join(root, 'scripts', 'apply-kpi-calendar-rooms.js')
const mainActionWidthsPatchScript = path.join(root, 'scripts', 'apply-kpi-main-action-widths.js')

const sharedCopies = [
  {
    source: path.join(root, 'public', 'kpi-blackwood-theme-v13.css'),
    target: path.join(root, 'kpi-app', 'public', 'kpi-blackwood-theme-v13.css'),
    label: 'kpi-app/public/kpi-blackwood-theme-v13.css',
  },
  {
    source: path.join(root, 'src', 'app', 'api', 'contests', 'route.ts'),
    target: path.join(root, 'kpi-app', 'src', 'app', 'api', 'contests', 'route.ts'),
    label: 'kpi-app/src/app/api/contests/route.ts',
  },
  {
    source: path.join(root, 'src', 'lib', 'contest-poster.ts'),
    target: path.join(root, 'kpi-app', 'src', 'lib', 'contest-poster.ts'),
    label: 'kpi-app/src/lib/contest-poster.ts',
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
    source: path.join(root, 'src', 'components', 'maintenance-gate.tsx'),
    target: path.join(root, 'kpi-app', 'src', 'components', 'maintenance-gate.tsx'),
    label: 'kpi-app/src/components/maintenance-gate.tsx',
  },
  {
    source: path.join(root, 'public', 'kpi-tech-bg.webp'),
    target: path.join(root, 'kpi-app', 'public', 'kpi-tech-bg.webp'),
    label: 'kpi-app/public/kpi-tech-bg.webp',
  },
  {
    source: path.join(root, 'public', 'nmc-tech-bg-v2.webp'),
    target: path.join(root, 'kpi-app', 'public', 'nmc-tech-bg-v2.webp'),
    label: 'kpi-app/public/nmc-tech-bg-v2.webp',
  },
  {
    source: path.join(root, 'public', 'nmc-tech-bg-v3.webp'),
    target: path.join(root, 'kpi-app', 'public', 'nmc-tech-bg-v3.webp'),
    label: 'kpi-app/public/nmc-tech-bg-v3.webp',
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

for (const required of [mainPage, patchScript, tableUiPatchScript, calendarRoomsPatchScript, mainActionWidthsPatchScript, ...sharedCopies.map((item) => item.source)]) {
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

function sameFile(source, target) {
  return fs.existsSync(target) && fs.readFileSync(source).equals(fs.readFileSync(target))
}

function verify() {
  const mismatches = []

  if (!fs.existsSync(standalonePage) || fs.readFileSync(standalonePage, 'utf8') !== expectedStandalonePage()) {
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

  console.log('KPI page, template, loaders, maintenance gate and shared visual assets are synced with Main App.')
}

if (checkOnly) {
  verify()
} else {
  // Apply presentation-only/shared KPI fixes to the canonical source first.
  // Then copy that exact source to standalone, preserving the one-source model.
  execFileSync(process.execPath, [tableUiPatchScript], { stdio: 'inherit' })
  execFileSync(process.execPath, [calendarRoomsPatchScript], { stdio: 'inherit' })
  execFileSync(process.execPath, [mainActionWidthsPatchScript], { stdio: 'inherit' })

  fs.mkdirSync(path.dirname(standalonePage), { recursive: true })
  fs.copyFileSync(mainPage, standalonePage)
  execFileSync(process.execPath, [patchScript, standalonePage], { stdio: 'inherit' })

  for (const item of sharedCopies) {
    fs.mkdirSync(path.dirname(item.target), { recursive: true })
    fs.copyFileSync(item.source, item.target)
  }

  verify()
}
