#!/usr/bin/env node

/**
 * Prepare the public standalone KPI API surface for deployment.
 *
 * The standalone project keeps the broad API surface read-only, but Kế hoạch
 * Khung is an explicit exception: POST/PUT/DELETE are proxied only for
 * /api/calendar so users can add/edit/delete plans from KPI standalone without
 * giving the standalone project database credentials or exposing other writes.
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

function buildUpstream(request: NextRequest, path: string[]) {
  const current = new URL(request.url)
  const upstream = new URL(\`${'${'}MAIN_APP_URL}/api/${'${'}(path || []).map(encodeURIComponent).join('/')}\`)
  upstream.search = current.search
  return upstream
}

async function proxyRead(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const upstream = buildUpstream(request, path || [])

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

async function proxyCalendarWrite(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const normalizedPath = (path || []).join('/')
  if (normalizedPath !== 'calendar') {
    return Response.json(
      { error: 'KPI standalone chỉ cho phép ghi dữ liệu Kế hoạch khung.' },
      { status: 405, headers: { Allow: 'GET, HEAD' } },
    )
  }

  const upstream = buildUpstream(request, path || [])
  const body = request.method === 'DELETE' ? undefined : await request.text()

  try {
    const response = await fetch(upstream, {
      method: request.method,
      cache: 'no-store',
      redirect: 'follow',
      headers: {
        accept: request.headers.get('accept') || 'application/json',
        'content-type': request.headers.get('content-type') || 'application/json',
      },
      body,
    })

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: copyResponseHeaders(response.headers),
    })
  } catch (error) {
    console.error('[KPI standalone] calendar write proxy error:', error)
    return Response.json({ error: 'Không thể lưu Kế hoạch khung vào Main App.' }, { status: 502 })
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRead(request, context)
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRead(request, context)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyCalendarWrite(request, context)
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyCalendarWrite(request, context)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyCalendarWrite(request, context)
}
`

fs.writeFileSync(routeFile, route, 'utf8')
console.log('Standalone KPI API prepared: read proxy + calendar-only POST/PUT/DELETE writes.')
