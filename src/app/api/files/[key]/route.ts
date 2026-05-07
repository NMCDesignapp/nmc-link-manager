import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    const store = getStore('uploads')
    const result = await store.getWithMetadata(key, { type: 'blob' })

    if (!result) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const contentType = result.metadata?.contentType || 'application/octet-stream'
    const originalName = result.metadata?.originalName || key

    return new NextResponse(result.data as Blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(originalName)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('File serve error:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
