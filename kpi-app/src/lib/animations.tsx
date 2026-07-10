'use client'
/**
 * animations.tsx — STANDALONE SHIM cho kpi-app.
 *
 * kpi-app không có framer-motion dependency. File này cung cấp `motion` component
 * passthrough (chỉ render children với props cơ bản — không animate) để các component
 * sync từ main app (như AppLoader) có thể import mà không bị lỗi build.
 *
 * Các variants export (pageVariants, staggerContainer, ...) là no-op objects.
 */
import React from 'react'

// No-op variants — không có framer-motion nên không animate
export const pageVariants = {}
export const staggerContainer = {}
export const staggerItem = {}
export const overlayVariants = {}
export const modalVariants = {}
export const slideUpVariants = {}
export const fadeInVariants = {}
export const popVariants = {}
export const floatAnimation = {}
export const glowPulseAnimation = {}
export const successVariants = {}
export const buttonHover = {}
export const buttonTap = {}
export const cardHover = {}
export const cardTap = {}

/**
 * motion shim — component passthrough.
 * Hỗ trợ props cơ bản: `initial`, `animate`, `exit`, `transition`, `variants`, `whileHover`, `whileTap`.
 * Nếu `animate` có object style → apply trực tiếp làm inline style (no animation).
 * Nếu `animate` là string (variant name) → ignore (no variants in shim).
 */
export const motion = new Proxy({} as any, {
  get(_t: any, tag: string) {
    return React.forwardRef<any, any>(({ children, animate, transition, initial, exit, variants, whileHover, whileTap, ...rest }: any, ref: any) => {
      // Apply animate styles if it's an object (mimic framer-motion behavior — no transition)
      const styleObj: React.CSSProperties = { ...(rest.style || {}) }
      if (animate && typeof animate === 'object') {
        Object.assign(styleObj, animate)
      }
      const Tag = tag as keyof JSX.IntrinsicElements
      return React.createElement(Tag, { ...rest, style: styleObj, ref }, children)
    })
  }
})

/** AnimatePresence shim — chỉ render children (no exit animations) */
export function AnimatePresence({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}
