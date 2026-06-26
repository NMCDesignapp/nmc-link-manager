'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from '@/lib/animations';

/**
 * Branded loading screen shown on initial app load.
 *
 * Theme: dark background + neon green (matching app icon).
 * Animations:
 *  - Initial fade-in
 *  - N•M•C letters drop-in with glow
 *  - Flowing chevron arrows on left/right converging to center
 *  - Pulse ring around logo
 *  - Progress bar at bottom
 *  - Smooth fade-out when dismissed
 *
 * Usage: render once near the top of the app, control visibility via `show` prop.
 */
export function AppLoader({ show }: { show: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);

  // Mount animation kick-off
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fake progress bar — animates from 0 to 90% while waiting, jumps to 100% when dismissed
  useEffect(() => {
    if (!mounted) return;
    let raf: number;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const elapsed = (t - start) / 1000;
      // Easing: fast first 1.2s, slow tail to 90%
      const target = elapsed < 1.2 ? (elapsed / 1.2) * 75 : 75 + Math.min(15, (elapsed - 1.2) * 5);
      setProgress(Math.min(90, target));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mounted]);

  // When dismissed, jump to 100% before fade-out
  useEffect(() => {
    if (!show) setProgress(100);
  }, [show]);

  const color = '#00ff88';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at center, #0a1a14 0%, #050a07 60%, #000000 100%)',
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {/* Honeycomb background pattern (subtle, matches app) */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'><g fill='none' stroke='%2300ff88' stroke-width='0.6' stroke-opacity='0.4'><path d='M28 0 L56 16 L56 50 L28 66 L0 50 L0 16 Z'/><path d='M28 66 L56 82 L56 116 L28 132 L0 116 L0 82 Z'/></g></svg>")`,
              backgroundSize: '56px 100px',
              maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
            }}
          />

          {/* Center stage: pulsing ring + NMC logo + arrows */}
          <div className="relative flex flex-col items-center justify-center z-10">
            {/* Pulsing concentric rings */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border"
                style={{
                  borderColor: `${color}40`,
                  width: 180 + i * 60,
                  height: 180 + i * 60,
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: [0.8, 1.1, 0.8],
                  opacity: [0, 0.6, 0],
                }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: 'easeInOut',
                }}
              />
            ))}

            {/* Main NMC content row: left arrows + N•M•C + right arrows */}
            <div className="flex items-center justify-center w-[280px] sm:w-[420px] relative">
              {/* Left flowing chevrons (right → toward text) */}
              <div className="flex-1 min-w-0 overflow-hidden h-[28px] flex items-center">
                <FlowingChevrons direction="left" color={color} />
              </div>

              {/* N•M•C text */}
              <div className="flex items-center justify-center gap-0.5 flex-shrink-0 px-2">
                {['N', '•', 'M', '•', 'C'].map((part, i) => {
                  const isBullet = part === '•';
                  return (
                    <motion.span
                      key={i}
                      className="relative inline-block leading-none"
                      style={{
                        fontSize: isBullet ? '1.2rem' : '2.4rem',
                        fontWeight: isBullet ? 400 : 900,
                        fontFamily: '"Outfit", system-ui, sans-serif',
                        color: isBullet ? `${color}80` : color,
                        textShadow: isBullet
                          ? `0 0 6px ${color}40`
                          : `0 0 12px ${color}, 0 0 28px ${color}80, 0 0 60px ${color}40, 0 0 100px ${color}20`,
                        letterSpacing: isBullet ? '0' : '0.05em',
                      }}
                      initial={{ opacity: 0, y: -30, rotateX: -90 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{
                        delay: 0.2 + i * 0.1,
                        duration: 0.6,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                    >
                      {part}
                    </motion.span>
                  );
                })}
              </div>

              {/* Right flowing chevrons (left → toward text) */}
              <div className="flex-1 min-w-0 overflow-hidden h-[28px] flex items-center">
                <FlowingChevrons direction="right" color={color} />
              </div>
            </div>

            {/* Tagline */}
            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              <div
                style={{
                  color: `${color}cc`,
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  textShadow: `0 0 8px ${color}40`,
                }}
              >
                Trung Tâm Quản Lý Liên Kết
              </div>
              <div
                style={{
                  color: `${color}50`,
                  fontSize: '9px',
                  fontWeight: 400,
                  letterSpacing: '0.15em',
                  marginTop: '4px',
                }}
              >
                N.M.C — v2.6
              </div>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              className="mt-10 relative"
              style={{ width: 240 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <div
                style={{
                  width: '100%',
                  height: 2,
                  background: `${color}15`,
                  borderRadius: 2,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <motion.div
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${color}00, ${color}, ${color}00)`,
                    boxShadow: `0 0 10px ${color}`,
                    width: '100%',
                  }}
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 8,
                  textAlign: 'center',
                  color: `${color}80`,
                  fontSize: 10,
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                }}
              >
                {Math.round(progress)}%
              </div>
            </motion.div>
          </div>

          {/* Bottom shimmer line */}
          <motion.div
            className="absolute bottom-0 left-0 right-0"
            style={{
              height: 1,
              background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
              boxShadow: `0 0 20px ${color}`,
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.4, duration: 1.2, ease: 'easeOut' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Flowing chevron arrows — light sweeps from edge toward center text */
function FlowingChevrons({ direction, color }: { direction: 'left' | 'right'; color: string }) {
  const isLeft = direction === 'left';
  const count = 14;
  const spacing = 12;
  const svgW = count * spacing;
  const svgH = 22;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${svgW} ${svgH}`}
      preserveAspectRatio="none"
      style={{ minWidth: 80 }}
    >
      <defs>
        <linearGradient id={`fade-${direction}`} x1="0%" y1="0%" x2="100%" y2="0%">
          {isLeft ? (
            <>
              <stop offset="0%" stopColor={color} stopOpacity="0.06" />
              <stop offset="80%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0.6" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor={color} stopOpacity="0.6" />
              <stop offset="20%" stopColor={color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={color} stopOpacity="0.06" />
            </>
          )}
        </linearGradient>

        <linearGradient id={`sweep-${direction}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={svgW} y2="0">
          <stop stopColor="white" stopOpacity="0">
            <animate
              attributeName="offset"
              values={isLeft ? '-0.25;-0.25;1.25' : '1.25;1.25;-0.25'}
              keyTimes="0;0.55;1"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </stop>
          <stop stopColor="white" stopOpacity="1">
            <animate
              attributeName="offset"
              values={isLeft ? '-0.12;-0.12;1.38' : '1.38;1.38;-0.12'}
              keyTimes="0;0.55;1"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </stop>
          <stop stopColor="white" stopOpacity="0">
            <animate
              attributeName="offset"
              values={isLeft ? '0;0;1.5' : '1.5;1.5;0'}
              keyTimes="0;0.55;1"
              dur="2.2s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>

        <mask id={`mask-loader-${direction}`}>
          <rect x="0" y="0" width={svgW} height={svgH} fill={`url(#sweep-${direction})`} />
        </mask>
      </defs>

      {/* Base chevrons - always dimly visible */}
      {Array.from({ length: count }).map((_, i) => {
        const x = i * spacing;
        return (
          <path
            key={i}
            d={isLeft
              ? `M${x + 4} 4 L${x + 10} 11 L${x + 4} 18`
              : `M${x + 10} 4 L${x + 4} 11 L${x + 10} 18`
            }
            fill="none"
            stroke={`url(#fade-${direction})`}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {/* Glow chevrons - revealed by sweeping mask */}
      <g mask={`url(#mask-loader-${direction})`} style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
        {Array.from({ length: count }).map((_, i) => {
          const x = i * spacing;
          return (
            <path
              key={`g${i}`}
              d={isLeft
                ? `M${x + 4} 4 L${x + 10} 11 L${x + 4} 18`
                : `M${x + 10} 4 L${x + 4} 11 L${x + 10} 18`
              }
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </g>
    </svg>
  );
}
