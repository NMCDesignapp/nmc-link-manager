'use client'

import { Link } from '@/lib/types'
import { ArrowLeft, Download, ExternalLink, FileText, File, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence, overlayVariants, modalVariants } from '@/lib/animations'

interface IframeModalProps {
  link: Link | null
  onClose: () => void
}

export function IframeModal({ link, onClose }: IframeModalProps) {
  const [isLoading, setIsLoading] = useState(true)

  if (!link) return null

  const isImage = link.link_type === 'image' || link.file_type?.startsWith('image/')
  const isVideo = link.link_type === 'video' || link.file_type?.startsWith('video/')
  const isPdf = link.file_type === 'application/pdf'
  const isWebLink = link.link_type === 'web'

  // For web links, this modal should not be shown (opened in new tab directly)
  // But if it is shown, provide a clear open-in-new-tab button
  return (
    <AnimatePresence>
      {link && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center modal-overlay"
          onClick={onClose}
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div
            className="mx-4 w-full max-w-sm rounded-xl overflow-hidden"
            style={{ background: '#141420', border: '1px solid rgba(0, 255, 136, 0.15)' }}
            onClick={e => e.stopPropagation()}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Header Bar */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(0, 255, 136, 0.1)' }}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0, 255, 136, 0.1)' }}
                >
                  {isImage ? <ExternalLink className="w-4 h-4 text-primary" /> :
                   isVideo ? <ExternalLink className="w-4 h-4 text-primary" /> :
                   isPdf ? <FileText className="w-4 h-4 text-primary" /> :
                   <File className="w-4 h-4 text-primary" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium truncate">{link.title}</h3>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {link.link_type === 'web' ? link.url : link.file_name || link.link_type}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 smooth-transition flex-shrink-0 ml-2"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Image preview */}
              {isImage && link.file_url && (
                <div className="flex items-center justify-center rounded-lg overflow-hidden" style={{ background: '#1a1a2e' }}>
                  <motion.img
                    src={link.file_url}
                    alt={link.title}
                    className="max-w-full max-h-[50vh] object-contain"
                    onLoad={() => setIsLoading(false)}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}

              {/* Video preview */}
              {isVideo && link.file_url && (
                <div className="rounded-lg overflow-hidden" style={{ background: '#1a1a2e' }}>
                  <video
                    src={link.file_url}
                    controls
                    autoPlay
                    className="w-full max-h-[50vh]"
                    onLoadedData={() => setIsLoading(false)}
                  />
                </div>
              )}

              {/* PDF / Web link info */}
              {(isPdf || isWebLink) && (
                <motion.div
                  className="flex flex-col items-center justify-center py-6 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(0, 255, 136, 0.1)' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    {isPdf ? <FileText className="w-10 h-10 text-primary" /> : <ExternalLink className="w-10 h-10 text-primary" />}
                  </motion.div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {isPdf ? 'Tai lieu PDF' : 'Mo lien ket web'}
                  </p>
                  <p className="text-xs text-muted-foreground/50 truncate max-w-full">
                    {isPdf ? link.file_name : link.url}
                  </p>
                </motion.div>
              )}

              {/* Generic file info */}
              {!isImage && !isVideo && !isPdf && !isWebLink && link.file_url && (
                <motion.div
                  className="flex flex-col items-center justify-center py-6 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(0, 255, 136, 0.1)' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <File className="w-10 h-10 text-primary" />
                  </motion.div>
                  <p className="text-sm font-medium mb-1">{link.file_name || 'File'}</p>
                  {link.file_type && (
                    <p className="text-xs text-muted-foreground">{link.file_type.split('/').pop()}</p>
                  )}
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Open in new tab */}
                <motion.a
                  href={isWebLink ? link.url || '#' : link.file_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex-1 py-2.5 rounded-lg text-sm font-medium',
                    'flex items-center justify-center gap-2 neon-btn neon-press',
                    'text-primary'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Mo tab moi
                </motion.a>

                {/* Download button for files */}
                {link.file_url && !isWebLink && (
                  <motion.a
                    href={link.file_url}
                    download={link.file_name || undefined}
                    className={cn(
                      'py-2.5 px-4 rounded-lg text-sm font-medium',
                      'flex items-center justify-center gap-2',
                      'bg-secondary text-foreground border border-border',
                      'hover:border-primary/50 smooth-transition'
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Download className="w-4 h-4" />
                  </motion.a>
                )}

                {/* Back button */}
                <motion.button
                  onClick={onClose}
                  className={cn(
                    'py-2.5 px-4 rounded-lg text-sm font-medium',
                    'flex items-center justify-center gap-2',
                    'bg-secondary text-foreground border border-border',
                    'hover:border-primary/50 smooth-transition'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
