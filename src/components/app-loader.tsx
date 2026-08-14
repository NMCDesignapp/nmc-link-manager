'use client';

import { useEffect, useState } from 'react';
import { motion } from '@/lib/animations';
import { AlertCircle, RotateCw, Trophy } from 'lucide-react';

/**
 * Branded loading screen shown on initial app load.
 *
 * Theme: dark background + neon green (matching app icon).
 * Animations:
 *  - Initial fade-in
 *  - N•M•C letters drop-in with glow
 *  - Flowing chevron arrows on left/right converging to center
 *  - Pulse ring around logo
 *  - Progress bar at bottom (0 → 90% while loading, 100% on data ready)
 *  - Zoom-in exit transition: when progress reaches 100%, the loader
 *    scales forward (1 → 1.2) and fades out, revealing the app
 *
 * Phase state machine:
 *  - 'loading': progress bar animating 0 → 90%
 *  - 'complete': data ready, progress jumped to 100%, holding briefly so user sees 100%
 *  - 'zooming': scaling up + fading out (0.55s)
 *  - after 'zooming': unmounted
 *
 * Error state: khi `error` được set, hiện error UI với nút 'Thử lại' thay vì progress bar.
 */
export interface AppLoaderProps {
  show: boolean;
  error?: string | null;
  onRetry?: () => void | Promise<void>;
  /** KPI uses a compact modal so the dashboard remains visually recognizable while data loads. */
  variant?: 'default' | 'kpi';
}

/**
 * Displays a loading overlay that transitions out when data loading completes and optionally presents an error with a retry action.
 *
 * @param show - Whether the loading overlay should remain visible
 * @param error - Error message to display instead of the loading state
 * @param onRetry - Optional callback invoked when the user requests a retry
 * @param variant - Visual presentation variant for the loader
 */
