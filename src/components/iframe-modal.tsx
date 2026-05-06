'use client'

import { Link } from '@/lib/types'
import { ArrowLeft, Download, ExternalLink, FileText, File } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface IframeModalProps {
  link: Link | null
  onClose: () => void
}

export function IframeModal({ link, onClose }: IframeModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const touchStartX = useRef(0)
  const touchCurrentX = useRef(0)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const onCloseRef = useRef(onClose)
  
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setIsVisible(false)
    setSwipeOffset(0)
    setTimeout(() => {
      if (window.history.state?.modal) {
        window.history.back()
      }
      onCloseRef.current()
      setIsClosing(false)
    }, 300)
  }, [])

  useEffect(() => {
    if (link) {
      requestAnimationFrame(() => {
        setIsLoading(true)
        setIsClosing(false)
        setIsVisible(true)
      })
      window.history.pushState({ modal: true }, '')
    }
  }, [link])

  useEffect(() => {
    const handlePopState = () => {
      handleClose()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [handleClose])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX
    const diff = touchCurrentX.current - touchStartX.current
    if (touchStartX.current < 30 && diff > 0) {
      setSwipeOffset(Math.min(diff, window.innerWidth))
    }
  }

  const handleTouchEnd = () => {
    if (swipeOffset > 100 || swipeOffset > window.innerWidth * 0.3) {
      handleClose()
    } else {
      setSwipeOffset(0)
    }
    touchStartX.current = 0
    touchCurrentX.current = 0
  }

  if (!link && !isClosing) return null

  const isWebLink = link?.link_type === 'web'
  const isImage = link?.link_type === 'image' || link?.file_type?.startsWith('image/')
  const isVideo = link?.link_type === 'video' || link?.file_type?.startsWith('video/')
  const isPdf = link?.file_type === 'application/pdf'

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-opacity duration-300',
        isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
      )}
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out"
        style={{
          background: '#0a0a0f',
          transform: swipeOffset > 0
            ? `translateX(${swipeOffset}px)`
            : isVisible && !isClosing
              ? 'translateX(0)'
              : 'translateX(100%)',
        }}
      >
        <button
          onClick={handleClose}
          className={cn(
            'absolute top-4 left-4 z-10',
            'w-10 h-10 rounded-full flex items-center justify-center',
            'bg-background/80 backdrop-blur-sm border border-border/50',
            'hover:bg-background hover:border-primary/30 smooth-transition',
            'shadow-lg neon-press glow-hover'
          )}
          aria-label="Quay lai"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>

        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden" style={{ background: '#1a1a2e' }}>
            <div
              className="h-full neon-glow"
              style={{
                background: 'linear-gradient(90deg, #00ff88, #00cc6a)',
                animation: 'loading 1.5s ease-in-out infinite',
                width: '30%',
              }}
            />
          </div>
        )}

        <div className="h-full w-full">
          {link && (
            <>
              {isWebLink && link.url && (
                <iframe
                  src={`/api/proxy?url=${encodeURIComponent(link.url)}`}
                  className="w-full h-full border-0"
                  onLoad={() => setIsLoading(false)}
                  onError={() => setIsLoading(false)}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
                  referrerPolicy="no-referrer"
                />
              )}

              {isImage && link.file_url && (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img
                    src={link.file_url}
                    alt={link.title}
                    className="max-w-full max-h-full object-contain rounded-lg"
                    onLoad={() => setIsLoading(false)}
                  />
                </div>
              )}

              {isVideo && link.file_url && (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <video
                    src={link.file_url}
                    controls
                    autoPlay
                    className="max-w-full max-h-full rounded-lg"
                    onLoadedData={() => setIsLoading(false)}
                  />
                </div>
              )}

              {isPdf && link.file_url && (
                <iframe
                  src={link.file_url}
                  className="w-full h-full border-0"
                  onLoad={() => setIsLoading(false)}
                />
              )}

              {!isWebLink && !isImage && !isVideo && !isPdf && link.file_url && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
                  <div
                    className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background: 'rgba(0, 255, 136, 0.1)' }}
                  >
                    {link.file_type?.includes('text') || link.file_type?.includes('document')
                      ? <FileText className="w-12 h-12 text-primary" />
                      : <File className="w-12 h-12 text-primary" />}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{link.title}</h3>
                  <p className="text-muted-foreground mb-6">
                    {link.file_name || 'File'}
                    {link.file_type && ` (${link.file_type.split('/').pop()})`}
                  </p>
                  <div className="flex gap-3">
                    <a
                      href={link.file_url}
                      download={link.file_name || undefined}
                      className={cn(
                        'px-6 py-3 rounded-xl font-medium text-sm',
                        'flex items-center gap-2 neon-btn neon-press',
                        'text-primary'
                      )}
                      onClick={() => setIsLoading(false)}
                    >
                      <Download className="w-4 h-4" />
                      Tai xuong
                    </a>
                    <a
                      href={link.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'px-6 py-3 rounded-xl font-medium text-sm',
                        'flex items-center gap-2 neon-press smooth-transition',
                        'bg-secondary text-foreground border border-border',
                        'hover:border-primary/50'
                      )}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Mo trong tab moi
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {swipeOffset > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50"
            style={{ opacity: Math.min(swipeOffset / 100, 1) }}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  )
}
