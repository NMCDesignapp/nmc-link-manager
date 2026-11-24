#!/usr/bin/env node

/**
 * Gắn SHA của commit vào bản build KPI (NEXT_PUBLIC_KPI_BUILD_SHA).
 * Trang KPI so SHA bản đang chạy với /api/health → khác → tự reload 1 lần,
 * để người dùng KHÔNG bao giờ phải tự "đổi phiên bản" nữa.
 * Render build: RENDER_GIT_COMMIT; GitHub Actions: GITHUB_SHA. Local: bỏ qua.
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const sha = process.env.RENDER_GIT_COMMIT || process.env.GITHUB_SHA || ''
if (!sha) {
  console.log('[build-sha] no commit SHA env (local run) — skip')
  process.exit(0)
}

const line = `NEXT_PUBLIC_KPI_BUILD_SHA=${sha}\n`
for (const dir of [root]) {
  try {
    if (!fs.existsSync(path.join(dir, 'package.json'))) continue
    fs.writeFileSync(path.join(dir, '.env.production.local'), line, 'utf8')
    const rel = path.relative(root, dir) || '.'
    console.log(`[build-sha] ${rel} -> NEXT_PUBLIC_KPI_BUILD_SHA=${sha.slice(0, 7)}`)
  } catch (e) {
    console.log('[build-sha] write failed:', (e && e.message) || e)
  }
}
