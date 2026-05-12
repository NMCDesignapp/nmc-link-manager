'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { motion, AnimatePresence } from '@/lib/animations'
import { useSettings } from '@/hooks/use-settings'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

const INSTALL_STORAGE_KEY = 'nmc-pwa-installed'

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showManualGuide, setShowManualGuide] = useState(false)
  const { settings } = useSettings()
  const neonColor = settings.neon_color || '#00ff88'

  useEffect(() => {
    // Check localStorage first for persistent install state
    const storedInstalled = localStorage.getItem(INSTALL_STORAGE_KEY)
    if (storedInstalled === 'true') {
      setIsInstalled(true)
    }

    // Check if already running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      localStorage.setItem(INSTALL_STORAGE_KEY, 'true')
      return
    }

    // Also check navigator.standalone for iOS Safari
    if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone) {
      setIsInstalled(true)
      localStorage.setItem(INSTALL_STORAGE_KEY, 'true')
      return
    }

    // Listen for display-mode changes (when user launches from home screen)
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true)
        localStorage.setItem(INSTALL_STORAGE_KEY, 'true')
      }
    }
    mediaQuery.addEventListener('change', handleMediaChange)

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show prompt after a short delay so user sees the app first
      setTimeout(() => setShowPrompt(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Listen for successful install
    const installHandler = () => {
      setIsInstalled(true)
      localStorage.setItem(INSTALL_STORAGE_KEY, 'true')
      setShowPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', installHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installHandler)
      mediaQuery.removeEventListener('change', handleMediaChange)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        localStorage.setItem(INSTALL_STORAGE_KEY, 'true')
      }
    } catch (error) {
      console.error('Install prompt error:', error)
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    setShowPrompt(false)
  }, [])

  const handleManualGuideDismiss = useCallback(() => {
    setShowManualGuide(false)
  }, [])

  // Don't render if already installed
  if (isInstalled) return null

  return (
    <>
      {/* Auto install banner - shown when browser supports beforeinstallprompt */}
      <AnimatePresence>
        {showPrompt && deferredPrompt && (
          <motion.div
            className="fixed bottom-4 left-4 right-4 z-[90] max-w-lg mx-auto"
            initial={{ opacity: 0, y: 80, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 80, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{
                background: 'rgba(10, 10, 20, 0.95)',
                border: `1px solid ${neonColor}40`,
                backdropFilter: 'blur(20px)',
                boxShadow: `0 0 30px ${neonColor}15, 0 8px 32px rgba(0,0,0,0.5)`,
              }}
            >
              {/* App icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{
                  background: `${neonColor}15`,
                  border: `1px solid ${neonColor}30`,
                }}
              >
                <img
                  src="/icon/icon-192x192.png"
                  alt="NMC"
                  className="w-9 h-9 rounded-lg"
                />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Cài đặt N.M.C
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Thêm vào màn hình chính để truy cập nhanh
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <motion.button
                  onClick={handleInstall}
                  className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  style={{
                    background: `linear-gradient(135deg, ${neonColor}20, ${neonColor}35)`,
                    border: `1px solid ${neonColor}60`,
                    color: neonColor,
                    boxShadow: `0 0 12px ${neonColor}25`,
                  }}
                  whileHover={{ scale: 1.05, boxShadow: `0 0 20px ${neonColor}40` }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Cài đặt
                </motion.button>
                <motion.button
                  onClick={handleDismiss}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual install guide - for iOS Safari which doesn't support beforeinstallprompt */}
      <AnimatePresence>
        {showManualGuide && (
          <motion.div
            className="fixed inset-0 z-[95] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
              onClick={handleManualGuideDismiss}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Guide panel */}
            <motion.div
              className="relative w-full max-w-lg mx-4 mb-8 rounded-2xl p-6"
              style={{
                background: 'rgba(15, 15, 30, 0.98)',
                border: `1px solid ${neonColor}40`,
                backdropFilter: 'blur(20px)',
                boxShadow: `0 0 40px ${neonColor}15`,
              }}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Close button */}
              <motion.button
                onClick={handleManualGuideDismiss}
                className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4" />
              </motion.button>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden"
                  style={{
                    background: `${neonColor}15`,
                    border: `1px solid ${neonColor}30`,
                  }}
                >
                  <img
                    src="/icon/icon-192x192.png"
                    alt="NMC"
                    className="w-11 h-11 rounded-xl"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Cài đặt N.M.C</h3>
                  <p className="text-xs text-muted-foreground">Thêm ứng dụng vào màn hình chính</p>
                </div>
              </div>

              {/* iOS Safari Guide */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ background: `${neonColor}20`, color: neonColor }}
                  >
                    1
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-medium">
                      Nhấn vào nút Chia sẻ
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tìm nút chia sẻ (hình hộp mũi tên chỉ lên) ở thanh địa chỉ của Safari
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ background: `${neonColor}20`, color: neonColor }}
                  >
                    2
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-medium">
                      Chọn &quot;Thêm vào Màn hình Chính&quot;
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cuộn xuống và nhấn vào tùy chọn &quot;Thêm vào Màn hình Chính&quot;
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ background: `${neonColor}20`, color: neonColor }}
                  >
                    3
                  </div>
                  <div>
                    <p className="text-sm text-foreground font-medium">
                      Nhấn &quot;Thêm&quot;
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Xác nhận để thêm N.M.C vào màn hình chính của bạn
                    </p>
                  </div>
                </div>
              </div>

              <motion.button
                onClick={() => {
                  handleManualGuideDismiss()
                }}
                className="w-full mt-5 py-3 rounded-xl text-sm font-bold"
                style={{
                  background: `linear-gradient(135deg, ${neonColor}20, ${neonColor}35)`,
                  border: `1px solid ${neonColor}60`,
                  color: neonColor,
                  boxShadow: `0 0 12px ${neonColor}25`,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Đã hiểu!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating install button - always visible when not installed, opens manual guide on iOS */}
      <AnimatePresence>
        {!isInstalled && !showPrompt && !showManualGuide && (
          <motion.div
            className="fixed bottom-4 right-4 z-[80]"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 2 }}
          >
            <motion.button
              onClick={() => {
                if (deferredPrompt) {
                  handleInstall()
                } else {
                  setShowManualGuide(true)
                }
              }}
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${neonColor}25, ${neonColor}40)`,
                border: `1px solid ${neonColor}50`,
                color: neonColor,
                boxShadow: `0 0 20px ${neonColor}30`,
                backdropFilter: 'blur(12px)',
              }}
              animate={{
                boxShadow: [
                  `0 0 20px ${neonColor}30`,
                  `0 0 30px ${neonColor}50`,
                  `0 0 20px ${neonColor}30`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
            >
              <Smartphone className="w-5 h-5" />
            </motion.button>

            {/* Tooltip */}
            <motion.div
              className="absolute bottom-14 right-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs"
              style={{
                background: 'rgba(0,0,0,0.85)',
                border: `1px solid ${neonColor}30`,
                color: neonColor,
              }}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 3 }}
            >
              Cài đặt app
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
