import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@netlify/blobs'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const store = getStore('uploads')
    const key = uuidv4()
    const buffer = await file.arrayBuffer()

    await store.set(key, buffer, {
      metadata: {
        contentType: file.type || 'application/octet-stream',
        originalName: file.name,
      },
    })

    const url = `/api/files/${key}`

    return NextResponse.json({ url, key, name: file.name, type: file.type })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
