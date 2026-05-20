'use client'

import { Link } from '@/lib/types'
import { ArrowLeft, ExternalLink, Download, FileText, File } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from '@/lib/animations'

interface IframeModalProps {
  link: Link
  onClose: () => void
}

export function IframeModal({ link, onClose }: IframeModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [iframeError, setIframeError] = useState(false)
  const [showExtraBtn, setShowExtraBtn] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const onCloseRef = useRef(onClose)
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Keep onClose ref updated
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const startHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setShowExtraBtn(true)
    hideTimerRef.current = setTimeout(() => {
      setShowExtraBtn(false)
    }, 4000)
  }, [])

  // Reset state when link changes + push history
  useEffect(() => {
    setIsLoading(true)
    setIframeError(false)
    setShowExtraBtn(true)
    startHideTimer()
    // Push state for back button
    window.history.pushState({ modal: true }, '')
  }, [link.id])

  // Handle close - only called from UI buttons
  const handleClose = useCallback(() => {
    // Pop the history state we pushed
    if (window.history.state?.modal) {
      window.history.back()
    }
    onCloseRef.current()
  }, [])

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // If we're still mounted and a popstate happens, close the modal
      onCloseRef.current()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  const handleOpenExternal = () => {
    const url = link.url || link.file_url
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const currentLink = link
  const isWebLink = currentLink.link_type === 'web'
  const isImage = currentLink.link_type === 'image' || currentLink.file_type?.startsWith('image/')
  const isVideo = currentLink.link_type === 'video' || currentLink.file_type?.startsWith('video/')
  const isPdf = currentLink.file_type === 'application/pdf'

  return (
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
        {/* Floating button bar - SOLID background shields iframe events */}
        <div
          className="absolute top-2.5 left-2.5 z-[100] flex items-center gap-1.5 rounded-xl px-1.5 py-1.5"
          style={{
            background: 'rgba(10, 10, 15, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 255, 136, 0.15)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Back button - ALWAYS visible */}
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
            style={{
              background: '#00ff8820',
              border: '1px solid #00ff8840',
              color: '#00ff88',
            }}
            onTouchEnd={(e) => { e.preventDefault(); handleClose(); }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Open in new tab button - auto-hides after 4s */}
          <AnimatePresence>
            {showExtraBtn && (
              <motion.button
                onClick={handleOpenExternal}
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                animate={{ opacity: 1, width: 32, marginLeft: 0 }}
                exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Tap zone for extra button - EXCLUDES the button bar area */}
        <div
          className="absolute top-0 left-0 right-0 h-12 z-[90]"
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
        {isWebLink && currentLink.url && (
          <>
            <iframe
              key={currentLink.id}
              ref={iframeRef}
              src={currentLink.url}
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
        {isImage && currentLink.file_url && (
          <div className="w-full h-full flex items-center justify-center p-4" style={{ background: '#0a0a0f' }}>
            <motion.img
              src={currentLink.file_url}
              alt={currentLink.title}
              className="max-w-full max-h-full object-contain rounded-lg"
              onLoad={() => setIsLoading(false)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {/* Video preview */}
        {isVideo && currentLink.file_url && (
          <div className="w-full h-full flex items-center justify-center p-4" style={{ background: '#0a0a0f' }}>
            <video
              src={currentLink.file_url}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg"
              onLoadedData={() => setIsLoading(false)}
            />
          </div>
        )}

        {/* PDF preview */}
        {isPdf && currentLink.file_url && (
          <iframe
            key={`pdf-${currentLink.id}`}
            src={currentLink.file_url}
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
          />
        )}

        {/* Generic file - download/view */}
        {!isWebLink && !isImage && !isVideo && !isPdf && currentLink.file_url && (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center" style={{ background: '#0a0a0f' }}>
            <motion.div
              className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(0, 255, 136, 0.1)' }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              {currentLink.file_type?.includes('text') || currentLink.file_type?.includes('document')
                ? <FileText className="w-12 h-12 text-primary" />
                : <File className="w-12 h-12 text-primary" />}
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">{currentLink.title}</h3>
            <p className="text-muted-foreground mb-6">
              {currentLink.file_name || 'File'}
              {currentLink.file_type && ` (${currentLink.file_type.split('/').pop()})`}
            </p>
            <div className="flex gap-3">
              <motion.a
                href={currentLink.file_url}
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
                href={currentLink.file_url}
                download={currentLink.file_name || undefined}
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
  )
}
