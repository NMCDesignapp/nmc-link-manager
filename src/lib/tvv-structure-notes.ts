import { db } from '@/lib/db'

const SETTING_KEY = 'tvv-structure-ghi-chu-v1'

export type TVVStructureNotes = Record<string, string>

export async function getTVVStructureNotes(): Promise<TVVStructureNotes> {
  const row = await db.setting.findUnique({ where: { key: SETTING_KEY }, select: { value: true } })
  if (!row?.value) return {}
  try {
    const parsed = JSON.parse(row.value)
    return parsed && typeof parsed === 'object' ? parsed as TVVStructureNotes : {}
  } catch {
    return {}
  }
}

export async function saveTVVStructureNotes(notes: TVVStructureNotes) {
  const cleaned = Object.fromEntries(
    Object.entries(notes)
      .map(([code, note]) => [String(code).trim(), String(note ?? '').trim()])
      .filter(([code, note]) => code && note),
  )
  await db.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(cleaned) },
    create: { key: SETTING_KEY, value: JSON.stringify(cleaned) },
  })
}

export async function setTVVStructureNote(agentCode: string, note: string) {
  const notes = await getTVVStructureNotes()
  const code = String(agentCode || '').trim()
  if (!code) return
  const value = String(note ?? '').trim()
  if (value) notes[code] = value
  else delete notes[code]
  await saveTVVStructureNotes(notes)
}

export async function removeTVVStructureNote(agentCode: string) {
  const notes = await getTVVStructureNotes()
  delete notes[String(agentCode || '').trim()]
  await saveTVVStructureNotes(notes)
}
