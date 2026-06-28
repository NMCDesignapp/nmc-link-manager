import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { db, withRetry } from '@/lib/db'

const ALLOWED_PROGRAMS = ['ca-nhan', 'tn-ktm', 'tn-td']
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
const MAX_SIZE = 8 * 1024 * 1024 // 8MB

// GET: return current poster URL for each program (or one if ?program=)
export async function GET(request: NextRequest) {
  try {
    const program = request.nextUrl.searchParams.get('program')
    if (program && !ALLOWED_PROGRAMS.includes(program)) {
      return NextResponse.json({ error: 'Invalid program' }, { status: 400 })
    }

    const keys = program ? [`saoviet-poster-${program}`] : ALLOWED_PROGRAMS.map(p => `saoviet-poster-${p}`)
    const settings = await withRetry(() =>
      db.setting.findMany({ where: { key: { in: keys } } })
    )

    const result: Record<string, string> = {}
    for (const s of settings) {
      if (s.value) result[s.key.replace('saoviet-poster-', '')] = s.value
    }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('saoviet-poster GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch poster' }, { status: 500 })
  }
}

// POST: upload poster (multipart form-data with `program` + `file`)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const program = String(formData.get('program') || '')
    const file = formData.get('file')

    if (!ALLOWED_PROGRAMS.includes(program)) {
      return NextResponse.json({ error: 'Invalid program' }, { status: 400 })
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File must be image (png/jpg/webp/gif)' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 })
    }

    // Ensure directory exists
    const postersDir = join(process.cwd(), 'public', 'posters')
    if (!existsSync(postersDir)) {
      await mkdir(postersDir, { recursive: true })
    }

    // Generate filename: saoviet-{program}-{timestamp}.{ext}
    const ext = file.name.split('.').pop()?.toLowerCase() || (file.type === 'image/png' ? 'png' : 'jpg')
    const filename = `saoviet-${program}-${Date.now()}.${ext}`
    const filepath = join(postersDir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    // Public URL path — served by Next.js static file serving from /public
    const publicUrl = `/posters/${filename}`

    // Persist URL path in Settings table (replace previous poster file)
    const existing = await withRetry(() =>
      db.setting.findUnique({ where: { key: `saoviet-poster-${program}` } })
    )
    if (existing?.value) {
      // Try to delete old poster file (best-effort)
      const oldFilename = existing.value.split('/').pop()
      if (oldFilename) {
        const oldPath = join(postersDir, oldFilename)
        if (existsSync(oldPath)) {
          try { await unlink(oldPath) } catch {}
        }
      }
    }

    await withRetry(() =>
      db.setting.upsert({
        where: { key: `saoviet-poster-${program}` },
        update: { value: publicUrl, updated_at: new Date() },
        create: { key: `saoviet-poster-${program}`, value: publicUrl },
      })
    )

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error) {
    console.error('saoviet-poster POST error:', error)
    return NextResponse.json({ error: 'Failed to upload poster' }, { status: 500 })
  }
}

// DELETE: remove poster for a program
export async function DELETE(request: NextRequest) {
  try {
    const program = request.nextUrl.searchParams.get('program')
    if (!program || !ALLOWED_PROGRAMS.includes(program)) {
      return NextResponse.json({ error: 'Invalid program' }, { status: 400 })
    }

    // Also delete the file from disk
    const existing = await withRetry(() =>
      db.setting.findUnique({ where: { key: `saoviet-poster-${program}` } })
    )
    if (existing?.value) {
      const oldFilename = existing.value.split('/').pop()
      if (oldFilename) {
        const oldPath = join(process.cwd(), 'public', 'posters', oldFilename)
        if (existsSync(oldPath)) {
          try { await unlink(oldPath) } catch {}
        }
      }
    }

    await withRetry(() =>
      db.setting.deleteMany({ where: { key: `saoviet-poster-${program}` } })
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('saoviet-poster DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete poster' }, { status: 500 })
  }
}
