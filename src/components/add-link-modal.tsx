'use client'

import { useState, useEffect, useRef } from 'react'
import { Link, Category, LinkType, getFileType } from '@/lib/types'
import {
  X,
  Globe,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Github,
  Linkedin,
  Mail,
  Phone,
  ShoppingBag,
  Music,
  Camera,
  Film,
  BookOpen,
  Coffee,
  Heart,
  Upload,
  FileText,
  Image,
  Video,
  File,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddLinkModalProps {
  isOpen: boolean
  editingLink: Link | null
  categories: Category[]
  onClose: () => void
  onSubmit: (data: Partial<Link>) => Promise<void>
}

const ICONS = [
  { name: 'globe', icon: Globe },
  { name: 'instagram', icon: Instagram },
  { name: 'twitter', icon: Twitter },
  { name: 'facebook', icon: Facebook },
  { name: 'youtube', icon: Youtube },
  { name: 'github', icon: Github },
  { name: 'linkedin', icon: Linkedin },
  { name: 'mail', icon: Mail },
  { name: 'phone', icon: Phone },
  { name: 'shopping-bag', icon: ShoppingBag },
  { name: 'music', icon: Music },
  { name: 'camera', icon: Camera },
  { name: 'film', icon: Film },
  { name: 'book-open', icon: BookOpen },
  { name: 'coffee', icon: Coffee },
  { name: 'heart', icon: Heart },
  { name: 'file', icon: File },
  { name: 'file-text', icon: FileText },
  { name: 'image', icon: Image },
  { name: 'video', icon: Video },
]

const FILE_TYPE_ICONS: Record<string, React.ElementType> = {
  image: Image,
  video: Video,
  document: FileText,
  file: File,
}

export function AddLinkModal({ isOpen, editingLink, categories, onClose, onSubmit }: AddLinkModalProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('globe')
  const [linkType, setLinkType] = useState<'web' | 'file'>('web')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{
    url: string
    name: string
    type: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingLink) {
      setTitle(editingLink.title)
      setUrl(editingLink.url || '')
      setSelectedIcon(editingLink.icon || 'globe')
      setLinkType(editingLink.link_type === 'web' ? 'web' : 'file')
      if (editingLink.file_url) {
        setUploadedFile({
          url: editingLink.file_url,
          name: editingLink.file_name || 'File',
          type: editingLink.file_type || '',
        })
      }
    } else {
      setTitle('')
      setUrl('')
      setSelectedIcon('globe')
      setLinkType('web')
      setUploadedFile(null)
    }
  }, [editingLink, isOpen])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')

      const data = await res.json()
      setUploadedFile({
        url: data.url,
        name: file.name,
        type: file.type,
      })

      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''))
      }

      const fileType = getFileType(file.type)
      if (fileType === 'image') setSelectedIcon('image')
      else if (fileType === 'video') setSelectedIcon('video')
      else if (fileType === 'document') setSelectedIcon('file-text')
      else setSelectedIcon('file')
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    if (linkType === 'web' && !url.trim()) return
    if (linkType === 'file' && !uploadedFile) return

    setIsSubmitting(true)
    try {
      const fileType = uploadedFile ? getFileType(uploadedFile.type) : 'web'

      await onSubmit({
        id: editingLink?.id,
        title: title.trim(),
        url: linkType === 'web' ? url.trim() : null,
        icon: selectedIcon,
        link_type: linkType === 'web' ? 'web' : fileType,
        file_url: uploadedFile?.url || null,
        file_name: uploadedFile?.name || null,
        file_type: uploadedFile?.type || null,
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-sm rounded-xl p-5 max-h-[90vh] overflow-y-auto modal-enter neon-card"
        style={{ background: '#141420', border: '1px solid rgba(0, 255, 136, 0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-4">
          {editingLink ? 'Sua lien ket' : 'Them lien ket'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Link Type Toggle */}
          <div className="flex gap-2 p-1 rounded-lg" style={{ background: '#1a1a2e' }}>
            <button
              type="button"
              onClick={() => setLinkType('web')}
              className={cn(
                'flex-1 py-2 px-3 rounded-md text-sm font-medium smooth-transition flex items-center justify-center gap-2 neon-press',
                linkType === 'web'
                  ? 'bg-primary text-primary-foreground neon-glow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
              )}
            >
              <Globe className="w-4 h-4" />
              Web
            </button>
            <button
              type="button"
              onClick={() => setLinkType('file')}
              className={cn(
                'flex-1 py-2 px-3 rounded-md text-sm font-medium smooth-transition flex items-center justify-center gap-2 neon-press',
                linkType === 'file'
                  ? 'bg-primary text-primary-foreground neon-glow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
              )}
            >
              <Upload className="w-4 h-4" />
              File
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs mb-1 opacity-60">Ten hien thi</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: Portfolio"
              className="w-full px-3 py-2.5 rounded-lg text-sm neon-input"
              style={{ background: '#1a1a2e' }}
              required
            />
          </div>

          {/* URL or File Upload */}
          {linkType === 'web' ? (
            <div>
              <label className="block text-xs mb-1 opacity-60">Duong dan URL</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://"
                className="w-full px-3 py-2.5 rounded-lg text-sm neon-input"
                style={{ background: '#1a1a2e' }}
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs mb-1 opacity-60">Chon file</label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
              />

              {uploadedFile ? (
                <div
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: '#1a1a2e', border: '1px solid rgba(0, 255, 136, 0.3)' }}
                >
                  {(() => {
                    const fileType = getFileType(uploadedFile.type)
                    const IconComponent = FILE_TYPE_ICONS[fileType] || File
                    return <IconComponent className="w-8 h-8 text-primary flex-shrink-0" />
                  })()}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{uploadedFile.type || 'File'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="p-1 rounded-full hover:bg-destructive/20 text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={cn(
                    'w-full py-6 rounded-lg text-sm flex flex-col items-center justify-center gap-2 transition-all',
                    'border-2 border-dashed',
                    isUploading ? 'opacity-50 cursor-wait' : 'hover:border-primary/50'
                  )}
                  style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.1)' }}
                >
                  {isUploading ? (
                    <>
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-muted-foreground">Dang tai len...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-primary" />
                      <span className="text-muted-foreground">Nhan de chon file</span>
                      <span className="text-xs text-muted-foreground/50">Hinh anh, video, tai lieu, etc.</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Icon Picker */}
          <div>
            <label className="block text-xs mb-2 opacity-60">Bieu tuong</label>
            <div className="grid grid-cols-10 gap-1">
              {ICONS.map(({ name, icon: IconComponent }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedIcon(name)}
                  className={cn(
                    'p-1.5 rounded-lg flex items-center justify-center transition-all',
                    selectedIcon === name
                      ? 'bg-primary/30 border border-primary'
                      : 'bg-secondary/50 border border-transparent hover:border-primary/30'
                  )}
                >
                  <IconComponent
                    className={cn('w-3.5 h-3.5', selectedIcon === name ? 'text-primary' : 'text-foreground')}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium neon-press smooth-transition hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Huy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || (linkType === 'web' ? !url.trim() : !uploadedFile)}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50 neon-press smooth-transition glow-hover"
            >
              {isSubmitting ? '...' : 'Luu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
