#!/usr/bin/env node

/**
 * Prepare the public standalone KPI API surface for deployment.
 *
 * The repository keeps a generated kpi-app tree for parity with Main App, but
 * the public standalone deployment must never expose database write/admin APIs.
 * At build time we replace the generated API tree with one GET/HEAD-only proxy
 * to Main App. This keeps KPI data current without giving the public KPI project
 * database credentials or POST/PUT/PATCH/DELETE handlers.
 */

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const apiRoot = path.join(root, 'kpi-app', 'src', 'app', 'api')
const catchAllDir = path.join(apiRoot, '[...path]')
const routeFile = path.join(catchAllDir, 'route.ts')

fs.rmSync(apiRoot, { recursive: true, force: true })
fs.mkdirSync(catchAllDir, { recursive: true })

const route = `import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAIN_APP_URL = (process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://nc-link.vercel.app').replace(/\\/$/, '')

function copyResponseHeaders(source: Headers) {
  const headers = new Headers()
  for (const key of ['content-type', 'cache-control', 'content-disposition', 'etag', 'last-modified']) {
    const value = source.get(key)
    if (value) headers.set(key, value)
  }
  if (!headers.has('cache-control')) headers.set('cache-control', 'no-store')
  return headers
}

async function proxyRead(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const current = new URL(request.url)
  const upstream = new URL(\`\${MAIN_APP_URL}/api/\${(path || []).map(encodeURIComponent).join('/')}\`)
  upstream.search = current.search

  try {
    const response = await fetch(upstream, {
      method: request.method,
      cache: 'no-store',
      redirect: 'follow',
      headers: {
        accept: request.headers.get('accept') || '*/*',
      },
    })

    return new Response(request.method === 'HEAD' ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: copyResponseHeaders(response.headers),
    })
  } catch (error) {
    console.error('[KPI standalone] read proxy error:', error)
    return Response.json({ error: 'Không thể tải dữ liệu từ Main App.' }, { status: 502 })
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRead(request, context)
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRead(request, context)
}
`

fs.writeFileSync(routeFile, route, 'utf8')
console.log('Standalone KPI API prepared: GET/HEAD proxy only; write/admin routes removed from build output.')