export function AppLoader({ show, error, onRetry, variant = 'default' }: AppLoaderProps) {
  // 'loading' → 'complete' → 'zooming' → unmount
  const [phase, setPhase] = useState<'loading' | 'complete' | 'zooming' | 'done'>('loading');
  const [progress, setProgress] = useState(0);

  // ĐÃ BỎ fake progress bar (0→90% easing) — nó chậm hơn data fetch thực tế
  // → user thấy "chậm chậm" dù data đã xong. Giờ progress chỉ nhảy 0 → 100 khi data ready.

  // When show flips to false (data ready), bump progress to 100 and enter 'complete'
  useEffect(() => {
    if (!show && phase === 'loading') {
      setProgress(100);
      setPhase('complete');
    }
  }, [show, phase]);

  // Hold at 100% briefly so user sees the bar fill, then trigger zoom-in
  useEffect(() => {
    if (phase !== 'complete') return;
    const t = setTimeout(() => setPhase('zooming'), 450);
    return () => clearTimeout(t);
  }, [phase]);

  // After zoom-in animation finishes, unmount
  useEffect(() => {
    if (phase !== 'zooming') return;
    const t = setTimeout(() => setPhase('done'), 600);
    return () => clearTimeout(t);
  }, [phase]);

  // Reset back to loading if show becomes true again (rare, but safe)
  useEffect(() => {
    if (show && (phase === 'complete' || phase === 'zooming')) {
      setPhase('loading');
    }
  }, [show, phase]);

  if (phase === 'done') return null;

  const isZooming = phase === 'zooming';

  const color = '#00ff88';

  if (variant === 'kpi') {
    return (
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden p-5"
        style={{
          background: 'rgba(3, 12, 25, 0.72)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          opacity: isZooming ? 0 : 1,
          transition: isZooming ? 'opacity .38s ease-out' : 'none',
          pointerEvents: isZooming ? 'none' as const : 'auto' as const,
        }}
        role="status"
        aria-live="polite"
        aria-label={error ? 'Tải dữ liệu gặp lỗi' : 'Đang tải dữ liệu KPI'}
      >
        <div
          className="relative w-full max-w-[350px] overflow-hidden px-7 py-9 text-center"
          style={{
            borderRadius: 22,
            border: '1px solid rgba(104, 186, 239, .44)',
            background: 'linear-gradient(145deg, rgba(10, 35, 62, .98), rgba(11, 25, 49, .98))',
            boxShadow: '0 20px 70px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-8 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, #66d8ff, transparent)' }}
          />
          {/* nmc-kpi-loader-icon-safe */}
          <div className="nmc-kpi-loader-logo-safe relative mx-auto mb-5 flex h-[104px] w-[104px] items-center justify-center">
            <div className="nmc-kpi-loader-logo-safe-halo pointer-events-none absolute inset-[-17px] rounded-full" />
            <div
              className="relative z-10 h-[92px] w-[92px] overflow-hidden rounded-[23px]"
              style={{ boxShadow: '0 0 0 3px rgba(255,255,255,.14), 0 0 28px rgba(95,214,255,.42), 0 0 48px rgba(78,230,169,.22)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/kpi-tech-logo.webp" alt="KPI An Giang" className="block h-full w-full object-cover" />
              <span className="nmc-kpi-loader-logo-safe-shine pointer-events-none absolute inset-y-[-20%] left-[-48%] w-[34%]" />
            </div>
          </div>
          <h2 className="text-[24px] font-black tracking-tight text-white">Tiến Độ Kinh Doanh</h2>
          <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[.2em]" style={{ color: '#f4ca62' }}>
            Bảo Việt Nhân Thọ An Giang
          </p>
          {error ? (
            <div className="mt-7">
              <AlertCircle className="mx-auto mb-2 h-7 w-7 text-amber-300" />
              <p className="text-sm font-semibold text-amber-100">{error}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={() => void onRetry()}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-extrabold text-white"
                  style={{ borderRadius: 10, border: '1px solid rgba(105, 218, 166, .55)', background: 'rgba(28, 138, 94, .7)' }}
                >
                  <RotateCw size={15} /> Thử lại
                </button>
              )}
            </div>
          ) : (
            <div className="mt-7 flex flex-col items-center gap-3">
              <div
                className="h-10 w-10 rounded-full"
                style={{
                  border: '3px solid rgba(91, 222, 164, .2)',
                  borderTopColor: '#54e4a3',
                  borderRightColor: '#86d8ff',
                  animation: 'nmc-kpi-loader-spin .82s linear infinite',
                }}
              />
              <p className="text-sm italic text-slate-300">Đang tải dữ liệu...</p>
            </div>
          )}
          <style>{`
            @keyframes nmc-kpi-loader-spin { to { transform: rotate(360deg); } }
            @keyframes nmc-kpi-loader-logo-pulse {
              0%, 100% { transform: scale(1); filter: brightness(1); }
              50% { transform: scale(1.035); filter: brightness(1.1); }
            }
            @keyframes nmc-kpi-loader-logo-halo {
              0%, 100% { opacity: .4; transform: scale(.94); }
              50% { opacity: .82; transform: scale(1.06); }
            }
            @keyframes nmc-kpi-loader-logo-shine {
              0%, 20% { transform: translateX(0) rotate(18deg); opacity: 0; }
              32% { opacity: .86; }
              58%, 100% { transform: translateX(520%) rotate(18deg); opacity: 0; }
            }
            .nmc-kpi-loader-logo-safe { animation: nmc-kpi-loader-logo-pulse 2.2s ease-in-out infinite; }
            .nmc-kpi-loader-logo-safe-halo {
              background: radial-gradient(circle, rgba(105,225,255,.64) 0%, rgba(70,229,171,.3) 42%, transparent 72%);
              filter: blur(9px);
              animation: nmc-kpi-loader-logo-halo 1.9s ease-in-out infinite;
            }
            .nmc-kpi-loader-logo-safe-shine {
              background: linear-gradient(90deg, transparent, rgba(255,255,255,.92), transparent);
              filter: blur(1px);
              animation: nmc-kpi-loader-logo-shine 2.6s ease-in-out infinite;
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden"
      style={{
        // Solid dark background — tránh radial-gradient gây GPU compositing artifact (sọc nhiễu) trên mobile
        background: '#050a07',
        opacity: isZooming ? 0 : 1,
        // Bỏ transform: scale(1.25) — scale trên fullscreen overlay + gradient gây artifact nhiễu màu trên mobile
        // Chỉ fade-out opacity (mượt hơn, không gây sọc)
        transition: isZooming
          ? 'opacity 0.4s ease-out'
          : 'none',
        // Khi đang zooming (opacity 0), pointer-events none để không chặn UI bên dưới
        pointerEvents: isZooming ? 'none' as const : 'auto' as const,
      }}
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

        {/* Progress bar — fills 0→90 while loading, jumps to 100 when ready */}
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
            {/* Fill bar — width follows progress */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${color}40, ${color}, ${color}80)`,
                boxShadow: `0 0 10px ${color}, 0 0 20px ${color}80`,
                transition: 'width 0.3s cubic-bezier(.4, 0, .2, 1)',
              }}
            />
            {/* Sweeping shimmer on top while still loading */}
            {phase === 'loading' && (
              <motion.div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: '40%',
                  background: `linear-gradient(90deg, transparent, ${color}cc, transparent)`,
                }}
                animate={{ x: ['-100%', '350%'] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
          </div>
          <div
            style={{
              marginTop: 8,
              textAlign: 'center',
              color: `${color}${progress >= 100 ? 'ff' : '80'}`,
              fontSize: 10,
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
              transition: 'color 0.3s',
            }}
          >
            {progress >= 100 ? 'Sẵn sàng' : 'Đang tải dữ liệu...'}
          </div>
        </motion.div>

        {/* Error state — hiện khi error được set, thay thế progress bar */}
        {error && (
          <motion.div
            className="mt-6 relative"
            style={{ width: 280 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-400" />
              <div className="text-center">
                <div className="text-red-300 text-xs font-semibold uppercase tracking-wider">Không tải được dữ liệu</div>
                <div className="text-red-400/70 text-[10px] mt-1 break-words max-w-[260px]">{error}</div>
              </div>
              {onRetry && (
                <button
                  onClick={() => { Promise.resolve(onRetry()).catch(() => {}); }}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider"
                  style={{
                    background: `${color}15`,
                    border: `1px solid ${color}40`,
                    color: color,
                    boxShadow: `0 0 8px ${color}20`,
                  }}
                >
                  <RotateCw className="w-3 h-3" /> Thử lại
                </button>
              )}
            </div>
          </motion.div>
        )}
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
    </div>
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
