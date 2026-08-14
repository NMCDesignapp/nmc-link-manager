#!/usr/bin/env node

/**
 * Keep the second AppData hydration pass from competing with the KPI loader fade.
 * React.startTransition marks the large secondary-data render as non-urgent, so
 * the browser can keep input/opacity frames responsive while preserving data.
 */

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const targets = [
  path.join(root, 'src', 'lib', 'app-data-context.tsx'),
  path.join(root, 'kpi-app', 'src', 'lib', 'app-data-context.tsx'),
]

const oldBlock = `        setData(nextData)
        writeSessionCache(nextData)
        setLastSync(new Date())
        setDataVersion(v => v + 1)
        setLoadError(null)`

const newBlock = `        writeSessionCache(nextData)
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
  if (source.includes(newBlock)) continue
  if (!source.includes(oldBlock)) {
    throw new Error(`[KPI perf] AppData hydration anchor not found in ${filePath}`)
  }
  source = source.replace(oldBlock, newBlock)
  fs.writeFileSync(filePath, source, 'utf8')
  changed += 1
}

console.log(`✓ KPI performance: secondary AppData updates use React.startTransition (${changed} file(s) changed).`)
