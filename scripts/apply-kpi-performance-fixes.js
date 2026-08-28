#!/usr/bin/env node

/**
 * KPI runtime performance fixes shared by Main App and standalone KPI.
 *
 * 1) Keep the second AppData hydration pass from competing with the KPI loader fade.
 * 2) Reduce high-frequency Settings polling. Same-origin tabs still receive instant
 *    BroadcastChannel/storage events, while standalone KPI keeps a lightweight fallback.
 * 3) Reduce full background reload frequency so multiple open tabs do not create a
 *    request storm against Supabase/Vercel.
 */

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const targets = [
  path.join(root, 'src', 'lib', 'app-data-context.tsx'),
  path.join(root, 'kpi-app', 'src', 'lib', 'app-data-context.tsx'),
]

const hydrationVariants = [
  {
    cacheWriter: 'writeSessionCache',
    old: `        setData(nextData)
        writeSessionCache(nextData)
        setLastSync(new Date())
        setDataVersion(v => v + 1)
        setLoadError(null)`,
  },
  {
    cacheWriter: 'writeWarmCache',
    old: `        setData(nextData)
        writeWarmCache(nextData)
        setLastSync(new Date())
        setDataVersion(v => v + 1)
        setLoadError(null)`,
  },
]

const optimizedHydrationBlock = (cacheWriter) => `        ${cacheWriter}(nextData)
        // Secondary datasets can arrive while the KPI loader is fading. Mark the
        // large context update as non-urgent so it does not steal an animation frame.
        React.startTransition(() => {
          setData(nextData)
          setLastSync(new Date())
          setDataVersion(v => v + 1)
          setLoadError(null)
        })`

let changed = 0
for (const filePath of targets) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`[KPI perf] Missing ${filePath}`)
  }

  let source = fs.readFileSync(filePath, 'utf8')
  let fileChanged = false

  const alreadyOptimized = hydrationVariants.some(({ cacheWriter }) => source.includes(optimizedHydrationBlock(cacheWriter)))
  if (!alreadyOptimized) {
    const variant = hydrationVariants.find(({ old }) => source.includes(old))
    if (!variant) {
      throw new Error(`[KPI perf] AppData hydration anchor not found in ${filePath}`)
    }
    source = source.replace(variant.old, optimizedHydrationBlock(variant.cacheWriter))
    fileChanged = true
  }

  // 4-second Settings polling generated hundreds/thousands of DB requests per hour.
  if (source.includes('window.setInterval(refresh, 4_000)')) {
    source = source.replace('window.setInterval(refresh, 4_000)', 'window.setInterval(refresh, 20_000)')
    fileChanged = true
  }

  // Full AppData refresh fans out to many endpoints. Keep automatic freshness but
  // avoid reloading every minute on every open tab.
  if (source.includes('window.setInterval(refreshInBackground, 60_000)')) {
    source = source.replace('window.setInterval(refreshInBackground, 60_000)', 'window.setInterval(refreshInBackground, 180_000)')
    fileChanged = true
  }

  // If the source has already been partially optimized by a previous build, accept it.
  if (!source.includes('window.setInterval(refresh, 20_000)')) {
    throw new Error(`[KPI perf] Settings polling anchor not optimized in ${filePath}`)
  }

  if (source.includes('refreshInBackground') && !source.includes('window.setInterval(refreshInBackground, 180_000)')) {
    throw new Error(`[KPI perf] Background refresh anchor not optimized in ${filePath}`)
  }

  if (fileChanged) {
    fs.writeFileSync(filePath, source, 'utf8')
    changed += 1
  }
}

console.log(`✓ KPI performance: hydration is non-urgent, Settings poll=20s, full refresh=180s (${changed} file(s) changed).`)