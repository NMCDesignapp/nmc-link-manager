export interface Link {
  id: number
  title: string
  url: string | null
  description: string | null
  icon: string | null
  category: string
  color: string
  link_type: 'web' | 'file' | 'video' | 'image' | 'document'
  file_url: string | null
  file_name: string | null
  file_type: string | null
  thumbnail: string | null
  is_favorite: boolean
  click_count: number
  created_at: string
  updated_at: string
}

export interface Category {
  id: number
  name: string
  icon: string | null
  color: string
  sort_order: number
  created_at: string
}

export interface Setting {
  id: number
  key: string
  value: string | null
  updated_at: string
}

export type LinkType = 'web' | 'file' | 'video' | 'image' | 'document'

export function getFileType(mimeType: string): LinkType {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'file'
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document'
  return 'file'
}
