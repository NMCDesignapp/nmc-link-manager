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
  Tag,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence, overlayVariants, modalVariants, popVariants, buttonHover, buttonTap } from '@/lib/animations'

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

const PRESET_CATEGORIES = [
  'Social Media',
  'Work',
  'Portfolio',
  'Education',
  'Entertainment',
  'Shopping',
  'Music',
  'News',
  'Tech',
  'Other',
]

export function AddLinkModal({ isOpen, editingLink, categories, onClose, onSubmit }: AddLinkModalProps) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('globe')
  const [selectedCategory, setSelectedCategory] = useState('General')
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomCategory, setShowCustomCategory] = useState(false)
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
      setSelectedCategory(editingLink.category || 'General')
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
      setSelectedCategory('General')
      setCustomCategory('')
      setShowCustomCategory(false)
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
      alert('Upload that bai. Vui long thu lai.')
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
      const category = showCustomCategory && customCategory.trim() ? customCategory.trim() : selectedCategory

      await onSubmit({
        id: editingLink?.id,
        title: title.trim(),
        url: linkType === 'web' ? url.trim() : null,
        icon: selectedIcon,
        category,
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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center modal-overlay"
          onClick={onClose}
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div
            className="mx-4 w-full max-w-sm rounded-xl p-5 max-h-[90vh] overflow-y-auto"
            style={{ background: '#141420', border: '1px solid rgba(0, 255, 136, 0.15)' }}
            onClick={e => e.stopPropagation()}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Header */}
            <motion.div
              className="flex items-center justify-between mb-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-base font-semibold">
                {editingLink ? 'Sua lien ket' : 'Them lien ket'}
              </h2>
              <motion.button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 smooth-transition"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4" />
              </motion.button>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Link Type Toggle */}
              <motion.div
                className="flex gap-2 p-1 rounded-lg"
                style={{ background: '#1a1a2e' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {['web', 'file'].map((type) => (
                  <motion.button
                    key={type}
                    type="button"
                    onClick={() => setLinkType(type as 'web' | 'file')}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-md text-sm font-medium smooth-transition flex items-center justify-center gap-2',
                      linkType === type
                        ? 'bg-primary text-primary-foreground neon-glow'
                        : 'text-muted-foreground hover:text-foreground hover:bg-primary/10'
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    layout
                  >
                    {type === 'web' ? <Globe className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    {type === 'web' ? 'Web' : 'File'}
                  </motion.button>
                ))}
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
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
              </motion.div>

              {/* URL or File Upload */}
              <AnimatePresence mode="wait">
                {linkType === 'web' ? (
                  <motion.div
                    key="url-input"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
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
                  </motion.div>
                ) : (
                  <motion.div
                    key="file-upload"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <label className="block text-xs mb-1 opacity-60">Chon file</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                    />

                    <AnimatePresence mode="wait">
                      {uploadedFile ? (
                        <motion.div
                          key="uploaded"
                          className="flex items-center gap-3 p-3 rounded-lg"
                          style={{ background: '#1a1a2e', border: '1px solid rgba(0, 255, 136, 0.3)' }}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
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
                          <motion.button
                            type="button"
                            onClick={() => {
                              setUploadedFile(null)
                              if (fileInputRef.current) fileInputRef.current.value = ''
                            }}
                            className="p-1 rounded-full hover:bg-destructive/20 text-destructive"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.8 }}
                          >
                            <X className="w-4 h-4" />
                          </motion.button>
                        </motion.div>
                      ) : (
                        <motion.button
                          key="upload-btn"
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className={cn(
                            'w-full py-6 rounded-lg text-sm flex flex-col items-center justify-center gap-2 transition-all',
                            'border-2 border-dashed',
                            isUploading ? 'opacity-50 cursor-wait' : 'hover:border-primary/50'
                          )}
                          style={{ background: '#1a1a2e', borderColor: 'rgba(255,255,255,0.1)' }}
                          whileHover={!isUploading ? { borderColor: 'rgba(0, 255, 136, 0.3)', scale: 1.01 } : {}}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {isUploading ? (
                            <>
                              <motion.div
                                className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              />
                              <span className="text-muted-foreground">Dang tai len...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-primary" />
                              <span className="text-muted-foreground">Nhan de chon file</span>
                              <span className="text-xs text-muted-foreground/50">Hinh anh, video, tai lieu, etc.</span>
                            </>
                          )}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Category Selection */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <label className="block text-xs mb-1.5 opacity-60 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Danh muc
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_CATEGORIES.map(cat => (
                    <motion.button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat)
                        setShowCustomCategory(false)
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-medium smooth-transition',
                        selectedCategory === cat && !showCustomCategory
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'bg-secondary/50 text-muted-foreground border border-transparent hover:border-primary/20 hover:text-foreground'
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {cat}
                    </motion.button>
                  ))}
                  {/* Existing categories from DB */}
                  {categories
                    .filter(c => !PRESET_CATEGORIES.includes(c.name))
                    .map(cat => (
                      <motion.button
                        key={cat.name}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.name)
                          setShowCustomCategory(false)
                        }}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-medium smooth-transition',
                          selectedCategory === cat.name && !showCustomCategory
                            ? 'bg-primary/20 text-primary border border-primary/40'
                            : 'bg-secondary/50 text-muted-foreground border border-transparent hover:border-primary/20 hover:text-foreground'
                        )}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {cat.name}
                      </motion.button>
                    ))}
                  <motion.button
                    type="button"
                    onClick={() => setShowCustomCategory(true)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-medium smooth-transition',
                      showCustomCategory
                        ? 'bg-primary/20 text-primary border border-primary/40'
                        : 'bg-secondary/50 text-muted-foreground border border-transparent hover:border-primary/20'
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    + Khac
                  </motion.button>
                </div>
                <AnimatePresence>
                  {showCustomCategory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <input
                        type="text"
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        placeholder="Nhap danh muc moi..."
                        className="w-full px-3 py-2 rounded-lg text-sm neon-input"
                        style={{ background: '#1a1a2e' }}
                        autoFocus
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Icon Picker */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="block text-xs mb-2 opacity-60">Bieu tuong</label>
                <div className="grid grid-cols-10 gap-1">
                  {ICONS.map(({ name, icon: IconComponent }, i) => (
                    <motion.button
                      key={name}
                      type="button"
                      onClick={() => setSelectedIcon(name)}
                      className={cn(
                        'p-1.5 rounded-lg flex items-center justify-center transition-all',
                        selectedIcon === name
                          ? 'bg-primary/30 border border-primary'
                          : 'bg-secondary/50 border border-transparent hover:border-primary/30'
                      )}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.02 }}
                    >
                      <IconComponent
                        className={cn('w-3.5 h-3.5', selectedIcon === name ? 'text-primary' : 'text-foreground')}
                      />
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Buttons */}
              <motion.div
                className="flex gap-2 pt-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <motion.button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium smooth-transition hover:bg-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Huy
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || (linkType === 'web' ? !url.trim() : !uploadedFile)}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50 smooth-transition glow-hover flex items-center justify-center gap-2"
                  whileHover={!isSubmitting ? buttonHover : {}}
                  whileTap={!isSubmitting ? buttonTap : {}}
                >
                  {isSubmitting ? (
                    <motion.div
                      className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Luu
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
