'use client'

import { Link } from '@/lib/types'
import { ArrowLeft, ExternalLink, Download, FileText, File } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from '@/lib/animations'

interface IframeModalProps {
  link: Link | null
  onClose: () => void
}

export function IframeModal({ link, onClose }: IframeModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [iframeError, setIframeError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const onCloseRef = useRef(onClose)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const startHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setShowControls(true)
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }, [])

  const handleClose = useCallback(() => {
    setIsVisible(false)
    if (window.history.state?.modal) {
      window.history.back()
    }
    onCloseRef.current()
  }, [])

  // Push state for back button support
  useEffect(() => {
    if (link) {
      setIsLoading(true)
      setIframeError(false)
      setIsVisible(true)
      setShowControls(true)
      startHideTimer()
      window.history.pushState({ modal: true }, '')
    }
  }, [link])

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      setIsVisible(false)
      onCloseRef.current()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  const handleOpenExternal = () => {
    if (link?.url) {
      window.open(link.url, '_blank', 'noopener,noreferrer')
    } else if (link?.file_url) {
      window.open(link.file_url, '_blank', 'noopener,noreferrer')
    }
  }

  if (!link) return null

  const isWebLink = link.link_type === 'web'
  const isImage = link.link_type === 'image' || link.file_type?.startsWith('image/')
  const isVideo = link.link_type === 'video' || link.file_type?.startsWith('video/')
  const isPdf = link.file_type === 'application/pdf'

  return (
    <AnimatePresence>
      {isVisible && link && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: '#0a0a0f' }}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        >
          {/* Content Area - full screen */}
          <div className="flex-1 relative overflow-hidden">
            {/* Floating Controls - compact, auto-hide */}
            <AnimatePresence>
              {showControls && (
                <motion.div
                  className="absolute top-3 left-3 z-[60] flex items-center gap-1.5"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Back button */}
                  <motion.button
                    onClick={handleClose}
                    className="w-9 h-9 rounded-full flex items-center justify-center smooth-transition"
                    style={{
                      background: 'rgba(0, 0, 0, 0.7)',
                      border: '1px solid rgba(0, 255, 136, 0.3)',
                      color: '#00ff88',
                      backdropFilter: 'blur(8px)',
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </motion.button>

                  {/* Open in new tab button */}
                  <motion.button
                    onClick={handleOpenExternal}
                    className="w-9 h-9 rounded-full flex items-center justify-center smooth-transition"
                    style={{
                      background: 'rgba(0, 0, 0, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(8px)',
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tap zone to show/hide controls */}
            <div
              className="absolute top-0 left-0 right-0 h-16 z-[55]"
              onClick={startHideTimer}
              style={{ cursor: 'pointer' }}
            />

            {/* Loading bar */}
            {isLoading && isWebLink && (
              <div className="absolute top-0 left-0 right-0 h-0.5 z-[60] overflow-hidden" style={{ background: 'transparent' }}>
                <motion.div
                  className="h-full"
                  style={{ background: 'linear-gradient(90deg, #00ff88, #00cc6a)', width: '30%' }}
                  animate={{ x: ['-100%', '400%'] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            )}

            {/* Web link - iframe */}
            {isWebLink && link.url && (
              <>
                <iframe
                  ref={iframeRef}
                  src={link.url}
                  className="w-full h-full border-0"
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false)
                    setIframeError(true)
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />

                {/* Iframe error fallback */}
                {iframeError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center" style={{ background: '#0a0a0f' }}>
                    <motion.div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: 'rgba(0, 255, 136, 0.1)' }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    >
                      <ExternalLink className="w-10 h-10 text-primary" />
                    </motion.div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Trang web khong cho phep mo trong ung dung
                    </p>
                    <motion.button
                      onClick={handleOpenExternal}
                      className="px-6 py-2.5 rounded-lg text-sm font-medium neon-btn neon-press text-primary"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        Mo trong trinh duyet
                      </span>
                    </motion.button>
                  </div>
                )}
              </>
            )}

            {/* Image preview */}
            {isImage && link.file_url && (
              <div className="w-full h-full flex items-center justify-center p-4" style={{ background: '#0a0a0f' }}>
                <motion.img
                  src={link.file_url}
                  alt={link.title}
                  className="max-w-full max-h-full object-contain rounded-lg"
                  onLoad={() => setIsLoading(false)}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            {/* Video preview */}
            {isVideo && link.file_url && (
              <div className="w-full h-full flex items-center justify-center p-4" style={{ background: '#0a0a0f' }}>
                <video
                  src={link.file_url}
                  controls
                  autoPlay
                  className="max-w-full max-h-full rounded-lg"
                  onLoadedData={() => setIsLoading(false)}
                />
              </div>
            )}

            {/* PDF preview */}
            {isPdf && link.file_url && (
              <iframe
                src={link.file_url}
                className="w-full h-full border-0"
                onLoad={() => setIsLoading(false)}
              />
            )}

            {/* Generic file - download/view */}
            {!isWebLink && !isImage && !isVideo && !isPdf && link.file_url && (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: '#0a0a0f' }}>
                <motion.div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: 'rgba(0, 255, 136, 0.1)' }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  {link.file_type?.includes('text') || link.file_type?.includes('document')
                    ? <FileText className="w-12 h-12 text-primary" />
                    : <File className="w-12 h-12 text-primary" />}
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">{link.title}</h3>
                <p className="text-muted-foreground mb-6">
                  {link.file_name || 'File'}
                  {link.file_type && ` (${link.file_type.split('/').pop()})`}
                </p>
                <div className="flex gap-3">
                  <motion.a
                    href={link.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 rounded-xl font-medium text-sm flex items-center gap-2 neon-btn neon-press text-primary"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Xem
                  </motion.a>
                  <motion.a
                    href={link.file_url}
                    download={link.file_name || undefined}
                    className="px-6 py-3 rounded-xl font-medium text-sm flex items-center gap-2 bg-secondary text-foreground border border-border hover:border-primary/50 smooth-transition"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Download className="w-4 h-4" />
                    Tai xuong
                  </motion.a>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
