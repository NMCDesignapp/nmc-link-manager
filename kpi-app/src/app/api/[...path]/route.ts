import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// KPI standalone luôn proxy về domain production chuẩn của Main App.
// Không đọc NEXT_PUBLIC_MAIN_APP_URL ở đây để env migration cũ không thể
// trỏ API sang deployment đã bị gỡ alias và gây DEPLOYMENT_NOT_FOUND.
const MAIN_APP_URL = 'https://nc-link.vercel.app'

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
  const upstream = new URL(`${MAIN_APP_URL}/api/${(path || []).map(encodeURIComponent).join('/')}`)
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

function isAllowedWritePath(normalizedPath: string) {
  return normalizedPath === 'calendar' ||
    normalizedPath === 'kpi-target-registrations' ||
    normalizedPath.startsWith('kpi-target-registrations/')
}

async function proxyAllowedWrite(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const normalizedPath = (path || []).join('/')
  if (!isAllowedWritePath(normalizedPath)) {
    return Response.json(
      { error: 'KPI standalone không cho phép ghi API này.' },
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
    console.error('[KPI standalone] allowed write proxy error:', normalizedPath, error)
    return Response.json({ error: 'Không thể lưu dữ liệu vào Main App.' }, { status: 502 })
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRead(request, context)
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRead(request, context)
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyAllowedWrite(request, context)
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyAllowedWrite(request, context)
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyAllowedWrite(request, context)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyAllowedWrite(request, context)
}
