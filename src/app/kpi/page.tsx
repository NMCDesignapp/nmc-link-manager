'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy, RotateCw, CalendarDays, BarChart3, Flag, BookOpen, Star,
  ArrowLeft, ChevronDown, Clipboard, Award, Crown, Medal, Check, X, Settings
} from 'lucide-react';
import { BackButton } from '@/components/back-button';

/* ================= CSS ================= */
const CSS = `
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
:root {
  --bg: #041828; --bg2: #0a2a40; --bg-card: #12243a; --fg: #f0f4f8;
  --muted: #8a9ab0; --accent: #5ee89c; --accent-strong: #ffd040;
  --accent-glow: #5ee89c52; --green: #4ade80; --red: #f87171;
  --blue: #60a5fa; --border: #ffffff1a; --gold: #e8b84a;
  --track: #0d1e30; --track-fill: #3de890; --track-soft: #1a5a3a;
  --notice-h: 44px;
}
*, *::before, *::after { box-sizing: border-box; }
button { border: none; background: none; padding: 0; margin: 0; font: inherit; color: inherit; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; }
.kpi-app { background: var(--bg); font-family: Tahoma, Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: var(--fg); overflow-x: hidden; -webkit-font-smoothing: antialiased; min-height: 100vh; }
.kpi-app .bg-scene { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; background: radial-gradient(ellipse at 30% 20%, #0c2850 0%, var(--bg) 70%); }
.kpi-app .bg-orb { position: absolute; border-radius: 50%; filter: blur(100px); opacity: .22; animation: orbFloat 18s ease-in-out infinite alternate; will-change: transform; }
.kpi-app .bg-orb-1 { width: 500px; height: 500px; background: #0a3060; top: -15%; left: -10%; }
.kpi-app .bg-orb-2 { width: 400px; height: 400px; background: #0c2050; bottom: -10%; right: -10%; animation-delay: -6s; }
.kpi-app .bg-orb-3 { width: 300px; height: 300px; background: #104070; top: 50%; left: 60%; animation-delay: -12s; }
@keyframes orbFloat { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-40px) scale(1.08); } 100% { transform: translate(-15px,15px) scale(.95); } }

.kpi-app .app-wrap { position: relative; z-index: 1; max-width: 860px; margin: 0 auto; padding: 24px 16px 24px; }
@media (min-width: 900px) { .kpi-app .app-wrap { max-width: 1100px; padding: 24px 32px; margin: 0 auto; } }

.kpi-app .view { display: none; animation: viewIn .4s ease-out; }
.kpi-app .view.active { display: block; }
@keyframes viewIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes cardSlideIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

/* Hero */
.kpi-app .hero-title { font-family: Tahoma, Arial, Helvetica, sans-serif; font-size: clamp(2rem, 7vw, 3rem); font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: 0; line-height: 1.1; background: linear-gradient(135deg, #ffffff 0%, #c0e8ff 28%, #60b8ff 54%, #40e898 82%, #c0fff0 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.kpi-app .hero-sub { font-size: 11px; font-weight: 800; color: #e0c060; text-transform: uppercase; letter-spacing: .18em; margin-top: 4px; }
.kpi-app .main-header { display: flex; align-items: center; gap: 6px; position: relative; }
.kpi-app .main-header .btn-back-u { flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,.06); color: #9a9184; display: flex; align-items: center; justify-content: center; border: 1px solid #ffffff14; transition: all .2s; }
.kpi-app .main-header .btn-back-u:hover { color: #6cc78a; background: rgba(108,199,138,.12); border-color: #6cc78a44; }
.kpi-app .main-header > div { flex: 1; text-align: center; }
.kpi-app .main-header > .btn-back-u + div { margin-right: 46px; }

/* Controls */
.kpi-app .ctrl-bar { display: flex; gap: 10px; margin-top: 16px; flex-wrap: nowrap; align-items: center; }
.kpi-app .ctrl-select-wrap { position: relative; }
.kpi-app .ctrl-select { height: 36px; padding: 0 12px; border-radius: 99px; background: rgba(255,255,255,.06); border: 1.5px solid #2a4a70; color: #90b0d0; font-weight: 600; font-size: 11px; outline: none; font-family: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all .2s; }
.kpi-app .ctrl-select:hover { background: rgba(255,255,255,.1); border-color: #3a7cc8; color: #c8e0ff; }
.kpi-app .ctrl-select .ctrl-icon { display: inline-flex; color: #60b0f0; }
.kpi-app .ctrl-select-period { padding: 0 14px; min-width: 44px; }
.kpi-app .ctrl-select-period .ctrl-period-label {
  font-size: 13px; font-weight: 900; letter-spacing: .02em;
  background: linear-gradient(135deg, #60b0f0 0%, #a0d8ff 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  text-shadow: 0 0 12px #60b0f044;
}
.kpi-app .ctrl-select-period:hover .ctrl-period-label {
  background: linear-gradient(135deg, #80c8ff 0%, #c8e8ff 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.kpi-app .ctrl-hint { font-style: italic; font-size: 10px; color: #5a7a9a; font-weight: 400; white-space: nowrap; }
.kpi-app .ctrl-select-popup { position: absolute; top: calc(100% + 8px); left: 50%; transform: translateX(-50%); width: 280px; max-width: calc(100vw - 32px); background: #0f2040ee; border: 1px solid #2a5a8a; border-radius: 14px; box-shadow: 0 18px 36px #00000066; backdrop-filter: blur(14px); padding: 10px; display: none; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 6px; z-index: 30; max-height: 260px; overflow-y: auto; }
.kpi-app .ctrl-select-wrap.open .ctrl-select-popup { display: grid; }
.kpi-app .ctrl-select-opt { min-height: 34px; border-radius: 8px; border: 1px solid #2a4a70; background: #132a4a; color: #c0d8f0; font-family: inherit; font-size: 11px; font-weight: 800; cursor: pointer; transition: all .2s; }
.kpi-app .ctrl-select-opt:hover { background: #1a3a5e; color: #fff; border-color: #3a7cc8; }
.kpi-app .ctrl-select-opt.on { background: linear-gradient(135deg, #3a7cc8, #2a6ab8); color: #fff; border-color: #5090d8; box-shadow: 0 4px 12px #3a7cc844; }
.kpi-app .sync-status { position: relative; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #0a2a3a; border: 1.5px solid #1a5a3a; flex-shrink: 0; }
.kpi-app .sync-status .sync-check { color: #4ade80; }
.kpi-app .sync-status.syncing { border-color: #c8a848; animation: syncPulse 1s ease-in-out infinite; }
.kpi-app .sync-status.syncing .sync-check { display: none; }
.kpi-app .sync-status .sync-spinner { display: none; color: #fbbf24; animation: spin 1s linear infinite; }
.kpi-app .sync-status.syncing .sync-spinner { display: inline-flex; }
@keyframes syncPulse { 0%,100% { box-shadow: 0 0 0 0 #c8a84844; } 50% { box-shadow: 0 0 0 6px #c8a84800; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Company Card */
.kpi-app #kpi-company { margin-top: 32px; }
.kpi-app .kpi-cty { background: linear-gradient(180deg, #1a3460, #152c52); border: 1.5px solid #e0a84066; border-top: 4px solid #f2b24d; box-shadow: 0 20px 50px #0000005c, inset 0 1px 0 #ffffff14; padding: 18px 20px 22px; margin-bottom: 10px; border-radius: 14px; position: relative; overflow: hidden; }
.kpi-app .kpi-cty.glow-full { border-color: #f2d38d; box-shadow: 0 0 0 2px #f2d38d6b, 0 24px 54px #00000066, 0 0 34px #f2d38d38; }
.kpi-app .kpi-cty.glow-full::before, .kpi-app .kpi-ad.glow-full::before { content: 'HTKH'; position: absolute; top: 10px; left: 10px; z-index: 4; padding: 4px 8px; border-radius: 999px; background: linear-gradient(135deg, #a8ffa8, #6fff6f); color: #2d5c26; font-size: 10px; font-weight: 900; letter-spacing: .05em; box-shadow: 0 8px 18px #73f26e35; }
.kpi-app .cty-inner { position: relative; z-index: 1; }
.kpi-app .cty-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.kpi-app .cty-name { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 900; text-transform: uppercase; color: #ffb040; }
.kpi-app .cty-pct-num { font-size: clamp(2rem, 6vw, 2.5rem); font-weight: 900; line-height: 1; color: #ffe0a0; }
.kpi-app .cty-body { display: grid; grid-template-columns: minmax(0,1fr) minmax(180px, 340px); gap: 18px; align-items: center; }
.kpi-app .afyp-kh-row { display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
.kpi-app .afyp-big { font-weight: 900; line-height: 1.1; color: #fff; }
.kpi-app .kh-small { font-weight: 400; color: #b7aa982e; font-size: .8em; }
.kpi-app .cty .afyp-big { font-size: clamp(2rem, 6vw, 2.7rem); }
.kpi-app .cty .kh-small { font-size: clamp(.8rem, 2vw, 1rem); color: #6ab0e8; font-weight: 700; }
.kpi-app .cty-progress { width: 100%; height: 12px; border-radius: 99px; background: #1a3050; overflow: hidden; box-shadow: inset 0 1px 2px #00000033; }
.kpi-app .cty-progress-fill { height: 100%; width: 0; border-radius: inherit; transition: width 1s cubic-bezier(.22,1,.36,1); background: linear-gradient(90deg, #40d890, #70f0b8); will-change: width; box-shadow: 0 0 8px #40d89044; }
.kpi-app .cty-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 5px; margin-top: 14px; }
.kpi-app .cty-stat { border-radius: 6px; padding: 8px 4px 7px; text-align: center; border: none; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 52px; }
.kpi-app .cty-stat-label { font-size: 9px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; color: rgba(255,255,255,.85); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; letter-spacing: .04em; }
.kpi-app .cty-stat-val { font-size: 18px; font-weight: 900; line-height: 1.1; white-space: nowrap; color: #fff; }
.kpi-app .cty-stat-sub { font-size: 0.5em; font-weight: 700; opacity: .75; margin-left: 1px; }
.kpi-app .cty-stat.hd { background: #3a7cc8; } .kpi-app .cty-stat.hd .cty-stat-val { color: #ffffff; }
.kpi-app .cty-stat.td { background: #8a7ab8; } .kpi-app .cty-stat.td .cty-stat-val { color: #ffffff; }
.kpi-app .cty-stat.chuan { background: #2a9aaa; } .kpi-app .cty-stat.chuan .cty-stat-val { color: #ffffff; }
.kpi-app .cty-stat.ip { background: #c8a848; } .kpi-app .cty-stat.ip .cty-stat-val { color: #ffffff; }
.kpi-app .cty-stat.ns { background: #5a9a68; } .kpi-app .cty-stat.ns .cty-stat-val { color: #ffffff; }
.kpi-app .cty-stat.dl { background: #a08050; } .kpi-app .cty-stat.dl .cty-stat-val { color: #ffffff; }
.kpi-app .cty-stat.sl { background: #6a88a8; } .kpi-app .cty-stat.sl .cty-stat-val { color: #ffffff; }
.kpi-app .cty-stat.tbtn { background: #7C3AED; } .kpi-app .cty-stat.tbtn .cty-stat-val { color: #ffffff; }
.kpi-app .cty-progress-bar { margin-top: 10px; width: 100%; height: 5px; border-radius: 99px; background: #1a2a44; overflow: hidden; }
.kpi-app .cty-progress-bar-fill { height: 100%; border-radius: inherit; transition: width 1s cubic-bezier(.22,1,.36,1); background: linear-gradient(90deg, #11b76f, #16cb74); }

/* Phong Card - New Design (Mobile) */
.kpi-app .kpi-phong { background: transparent; border: none; margin-top: 10px; box-shadow: none; border-radius: 0; overflow: visible; position: relative; }
.kpi-app .kpi-phong.glow-full { border-color: transparent; box-shadow: none; }
.kpi-app .phong-inner { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 6px; }
.kpi-app .phong-main-card { border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px #00000050; }
.kpi-app .phong-main-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 12px; background: linear-gradient(135deg, #e8a838, #d49428); }
.kpi-app .phong-main-name { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #fff; letter-spacing: .06em; }
.kpi-app .phong-main-pct { font-size: 17px; font-weight: 900; color: #fff; text-shadow: 0 0 12px #ffffff44; white-space: nowrap; }
.kpi-app .phong-main-body { padding: 10px 14px 12px; background: #0e2240; }
.kpi-app .phong-main-afyp-row { display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
.kpi-app .phong-main-afyp { font-size: 1.5rem; font-weight: 900; color: #ffe0a0; line-height: 1.1; text-shadow: 0 0 16px #f2b24d33; }
.kpi-app .phong-main-kh { font-size: .75rem; color: #6ab0e8; font-weight: 700; }
.kpi-app .phong-main-prog { width: 100%; height: 6px; border-radius: 99px; overflow: hidden; background: #0a1830; margin-top: 8px; }
.kpi-app .phong-main-prog-fill { width: 0; height: 100%; border-radius: inherit; transition: width 1s cubic-bezier(.22,1,.36,1); background: linear-gradient(90deg, #40d890, #70f0b8); will-change: width; box-shadow: 0 0 8px #40d89044; }
.kpi-app .phong-sub-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
.kpi-app .phong-sub { border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 2px 8px #00000060, 0 0 12px #00000030; }
.kpi-app .phong-sub-head { width: 100%; padding: 5px 3px; text-align: center; }
.kpi-app .phong-sub-label { font-size: 6.5px; font-weight: 900; text-transform: uppercase; color: #fff; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; letter-spacing: .04em; text-shadow: 0 1px 3px #00000066; }
.kpi-app .phong-sub-body { width: 100%; background: #0c1e38; padding: 8px 3px; text-align: center; box-shadow: inset 0 2px 6px #00000044; }
.kpi-app .phong-sub-val { font-size: 14px; font-weight: 900; line-height: 1.1; white-space: nowrap; text-shadow: 0 0 10px currentColor; }
.kpi-app .phong-sub.hd .phong-sub-head { background: #2a6cb8; box-shadow: inset 0 -2px 4px #1a4c8866; } .kpi-app .phong-sub.hd .phong-sub-body { border: 1px solid #2a6cb866; border-top: none; } .kpi-app .phong-sub.hd .phong-sub-val { color: #6cb8f8; }
.kpi-app .phong-sub.td .phong-sub-head { background: #7a68b0; box-shadow: inset 0 -2px 4px #5a489066; } .kpi-app .phong-sub.td .phong-sub-body { border: 1px solid #7a68b066; border-top: none; } .kpi-app .phong-sub.td .phong-sub-val { color: #c0a8f0; }
.kpi-app .phong-sub.chuan .phong-sub-head { background: #208a9a; box-shadow: inset 0 -2px 4px #106a7a66; } .kpi-app .phong-sub.chuan .phong-sub-body { border: 1px solid #208a9a66; border-top: none; } .kpi-app .phong-sub.chuan .phong-sub-val { color: #58d8e8; }
.kpi-app .phong-sub.ip .phong-sub-head { background: #b89838; box-shadow: inset 0 -2px 4px #98782866; } .kpi-app .phong-sub.ip .phong-sub-body { border: 1px solid #b8983866; border-top: none; } .kpi-app .phong-sub.ip .phong-sub-val { color: #f0d060; }
.kpi-app .phong-progress-bar { display: none; }
/* Legacy phong classes hidden on mobile */
.kpi-app .phong-head { display: none; }
.kpi-app .phong-main { display: none; }
.kpi-app .phong-stats { display: none; }
/* Mobile: hide old phong card design, use mob-region-wrap instead */
.kpi-app .kpi-phong { display: none; }

/* Mobile Region - Circular Progress Design */
.kpi-app .mob-region-wrap { display: flex; flex-direction: column; gap: 16px; margin-top: 8px; }
.kpi-app .mob-phong-block { border-radius: 16px; overflow: hidden; box-shadow: 0 6px 28px #00000080; border: 2px solid #3a6a9a; background: #143050; }
/* Phong Header with circle */
.kpi-app .mob-phong-header { display: flex; align-items: center; gap: 12px; padding: 12px 14px 10px; background: linear-gradient(135deg, #1a5080, #143a60); }
.kpi-app .mob-phong-circle-wrap { flex-shrink: 0; position: relative; width: 68px; height: 68px; }
.kpi-app .mob-phong-circle-wrap svg { width: 68px; height: 68px; transform: rotate(-90deg); }
.kpi-app .mob-phong-circle-track { fill: none; stroke: #0a2040; stroke-width: 5; }
.kpi-app .mob-phong-circle-fill { fill: none; stroke-width: 5; stroke-linecap: round; transition: stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1); }
.kpi-app .mob-phong-circle-pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; color: #fff; text-shadow: 0 0 8px #00000088; }
.kpi-app .mob-phong-circle-pct.green { color: #4ade80; text-shadow: 0 0 12px #4ade8044; }
.kpi-app .mob-phong-circle-pct.gold { color: #fbbf24; text-shadow: 0 0 12px #fbbf2444; }
.kpi-app .mob-phong-circle-pct.red { color: #f87171; text-shadow: 0 0 12px #f8717144; }
.kpi-app .mob-phong-header-info { flex: 1; min-width: 0; }
.kpi-app .mob-phong-title { font-size: 13px; font-weight: 900; text-transform: uppercase; color: #e8f4ff; letter-spacing: .06em; display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.kpi-app .mob-phong-afyp-kh { display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
.kpi-app .mob-phong-afyp { font-size: 1.2rem; font-weight: 900; color: #ffe0a0; line-height: 1.1; }
.kpi-app .mob-phong-kh { font-size: .68rem; color: #8ac8f0; font-weight: 700; }
/* Metrics bar - 4 columns */
.kpi-app .mob-phong-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #2a4468; border-top: 1px solid #2a4468; }
.kpi-app .mob-metric { background: #1c3a5c; padding: 8px 4px 7px; text-align: center; display: flex; flex-direction: column; align-items: center; }
.kpi-app .mob-metric-label { font-size: 7px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: #8ab8d8; line-height: 1.2; margin-bottom: 3px; white-space: nowrap; }
.kpi-app .mob-metric-val { font-size: 16px; font-weight: 900; line-height: 1.1; white-space: nowrap; }
.kpi-app .mob-metric-val.hd { color: #6cb8f8; }
.kpi-app .mob-metric-val.td { color: #c0a8f0; }
.kpi-app .mob-metric-val.chuan { color: #58d8e8; }
.kpi-app .mob-metric-val.ip { color: #f0d060; }
/* AD Rows */
.kpi-app .mob-ad-rows { display: flex; flex-direction: column; }
.kpi-app .mob-ad-row { display: grid; grid-template-columns: 44px 44px 1fr repeat(4, 1fr); align-items: center; gap: 0; padding: 7px 10px; border-top: 1px solid #1a3456; background: #162e4c; transition: background .15s; }
.kpi-app .mob-ad-row:hover { background: #1a3a5e; }
.kpi-app .mob-ad-row-name { font-weight: 900; color: #e0f0ff; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kpi-app .mob-ad-row-afyp { font-weight: 900; color: #90d8ff; font-size: 10px; white-space: nowrap; text-align: center; }
.kpi-app .mob-ad-row-kh { font-weight: 700; color: #7ab0d8; font-size: 10px; white-space: nowrap; text-align: center; }
.kpi-app .mob-ad-row-val { font-weight: 700; color: #c0d8f0; font-size: 10px; white-space: nowrap; text-align: center; }
.kpi-app .mob-ad-row-val.ip { color: #f0d060; }
/* Mini circle for AD */
.kpi-app .mob-ad-circle-wrap { position: relative; width: 38px; height: 38px; flex-shrink: 0; }
.kpi-app .mob-ad-circle-wrap svg { width: 38px; height: 38px; transform: rotate(-90deg); }
.kpi-app .mob-ad-circle-track { fill: none; stroke: #0a2040; stroke-width: 3.5; }
.kpi-app .mob-ad-circle-fill { fill: none; stroke-width: 3.5; stroke-linecap: round; transition: stroke-dashoffset 1s cubic-bezier(.22,1,.36,1); }
.kpi-app .mob-ad-circle-pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 900; color: #fff; }
.kpi-app .mob-ad-circle-pct.green { color: #4ade80; }
.kpi-app .mob-ad-circle-pct.gold { color: #fbbf24; }
.kpi-app .mob-ad-circle-pct.red { color: #f87171; }

/* Desktop-only AD table */
.kpi-app .ad-grid { display: none; }
.kpi-app .kpi-ad { display: none; }



/* Navigation */
.kpi-app .nav-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 24px; }
.kpi-app .nav-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; grid-column: 1 / -1; }
.kpi-app .nav-btn { padding: 14px 10px; border-radius: 12px; border: none; cursor: pointer; font-family: inherit; font-weight: 900; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: #fff; display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform .2s; position: relative; overflow: hidden; }
.kpi-app .nav-btn:hover { transform: translateY(-2px); }
.kpi-app .nav-btn:active { transform: scale(.97); }
.kpi-app .nav-btn .nav-icon { font-size: 14px; line-height: 1; }
.kpi-app .nav-detail { background: linear-gradient(135deg, #1e40af, #1e3a8a); box-shadow: 0 6px 18px #1e40af66; }
.kpi-app .nav-plan { background: linear-gradient(135deg, #059669, #065f46); box-shadow: 0 6px 18px #05966966; }
.kpi-app .nav-race { background: linear-gradient(135deg, #0c4a6e, #082f49); box-shadow: 0 6px 18px #0c4a6e80; border: 1.5px solid #38bdf840; }

.kpi-app .nav-clb { background: linear-gradient(135deg, #b45309, #92400e); box-shadow: 0 6px 18px #b4530966; border: 1.5px solid #fbbf2440; }

/* Section Divider */
.kpi-app .section-divider { text-align: center; margin: 20px 0 10px; font-size: 10px; font-weight: 900; color: var(--accent); text-transform: uppercase; letter-spacing: .3em; position: relative; }
.kpi-app .region-divider { display: flex; align-items: center; gap: 10px; margin: 24px 0 12px; }
.kpi-app .region-divider::before, .kpi-app .region-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, #2a5a8a, transparent); }
.kpi-app .region-divider-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .2em; color: #5ee89c; white-space: nowrap; }

/* KPI Stack */
.kpi-app .kpi-stack { display: flex; flex-direction: column; gap: 8px; margin-top: 24px; }
.kpi-app .dept-section { display: flex; flex-direction: column; gap: 0; }

/* === REDESIGN: Region card (sáng hơn, nổi khối 3D) === */
.kpi-app .rg-wrap { display: flex; flex-direction: column; gap: 22px; margin-top: 8px; }
.kpi-app .rg-card {
  background: linear-gradient(180deg, #f4f8fc 0%, #e2ecf6 100%);
  border: 1.5px solid #6a8aaa;
  border-top: 4px solid #3a7cc8;
  border-radius: 6px;
  box-shadow:
    0 1px 0 #ffffff inset,
    0 -2px 4px rgba(180,200,220,.4) inset,
    0 8px 18px rgba(10,30,60,.18),
    0 2px 5px rgba(10,30,60,.14),
    0 12px 28px rgba(20,50,90,.16);
  overflow: hidden;
  animation: cardSlideIn .4s ease-out both;
  transition: transform .2s, box-shadow .2s;
}
.kpi-app .rg-card:hover {
  transform: translateY(-3px);
  box-shadow:
    0 1px 0 #ffffff inset,
    0 -2px 4px rgba(180,200,220,.4) inset,
    0 14px 26px rgba(10,30,60,.24),
    0 4px 8px rgba(10,30,60,.16),
    0 18px 36px rgba(20,50,90,.20);
}
.kpi-app .rg-card.is-banca { border-top-color: #b89838; }
.kpi-app .rg-card.is-pa { border-top-color: #6a88a8; }
.kpi-app .rg-card.glow-full {
  box-shadow: 0 0 0 2px #86efacaa, 0 16px 36px rgba(10,30,60,.28), 0 0 28px #86efac99, 0 0 60px #86efac44;
  border-color: #86efac;
  animation: rgGlowPulse 3s ease-in-out infinite;
}
@keyframes rgGlowPulse {
  0%, 100% { box-shadow: 0 0 0 2px #86efacaa, 0 16px 36px rgba(10,30,60,.28), 0 0 22px #86efac88, 0 0 48px #86efac33; }
  50% { box-shadow: 0 0 0 3px #4ade80cc, 0 16px 36px rgba(10,30,60,.28), 0 0 36px #4ade80aa, 0 0 72px #4ade8055; }
}
.kpi-app .rg-card.glow-full .rg-head {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
  text-shadow: 0 0 12px #86efac66;
}
.kpi-app .rg-card.is-banca.glow-full .rg-head {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
}

/* Phong header (inside rg-card) */
.kpi-app .rg-head {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #3a7cc8 0%, #2a6ab8 100%);
  color: #fff;
}
.kpi-app .rg-card.is-banca .rg-head { background: linear-gradient(135deg, #c89828 0%, #a87818 100%); }
.kpi-app .rg-card.is-pa .rg-head { background: linear-gradient(135deg, #6a88a8 0%, #4a6890 100%); }
.kpi-app .rg-head-left { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; }
.kpi-app .rg-head-name { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: .05em; line-height: 1.2; }
.kpi-app .rg-head-pct { font-size: 18px; font-weight: 900; line-height: 1; white-space: nowrap; }

/* Phong summary row (4 stats) */
.kpi-app .rg-summary {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px;
  background: #c0d4e8;
  border-bottom: 1px solid #c0d4e8;
}
.kpi-app .rg-sum-cell {
  background: #e8f0fa;
  padding: 6px 4px 5px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 44px;
}
.kpi-app .rg-sum-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: #5a78a0; line-height: 1.15; margin-bottom: 2px; white-space: nowrap; }
.kpi-app .rg-sum-val { font-size: 16px; font-weight: 900; line-height: 1.1; white-space: nowrap; }
.kpi-app .rg-sum-val.hd { color: #2563eb; }
.kpi-app .rg-sum-val.td { color: #9333ea; }
.kpi-app .rg-sum-val.chuan { color: #0891b2; }
.kpi-app .rg-sum-val.ip { color: #ea580c; }
.kpi-app .rg-sum-val.afyp { color: #1a4a7a; }
.kpi-app .rg-sum-val.kh { color: #6a8aaa; }

/* Thin separator between summary and AD table */
.kpi-app .rg-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #b8cae0 20%, #b8cae0 80%, transparent 100%);
  margin: 0 12px;
}

/* Banca-PA summary: only 2 columns (Lượt + HĐC) */
.kpi-app .rg-summary.rg-summary-2col {
  grid-template-columns: repeat(2, 1fr);
}

/* AFYP + KH row */
.kpi-app .rg-afyp-row {
  display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e8f0;
}
.kpi-app .rg-afyp { font-size: 1.45rem; font-weight: 900; color: #1a4a7a; line-height: 1.1; }
.kpi-app .rg-afyp-unit { font-size: .55em; font-weight: 700; color: #5a78a0; margin-left: 3px; }
.kpi-app .rg-kh { font-size: 11px; color: #6a8aaa; font-weight: 700; }
.kpi-app .rg-prog { width: 100%; height: 8px; border-radius: 0; overflow: hidden; background: #4a6080; margin: 0 0 10px; }
.kpi-app .rg-prog-fill { height: 100%; border-radius: inherit; transition: width 1s cubic-bezier(.22,1,.36,1); }

/* AD Table (compact, ngay hàng) — 3D raised block, hẹp hơn, viền nhẹ 2 bên */
.kpi-app .rg-ad-wrap {
  background: transparent;
  padding: 8px 7px 10px;
  /* chừa 2 viền nhẹ 2 bên bảng phòng */
}
.kpi-app .rg-ad-table {
  width: calc(100% - 12px); margin: 0 6px; border-collapse: separate; border-spacing: 0; font-size: 11px;
  background: linear-gradient(180deg, #ffffff 0%, #eef4fa 100%);
  border-radius: 3px; overflow: hidden;
  border: 1px solid #c8d8ea;
  box-shadow:
    0 1px 0 #ffffff inset,
    0 -2px 4px #d0deec inset,
    0 3px 7px rgba(20, 50, 90, .10),
    0 1px 2px rgba(20, 50, 90, .08);
}
.kpi-app .rg-ad-table thead th {
  background: linear-gradient(135deg, #3a7cc8 0%, #2a6ab8 100%);
  color: #ffffff;
  font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em;
  padding: 7px 4px; text-align: center; white-space: nowrap;
  border-bottom: 1.5px solid #1a4a7a;
  text-shadow: 0 1px 0 rgba(0,0,0,.25);
}
.kpi-app .rg-ad-table thead th:first-child { text-align: left; padding-left: 10px; }
.kpi-app .rg-ad-table tbody tr { transition: background .15s, box-shadow .15s; }
.kpi-app .rg-ad-table tbody tr:hover {
  background: linear-gradient(180deg, #f0f8ff 0%, #e0ecfa 100%);
  box-shadow: 0 1px 0 #ffffff inset;
}
.kpi-app .rg-ad-table tbody tr:first-child td { border-top: none; }
.kpi-app .rg-ad-table tbody td {
  padding: 8px 4px; text-align: center;
  border-top: 1px solid #d0deec;
  font-weight: 700; color: #2a4a6a; white-space: nowrap;
  background: linear-gradient(180deg, rgba(255,255,255,.5) 0%, rgba(255,255,255,0) 100%);
}
.kpi-app .rg-ad-table tbody td:first-child { text-align: left; padding-left: 10px; }
.kpi-app .rg-ad-name { font-weight: 900; color: #1a3a5e; }
.kpi-app .rg-ad-val { font-weight: 900; text-shadow: 0 1px 0 #ffffff; }
.kpi-app .rg-ad-val.lhd { color: #DC2626; }     /* red - Lượt */
.kpi-app .rg-ad-val.td { color: #DB2777; }      /* pink - TD */
.kpi-app .rg-ad-val.hdc { color: #65A30D; }     /* lime - HĐC */
.kpi-app .rg-ad-val.ip { color: #B45309; }      /* dark amber - IP% */
.kpi-app .rg-ad-pct { font-weight: 900; }
.kpi-app .rg-ad-pct.green { color: #16a34a; }
.kpi-app .rg-ad-pct.gold { color: #d97706; }
.kpi-app .rg-ad-pct.red { color: #dc2626; }
.kpi-app .rg-ad-mini-prog { width: 44px; height: 5px; border-radius: 99px; background: #e0e8f0; display: inline-block; vertical-align: middle; overflow: hidden; }
.kpi-app .rg-ad-mini-prog-fill { height: 100%; border-radius: inherit; transition: width .8s cubic-bezier(.22,1,.36,1); }
.kpi-app .rg-ad-empty { padding: 14px 10px; text-align: center; font-size: 10px; color: #8aa0b8; font-style: italic; }

/* Circular progress for AD row */
.kpi-app .rg-ad-circle { display: inline-block; vertical-align: middle; }
.kpi-app .rg-ad-circle-bg { fill: none; stroke: #e0e8f0; stroke-width: 3; }
.kpi-app .rg-ad-circle-fg { fill: none; stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 1s cubic-bezier(.22,1,.36,1), stroke 0.4s ease; }
.kpi-app .rg-ad-circle-text { font-size: 9px; font-weight: 900; fill: #1a4a7a; text-anchor: middle; dominant-baseline: central; }
.kpi-app .rg-ad-circle-text.green { fill: #166534; }
.kpi-app .rg-ad-circle-text.gold { fill: #b45309; }
.kpi-app .rg-ad-circle-text.red { fill: #b91c1c; }

/* Green checkmark when AD %KH >= 100% */
.kpi-app .rg-ad-checkmark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 50%;
  background: linear-gradient(135deg, #4ade80 0%, #16a34a 100%);
  box-shadow: 0 0 0 2px #4ade8044, 0 0 14px #4ade8088, inset 0 1px 2px #ffffff44;
  animation: rgCheckPulse 2s ease-in-out infinite;
  vertical-align: middle;
}
.kpi-app .rg-ad-checkmark svg { color: #fff; filter: drop-shadow(0 1px 2px #16653444); }
@keyframes rgCheckPulse {
  0%, 100% { box-shadow: 0 0 0 2px #4ade8044, 0 0 12px #4ade8066, inset 0 1px 2px #ffffff44; }
  50% { box-shadow: 0 0 0 4px #4ade8066, 0 0 22px #4ade80aa, inset 0 1px 2px #ffffff66; }
}

/* Banca TVV count (right side of AFYP row) */
.kpi-app .rg-banca-tvv-count {
  font-size: 11px; color: #8a6818; font-weight: 800;
  background: #fff8e0; padding: 4px 10px; border-radius: 99px;
  border: 1px solid #d4b428; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 4px;
}
.kpi-app .rg-banca-tvv-count::before {
  content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%;
  background: #c89828; box-shadow: 0 0 6px #c8982888;
}

/* AD row glow when 100% KH */
.kpi-app .rg-ad-table tbody tr.rg-ad-glow {
  background: linear-gradient(90deg, #ecfdf5 0%, #d1fae5 50%, #ecfdf5 100%) !important;
  box-shadow: inset 0 0 0 1px #4ade80aa, inset 0 0 12px #4ade8033;
  animation: rgAdGlowPulse 3s ease-in-out infinite;
}
@keyframes rgAdGlowPulse {
  0%, 100% { box-shadow: inset 0 0 0 1px #4ade80aa, inset 0 0 10px #4ade8022; }
  50% { box-shadow: inset 0 0 0 2px #16a34acc, inset 0 0 18px #4ade8055; }
}
.kpi-app .rg-ad-table tbody tr.rg-ad-glow td { color: #166534 !important; font-weight: 900; }
.kpi-app .rg-ad-table tbody tr.rg-ad-glow .rg-ad-name { color: #14532d !important; text-shadow: 0 0 8px #4ade8044; }
.kpi-app .rg-ad-table tbody tr.rg-ad-glow .rg-ad-sub { color: #4a7c5a !important; }
.kpi-app .rg-ad-table tbody tr.rg-ad-glow .rg-ad-afyp { color: #166534 !important; }

/* AD name cell: name + small KH under */
.kpi-app .rg-ad-name-cell { display: flex; flex-direction: column; gap: 0; line-height: 1.2; }
.kpi-app .rg-ad-name { font-weight: 900; color: #1a3a5e; }
.kpi-app .rg-ad-sub { font-size: 7px; color: #9aa8be; font-weight: 600; white-space: nowrap; opacity: 0.85; }
.kpi-app .rg-ad-afyp { color: #1a4a7a; font-weight: 900; white-space: nowrap; }
.kpi-app .rg-ad-afyp-unit { font-size: 0.7em; color: #6a8aaa; font-weight: 700; margin-left: 2px; }

/* %KH on progress bar (overlay) */
.kpi-app .rg-ad-prog-cell { position: relative; min-width: 60px; }
.kpi-app .rg-ad-prog-wrap { position: relative; width: 100%; min-width: 50px; }
.kpi-app .rg-ad-pct-on-prog {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  font-size: 9px; font-weight: 900; color: #1a4a7a;
  text-shadow: 0 0 4px #fff, 0 0 4px #fff, 0 0 4px #fff;
  white-space: nowrap; z-index: 2; pointer-events: none;
}
.kpi-app .rg-ad-pct-on-prog.green { color: #0f5132; }
.kpi-app .rg-ad-pct-on-prog.gold { color: #6a4010; }
.kpi-app .rg-ad-pct-on-prog.red { color: #6a1010; }

/* %KH on phong progress bar */
.kpi-app .rg-prog-wrap { position: relative; width: 100%; margin: 0 16px 10px; width: calc(100% - 32px); }
.kpi-app .rg-prog-pct-on-bar {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  font-size: 9px; font-weight: 900; color: #1a4a7a;
  text-shadow: 0 0 4px #fff, 0 0 4px #fff, 0 0 4px #fff;
  white-space: nowrap; z-index: 2;
}

/* Region divider: TIẾN ĐỘ KHU VỰC to + rõ hơn */
.kpi-app .region-divider { display: flex; align-items: center; gap: 14px; margin: 32px 0 18px !important; padding: 0 4px; }
.kpi-app .region-divider::before, .kpi-app .region-divider::after { content: ''; flex: 1; height: 2px; background: linear-gradient(90deg, transparent, #3a7cc8, transparent); }
.kpi-app .region-divider-title {
  font-size: 16px !important; font-weight: 900; text-transform: uppercase; letter-spacing: .15em;
  color: #1a4a7a; white-space: nowrap;
  text-shadow: 0 1px 0 #ffffff, 0 2px 8px #3a7cc833;
  padding: 4px 14px; border-radius: 4px;
  background: linear-gradient(135deg, #e8f0fa 0%, #d4e2f4 100%);
  border: 1px solid #b8cae0;
  box-shadow: 0 2px 8px rgba(10,30,60,.1);
}

/* Mobile compact: smaller fonts/padding */
@media (max-width: 640px) {
  .kpi-app .rg-head { padding: 10px 12px; }
  .kpi-app .rg-head-name { font-size: 11px; }
  .kpi-app .rg-head-pct { font-size: 15px; }
  .kpi-app .rg-afyp { font-size: 1.2rem; }
  .kpi-app .rg-sum-val { font-size: 14px; }
  .kpi-app .rg-sum-label { font-size: 8px; }
  .kpi-app .rg-ad-table thead th { font-size: 8px; padding: 5px 2px; }
  .kpi-app .rg-ad-table tbody td { font-size: 10px; padding: 6px 2px; }
  .kpi-app .rg-ad-mini-prog { width: 36px; }
}

/* Desktop: hide mobile-only region, use rg-wrap */
@media (min-width: 900px) {
  .kpi-app .mob-region-wrap { display: none !important; }
  .kpi-app .mobile-only { display: none !important; }
  .kpi-app .rg-wrap { display: flex; flex-direction: column; gap: 22px; }
  .kpi-app .rg-card { max-width: 900px; margin: 0 auto; }
}


/* Skeleton */
.kpi-app .skel { border-radius: 12px; background: linear-gradient(90deg, #ffffff08 25%, #ffffff0f 50%, #ffffff08 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.kpi-app .skel-cty { height: 140px; margin-bottom: 10px; margin-top: 32px; }
.kpi-app .skel-phong { height: 70px; margin-top: 12px; }
.kpi-app .skel-ad { height: 50px; }

/* Error */
.kpi-app .error-state { background: #ef44440d; border: 1px solid #ef44441f; border-radius: 16px; padding: 40px 20px; text-align: center; }
.kpi-app .error-state p { color: #fca5a5; font-size: 13px; margin-bottom: 16px; }

/* Detail View */
.kpi-app .detail-shell { margin-top: 0; margin-left: auto; margin-right: auto; max-width: 100%; }
.kpi-app .detail-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; position: sticky; top: 0; z-index: 50; padding: 4px 0; }
.kpi-app .btn-back-u { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 9px; border: none; background: rgba(255,255,255,.05); color: var(--muted); cursor: pointer; transition: all .2s; flex-shrink: 0; }
.kpi-app .btn-back-u:hover { color: var(--accent); background: rgba(108,199,138,.1); }
.kpi-app .detail-hero { text-align: center; padding: 0; }
.kpi-app .detail-title { font-size: clamp(1.45rem, 5vw, 2rem); font-weight: 900; text-transform: uppercase; color: #ffb12b; letter-spacing: -.03em; line-height: 1.05; }
.kpi-app .detail-meta { margin-top: 4px; font-size: 12px; color: #7da0cb; font-weight: 500; }
.kpi-app .month-grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; margin-top: 10px; }
.kpi-app .month-cell { padding: 6px 2px 5px; border-radius: 8px; border: 1px solid #008080; background: #0a3434; color: #b9ffff; cursor: pointer; font-family: inherit; text-align: center; transition: all .2s; display: flex; align-items: center; justify-content: center; }
.kpi-app .month-cell:hover { background: #0d4b4b; color: #f3ffff; }
.kpi-app .month-cell.on { background: #008080; color: #003b3b; box-shadow: 0 6px 16px #00808033; }
.kpi-app .month-cell .mc-label { font-size: 9px; font-weight: 800; }
.kpi-app .detail-list-wrap { margin-top: 10px; display: flex; flex-direction: column; gap: 5px; }

/* Detail divider — thin line between top3 and group list */
.kpi-app .detail-divider {
  height: 1px; margin: 14px 8px 10px;
  background: linear-gradient(90deg, transparent 0%, #2a5a8a 20%, #3a7cc8 50%, #2a5a8a 80%, transparent 100%);
  opacity: .6;
}

/* AD Filter — slim dropdown (between top3 and group list) */
.kpi-app .detail-ad-filter-wrap { position: relative; margin: 0 8px 10px; display: flex; justify-content: center; }
.kpi-app .detail-ad-filter-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 28px; padding: 0 12px;
  border-radius: 99px;
  background: rgba(255,255,255,.05); border: 1px solid #2a4a70;
  color: #c0d8f0; font-family: inherit; font-size: 11px; font-weight: 700;
  cursor: pointer; transition: all .2s;
}
.kpi-app .detail-ad-filter-btn:hover { background: rgba(255,255,255,.1); border-color: #3a7cc8; color: #c8e0ff; }
.kpi-app .detail-ad-filter-label { white-space: nowrap; }
.kpi-app .detail-ad-filter-caret { font-size: 9px; color: #6ab0e8; transition: transform .2s; }
.kpi-app .detail-ad-filter-wrap.open .detail-ad-filter-caret { transform: rotate(180deg); }
.kpi-app .detail-ad-filter-overlay { position: fixed; inset: 0; z-index: 60; background: rgba(0,0,0,.35); }
.kpi-app .detail-ad-filter-popup {
  position: absolute; top: calc(100% + 6px); left: 50%; transform: translateX(-50%);
  min-width: 200px; max-width: calc(100vw - 32px); max-height: 280px; overflow-y: auto;
  background: #0f2040ee; border: 1px solid #2a5a8a; border-radius: 10px;
  box-shadow: 0 18px 36px #00000066; backdrop-filter: blur(14px);
  padding: 6px; z-index: 70;
  display: flex; flex-direction: column; gap: 3px;
}
.kpi-app .detail-ad-filter-opt {
  min-height: 32px; padding: 0 12px;
  border-radius: 6px; border: 1px solid transparent;
  background: transparent; color: #c0d8f0;
  font-family: inherit; font-size: 11px; font-weight: 700;
  cursor: pointer; transition: all .15s; text-align: left;
}
.kpi-app .detail-ad-filter-opt:hover { background: #1a3a5e; color: #fff; }
.kpi-app .detail-ad-filter-opt.on { background: linear-gradient(135deg, #3a7cc8, #2a6ab8); color: #fff; border-color: #5090d8; }

/* ============= AD DETAIL POPUP ============= */
.kpi-app .adp-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(4, 24, 40, 0.72);
  backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 12px;
  animation: adpFadeIn .1s ease-out;
}
@keyframes adpFadeIn { from { opacity: 0; } to { opacity: 1; } }

.kpi-app .adp-modal {
  width: 100%; max-width: 1080px; height: calc(100vh - 24px); max-height: 760px;
  background: linear-gradient(180deg, #ffffff 0%, #f0f5fa 100%);
  border-radius: 8px; overflow: hidden;
  box-shadow: 0 16px 40px #00000066, 0 0 0 1px #c8d8ea;
  display: flex; flex-direction: column;
  animation: adpIn .14s cubic-bezier(.22,1,.36,1);
}
@keyframes adpIn {
  from { opacity: 0; transform: translateY(10px) scale(.985); }
  to { opacity: 1; transform: none; }
}

.kpi-app .adp-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 12px;
  background: linear-gradient(135deg, #3a7cc8 0%, #2a6ab8 100%);
  border-bottom: 2px solid #1a4a7a;
  box-shadow: 0 2px 0 #ffffff22 inset, 0 2px 6px #00000022;
  flex-shrink: 0;
}
.kpi-app .adp-header-name {
  color: #fff; font-size: 13px; font-weight: 900;
  text-shadow: 0 1px 0 rgba(0,0,0,.25);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  letter-spacing: .02em;
}
.kpi-app .adp-close {
  flex-shrink: 0; width: 26px; height: 26px; border-radius: 5px;
  background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.25);
  color: #fff; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background .15s, transform .15s;
}
.kpi-app .adp-close:hover { background: rgba(255,255,255,.32); transform: rotate(90deg); }

.kpi-app .adp-body {
  flex: 1; min-height: 0;
  display: grid; grid-template-rows: auto 1fr; gap: 4px;
  padding: 6px 8px 8px;
  overflow: hidden;
}

.kpi-app .adp-top {
  display: flex; flex-direction: column;
  min-height: 0; overflow: hidden;
  border-bottom: 1px solid #c8d8ea;
  padding-bottom: 4px;
}
.kpi-app .adp-top-grid {
  display: grid; grid-template-columns: 1fr 2fr; gap: 8px;
  flex: 1; min-height: 0;
  overflow-y: auto;
}
.kpi-app .adp-bottom {
  display: flex; flex-direction: column; gap: 4px;
  min-height: 0; overflow: hidden;
}
.kpi-app .adp-block { display: flex; flex-direction: column; gap: 4px; min-width: 0; }

.kpi-app .adp-section-label {
  font-size: 10px; font-weight: 800; color: #1a3a5e;
  text-transform: uppercase; letter-spacing: .04em;
  border-left: 3px solid #3a7cc8; padding-left: 6px;
  flex-shrink: 0;
}
.kpi-app .adp-section-name {
  text-transform: none; color: #2a6ab8; font-weight: 900; letter-spacing: 0;
}

.kpi-app .adp-nhom-buttons {
  display: flex; flex-wrap: wrap; gap: 5px;
}
.kpi-app .adp-nhom-btn {
  padding: 5px 12px; border-radius: 6px;
  background: linear-gradient(180deg, #ffffff 0%, #f0f5fa 100%);
  border: 1.5px solid #3a7cc8;
  color: #1a3a5e; font-family: inherit; font-size: 10px; font-weight: 800;
  cursor: pointer; transition: all .12s;
  box-shadow: 0 2px 4px rgba(58, 124, 200, 0.18), inset 0 1px 0 #ffffff;
  white-space: nowrap;
}
.kpi-app .adp-nhom-btn:hover {
  background: #eaf3ff; border-color: #2a6ab8;
  box-shadow: 0 3px 6px rgba(58, 124, 200, 0.25), inset 0 1px 0 #ffffff;
}
.kpi-app .adp-nhom-btn.on {
  background: linear-gradient(135deg, #3a7cc8 0%, #2a6ab8 100%);
  color: #fff; border-color: #1a4a7a;
  box-shadow: 0 3px 8px rgba(58, 124, 200, 0.45), inset 0 1px 0 #ffffff66;
}

.kpi-app .adp-info-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;
}
.kpi-app .adp-info-row {
  background: linear-gradient(180deg, #ffffff 0%, #f4f8fc 100%);
  border: 1.5px solid #3a7cc8; border-radius: 4px;
  padding: 5px 4px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 2px;
  box-shadow: 0 2px 4px rgba(58, 124, 200, 0.15), inset 0 1px 0 #ffffff;
  min-width: 0;
}
.kpi-app .adp-info-key {
  font-size: 8.5px; font-weight: 800; color: #5a7088;
  text-transform: uppercase; letter-spacing: .03em;
  text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  width: 100%;
}
.kpi-app .adp-info-val {
  font-size: 11px; font-weight: 900; color: #1a3a5e;
  text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  width: 100%;
}
.kpi-app .adp-info-row-tvv { grid-column: span 4; }
.kpi-app .adp-info-sub { font-size: 9.5px; font-weight: 700; color: #5a7088; }

.kpi-app .adp-table-wrap {
  flex: 1; min-height: 0;
  border: 1px solid #c8d8ea; border-radius: 4px; overflow: auto;
  box-shadow: 0 2px 6px rgba(20, 50, 90, .12);
  background: #ffffff;
  scrollbar-width: thin;
  scrollbar-color: #b8c8d8 transparent;
}
.kpi-app .adp-table-wrap::-webkit-scrollbar { width: 5px; height: 5px; }
.kpi-app .adp-table-wrap::-webkit-scrollbar-track { background: transparent; }
.kpi-app .adp-table-wrap::-webkit-scrollbar-thumb {
  background: #b8c8d8; border-radius: 3px;
}
.kpi-app .adp-table-wrap::-webkit-scrollbar-thumb:hover { background: #8aa0b8; }
.kpi-app .adp-table {
  width: 100%; border-collapse: separate; border-spacing: 0;
  font-size: 10px;
  background: transparent;
}
.kpi-app .adp-table thead {
  background: #3a7cc8;
  position: sticky; top: 0; z-index: 2;
}
.kpi-app .adp-table thead tr { background: #3a7cc8; }
.kpi-app .adp-table thead th {
  background: #3a7cc8;
  color: #fff; font-weight: 800; text-transform: uppercase; letter-spacing: .03em;
  padding: 5px 4px; text-align: center; white-space: nowrap;
  border-right: 1px solid #2a5a8a;
  border-bottom: 1px solid #2a5a8a;
  font-size: 9px;
}
.kpi-app .adp-table thead th:last-child { border-right: none; }
.kpi-app .adp-table thead tr:nth-child(2) th {
  border-top: 1px solid #2a5a8a;
}
.kpi-app .adp-th-stt { width: 28px; }
.kpi-app .adp-th-code { width: 84px; }
.kpi-app .adp-th-name { min-width: 130px; max-width: 190px; }
.kpi-app .adp-th-pos { width: 30px; }
.kpi-app .adp-th-ip { border-left: 1px solid #2a5a8a; padding: 5px 4px !important; position: relative; }
.kpi-app .adp-th-ip-label { display: inline-block; }
.kpi-app .adp-th-ip-unit {
  position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
  font-style: italic; font-weight: 500;
  font-size: 6.5px; opacity: 0.85;
  pointer-events: none;
}
.kpi-app .adp-th-month { width: 32px; font-size: 9px; padding: 4px 1px; }

.kpi-app .adp-table tbody tr { transition: background .12s; }
.kpi-app .adp-table tbody tr:hover {
  background: linear-gradient(180deg, #f0f8ff 0%, #e0ecfa 100%);
}
.kpi-app .adp-table tbody tr:first-child td { border-top: none; }
.kpi-app .adp-table tbody td {
  padding: 4px 3px; text-align: center;
  border-top: 1px dashed #c8d4e0;
  border-right: 1px solid #d8e2ec;
  font-weight: 700; color: #2a4a6a; white-space: nowrap;
  font-size: 9.5px;
}
.kpi-app .adp-table tbody td:last-child { border-right: none; }
.kpi-app .adp-td-stt { color: #8aa0b8; font-weight: 800; }
.kpi-app .adp-td-code { font-family: monospace; font-size: 8.5px; color: #5a7088; }
.kpi-app .adp-td-name {
  text-align: left !important; color: #1a3a5e; font-weight: 800;
  max-width: 190px; overflow: hidden; text-overflow: ellipsis;
}
.kpi-app .adp-td-pos {
  font-weight: 900; color: #2a6ab8;
  background: #eaf2fb;
  border-left: 1px solid #d0deec; border-right: 1px solid #d0deec;
}
.kpi-app .adp-td-ip { color: #8aa0b8; font-weight: 700; }
.kpi-app .adp-td-ip.has { color: #B45309; font-weight: 900; background: #fff8e8; }
.kpi-app .adp-empty {
  padding: 20px 10px; text-align: center;
  color: #8aa0b8; font-style: italic; font-size: 11px;
}

.kpi-app .rg-ad-row-clickable { cursor: pointer; }
.kpi-app .rg-ad-table tbody tr.rg-ad-row-clickable:hover {
  background: linear-gradient(180deg, #e8f3ff 0%, #d4e5f8 100%) !important;
  box-shadow: inset 0 0 0 1.5px #3a7cc8aa;
}

/* Mobile: shrink everything, fit one viewport, table scrolls internally */
@media (max-width: 720px) {
  .kpi-app .adp-overlay { padding: 4px; }
  .kpi-app .adp-modal {
    max-width: 100%; height: calc(100vh - 8px); max-height: none;
    border-radius: 5px;
  }
  .kpi-app .adp-header { padding: 5px 9px; }
  .kpi-app .adp-header-name { font-size: 11px; }
  .kpi-app .adp-close { width: 22px; height: 22px; }
  .kpi-app .adp-body {
    grid-template-rows: auto 1fr; gap: 3px; padding: 4px 5px 5px;
  }
  .kpi-app .adp-top { padding-bottom: 3px; }
  .kpi-app .adp-top-grid { gap: 5px; }
  .kpi-app .adp-section-label { font-size: 8px; padding-left: 5px; }
  .kpi-app .adp-nhom-btn { padding: 3px 8px; font-size: 8px; }
  .kpi-app .adp-info-grid { gap: 3px; }
  .kpi-app .adp-info-row { padding: 4px 3px; }
  .kpi-app .adp-info-key { font-size: 7px; }
  .kpi-app .adp-info-val { font-size: 9px; }
  .kpi-app .adp-info-sub { font-size: 7.5px; }
  .kpi-app .adp-table { font-size: 8px; }
  .kpi-app .adp-table thead th { padding: 3px 2px; font-size: 7.5px; }
  .kpi-app .adp-th-stt { width: 22px; }
  .kpi-app .adp-th-code { width: 62px; }
  .kpi-app .adp-th-name { min-width: 95px; max-width: 130px; }
  .kpi-app .adp-th-pos { width: 22px; }
  .kpi-app .adp-th-month { width: 22px; padding: 2px 1px; }
  .kpi-app .adp-th-ip-unit { font-size: 5.5px; }
  .kpi-app .adp-table tbody td { padding: 2.5px 2px; font-size: 7.5px; }
  .kpi-app .adp-td-code { font-size: 7px; }
  .kpi-app .adp-td-name { max-width: 130px; }
}


/* Flat detail list — no Phong/AD headers */
.kpi-app .detail-list-flat { gap: 6px; }
.kpi-app .dt-bn-flat { margin: 0; }

/* Flat group item — minimal rounding, compact */
.kpi-app .grp-item-flat {
  border-radius: 3px !important;
  padding: 5px 10px 5px !important;
  gap: 2px !important;
}
.kpi-app .grp-head-line {
  display: flex; align-items: center; gap: 4px;
  flex-wrap: nowrap; overflow: hidden;
  position: relative; z-index: 1;
}
.kpi-app .grp-head-line .grp-name {
  font-size: 11px; flex: 0 1 auto; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.kpi-app .grp-tn-inline {
  font-size: 9px; font-weight: 600; color: #8ab8e0;
  font-style: italic; flex: 1 1 auto; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.kpi-app .grp-head-line .grp-pct {
  font-size: 11px; font-weight: 900; flex-shrink: 0; margin-left: auto;
}
.kpi-app .grp-item-flat .grp-bot-row { margin-top: 1px; }
.kpi-app .grp-item { position: relative; display: flex; flex-direction: column; gap: 3px; padding: 6px 10px 5px; border-radius: 10px; background: #1e2f46; border: 1px solid #008080; overflow: hidden; animation: cardSlideIn .4s ease-out both; transition: transform .2s, border-color .2s; }
.kpi-app .grp-item:hover { border-color: #008080; transform: translateY(-1px); }
.kpi-app .grp-fill { position: absolute; inset: 0 auto 0 0; width: 0; background: linear-gradient(90deg, #2b4a6a, #365d84); opacity: .55; transition: width .9s cubic-bezier(.22,1,.36,1); }
.kpi-app .grp-item.is-top .grp-fill { background: linear-gradient(90deg, #1a5c54, #22796e); opacity: .6; }
.kpi-app .grp-item > * { position: relative; z-index: 1; }
.kpi-app .grp-top-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.kpi-app .grp-name { font-weight: 800; font-size: 12px; color: #e8f0f8; line-height: 1.2; flex: 1; }
.kpi-app .grp-tn-name { font-size: 9px; font-weight: 600; color: #8ab8e0; line-height: 1.2; font-style: italic; }
.kpi-app .grp-pct { font-size: 12px; font-weight: 900; white-space: nowrap; flex-shrink: 0; }
.kpi-app .grp-bot-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.kpi-app .grp-stats-inline { display: inline-flex; align-items: baseline; gap: 3px; white-space: nowrap; }
.kpi-app .grp-stat-main { font-size: 10px; font-weight: 700; color: #b8d0ea; white-space: nowrap; }
.kpi-app .grp-stat-kh { font-size: 10px; font-weight: 600; color: #5a7da0; white-space: nowrap; }
.kpi-app .grp-prog-row { margin-top: 2px; }
.kpi-app .grp-prog { height: 4px; border-radius: 999px; overflow: hidden; background: #ffffff14; width: 100%; }
.kpi-app .grp-prog-fill { height: 100%; width: 0; border-radius: inherit; background: linear-gradient(90deg, #4a9fd4, #7dc8f0); transition: width .9s cubic-bezier(.22,1,.36,1); will-change: width; }
.kpi-app .grp-item.is-top .grp-prog-fill { background: linear-gradient(90deg, #2fbfa8, #4ee8cc); }

/* Detail View Hierarchy */
.kpi-app .dt-phong { margin-top: 14px; border-radius: 10px; overflow: hidden; background: #0e1c30; border: 1px solid #1a3050; }
.kpi-app .dt-phong-head { padding: 8px 12px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; color: #ffe0a0; background: linear-gradient(135deg, #c89828, #a87818); }
.kpi-app .dt-ad { padding: 0 6px; }
.kpi-app .dt-ad-head { padding: 6px 10px; margin-top: 6px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; color: #a0c8f0; border-left: 3px solid #3a7cc8; background: #0a1a2e; border-radius: 0 6px 6px 0; }
.kpi-app .dt-bn { margin-top: 4px; }
.kpi-app .dt-bn .grp-item { margin: 0; }
.kpi-app .dt-tvv-list { padding: 4px 8px 6px 20px; display: flex; flex-wrap: wrap; gap: 3px 8px; background: #0a1525; border-radius: 0 0 8px 8px; }
.kpi-app .dt-tvv { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; line-height: 1.3; }
.kpi-app .dt-tvv-idx { color: #3a5a7a; font-weight: 700; min-width: 10px; }
.kpi-app .dt-tvv-name { color: #c8d8ea; font-weight: 700; }
.kpi-app .dt-tvv-role { font-size: 7px; font-weight: 800; padding: 1px 4px; border-radius: 3px; text-transform: uppercase; letter-spacing: .02em; }
.kpi-app .dt-tvv-role.role-tb { background: #d4a03044; color: #f0d070; }
.kpi-app .dt-tvv-role.role-tn { background: #3a7cc844; color: #7ab8f0; }
.kpi-app .dt-tvv-role.role-tvv { background: #2a4a6044; color: #8aa0b8; }

/* Top 3 Podium */
.kpi-app .top3-section { margin-top: 18px; }
.kpi-app .top3-grid { display: grid; grid-template-columns: 1fr 1.32fr 1fr; gap: 12px; align-items: end; max-width: 700px; margin: 0 auto; }
.kpi-app .top3-card { border-radius: 12px; padding: 12px 8px 10px; text-align: center; animation: cardSlideIn .5s ease-out both; position: relative; overflow: hidden; box-shadow: 0 8px 20px #00000040; }
.kpi-app .top3-rank { font-size: 13px; font-weight: 900; margin-bottom: 6px; display: flex; align-items: center; justify-content: center; gap: 4px; }
.kpi-app .top3-rank-num { font-size: 10px; font-weight: 900; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; line-height: 1; }
.kpi-app .top3-name { font-size: 10px; font-weight: 900; color: #fff8ec; margin-bottom: 5px; line-height: 1.2; padding: 0 2px; text-shadow: 0 1px 1px rgba(0,0,0,.28); }
.kpi-app .top3-val { font-size: 11px; font-weight: 900; color: #fff8ec; margin-bottom: 3px; text-shadow: 0 1px 1px rgba(0,0,0,.24); }
.kpi-app .top3-bar { height: 2px; border-radius: 999px; margin: 5px auto 4px; width: 60%; opacity: .8; }
.kpi-app .top3-pct { font-size: 10px; font-weight: 800; color: rgba(255,248,236,.9); text-shadow: 0 1px 1px rgba(0,0,0,.22); }
.kpi-app .top3-crown { font-size: 14px; margin-bottom: 5px; }
.kpi-app .top3-first { padding-top: 16px; padding-bottom: 14px; z-index: 2; transform: translateY(-6px); }
.kpi-app .top3-first .top3-name { font-size: 11px; }
.kpi-app .top3-first .top3-val { font-size: 13px; }
.kpi-app .t3-gold { background: linear-gradient(145deg, #fff2b6 0%, #e7c76c 18%, #c9942f 38%, #f7df89 56%, #b6801f 78%, #f4d774 100%); border: 1.5px solid #f2d27a; color: #4c3105; }
.kpi-app .t3-gold .top3-rank-num { background: linear-gradient(145deg, #fff3c5, #d6a22d 72%, #b17d1c); color: #4a3005; }
.kpi-app .t3-gold .top3-bar { background: linear-gradient(90deg, transparent, rgba(150,102,18,.85), transparent); }
.kpi-app .t3-gold .top3-name, .kpi-app .t3-gold .top3-val, .kpi-app .t3-gold .top3-pct { color: #4a3005; text-shadow: none; }
.kpi-app .t3-silver { background: linear-gradient(145deg, #f5f8fc 0%, #cfd7e1 22%, #9ca9b6 42%, #edf2f7 58%, #7f8b98 82%, #dfe5eb 100%); border: 1.5px solid #d8e0e8; color: #243240; }
.kpi-app .t3-silver .top3-rank-num { background: linear-gradient(145deg, #ffffff, #b8c2cc 70%, #8a97a5); color: #23303e; }
.kpi-app .t3-silver .top3-bar { background: linear-gradient(90deg, transparent, rgba(78,93,108,.8), transparent); }
.kpi-app .t3-silver .top3-name, .kpi-app .t3-silver .top3-val, .kpi-app .t3-silver .top3-pct { color: #223140; text-shadow: none; }
.kpi-app .t3-bronze { background: linear-gradient(145deg, #f2cfb3 0%, #d49763 20%, #a65e31 42%, #e1ad7d 58%, #7f431f 84%, #c98552 100%); border: 1.5px solid #d6a06f; color: #40200f; }
.kpi-app .t3-bronze .top3-rank-num { background: linear-gradient(145deg, #f4dbc5, #ba7340 72%, #8b4d25); color: #3d1f10; }
.kpi-app .t3-bronze .top3-bar { background: linear-gradient(90deg, transparent, rgba(112,55,23,.82), transparent); }
.kpi-app .t3-bronze .top3-name, .kpi-app .t3-bronze .top3-val, .kpi-app .t3-bronze .top3-pct { color: #3d1f10; text-shadow: none; }

/* Calendar View */
.kpi-app .sub-header { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 0; position: sticky; top: 0; z-index: 50; }
.kpi-app .sub-header .btn-back-u { position: absolute; left: 0; top: 50%; transform: translateY(-50%); }
.kpi-app .sub-title { font-size: clamp(1.45rem, 5vw, 2rem); font-weight: 900; color: #ffb12b; text-transform: uppercase; letter-spacing: -.03em; text-align: center; line-height: 1.05; }
.kpi-app .sub-line-wrap { padding: 0 24px; margin-top: 12px; }
.kpi-app .sub-line { height: 1px; background: linear-gradient(90deg, transparent, #d4a84340, #d4a84366, #d4a84340, transparent); }
.kpi-app .cal-filter { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; margin-top: 14px; }
.kpi-app .cal-fbtn { padding: 7px 2px; border-radius: 7px; border: 1.5px solid #008080; background: #083636; color: #b9ffff; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 9px; text-align: center; transition: all .2s; }
.kpi-app .cal-fbtn:hover { background: #0d4d4d; color: #f3ffff; }
.kpi-app .cal-fbtn.on { background: #008080; color: #003b3b; border-color: #008080; box-shadow: 0 0 14px #0080804d; font-weight: 900; }
.kpi-app .cal-wrap { background: #f7ffff; border-radius: 8px; overflow: hidden; box-shadow: 0 20px 50px #0000004d; border: 1px solid #00808066; border-bottom: 4px solid #008080; margin-top: 16px; }
.kpi-app .cal-head { background: #008080; color: #f7fffe; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; padding: 14px 0; display: grid; grid-template-columns: 54px minmax(0,1fr) 72px; text-align: center; border-radius: 8px 8px 0 0; }
.kpi-app .cal-head span { padding: 0 10px; display: flex; align-items: center; justify-content: center; min-height: 100%; }
.kpi-app .cal-row { display: grid; grid-template-columns: 54px minmax(0,1fr) 72px; gap: 0; border-bottom: 1px dashed #00808055; transition: background .2s; animation: cardSlideIn .4s ease-out both; background: #f7ffff; align-items: stretch; }
.kpi-app .cal-row:hover { background: #eef9f9; }
.kpi-app .cal-row.is-today { background: #e0f2fe; box-shadow: inset 0 0 0 2px #38bdf8; }
.kpi-app .cal-row.is-weekend { background: #e8f4f0; }
.kpi-app .cal-row.is-sunday { background: #f5e8e8; }
.kpi-app .cal-day { padding: 10px 6px; font-weight: 900; font-size: 14px; color: #008080; background: #f1fbfb; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.kpi-app .cal-day-num { line-height: 1; font-size: 14px; }
.kpi-app .cal-day-week { font-size: 9px; font-weight: 700; color: #5a7a99; line-height: 1; }
.kpi-app .cal-row.is-sunday .cal-day { color: #dc2626; background: #fde8e8; }
.kpi-app .cal-row.is-sunday .cal-day-week { color: #dc2626; }
.kpi-app .cal-row.is-weekend .cal-day { color: #ea580c; background: #fff0e0; }
.kpi-app .cal-row.is-weekend .cal-day-week { color: #ea580c; }
.kpi-app .cal-text { border-left: 1px solid #00808055; padding: 9px 10px; font-weight: 600; font-size: 13px; line-height: 1.3; color: #1a2e1a; display: flex; flex-direction: column; justify-content: center; gap: 2px; background: #f7ffff; }
.kpi-app .cal-owner { min-width: 64px; border-left: 1px solid #00808055; padding: 6px 4px; font-size: 10px; color: #2a3a2a; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; text-align: center; background: #f7ffff; word-break: break-word; }
.kpi-app .cal-empty { color: #94a3b8; font-style: italic; }
.kpi-app .cal-line { display: block; }
.kpi-app .cal-line.editable { cursor: pointer; padding: 2px 4px; border-radius: 3px; transition: background .12s; }
.kpi-app .cal-line.editable:hover { background: #fef9c3; box-shadow: 0 0 0 1px #facc15; }
.kpi-app .cal-owner-tag {
  display: inline-block; padding: 2px 5px; border-radius: 3px;
  font-size: 9px; font-weight: 800; line-height: 1.2;
  max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* Settings button (gear, top-right of calendar header) */
.kpi-app .cal-settings-btn {
  margin-left: auto; width: 30px; height: 30px; border-radius: 7px;
  background: #083636; border: 1.5px solid #008080; color: #b9ffff;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .15s;
}
.kpi-app .cal-settings-btn:hover { background: #0d4d4d; color: #f3ffff; }
.kpi-app .cal-settings-btn.authed {
  background: #008080; color: #003b3b; border-color: #008080;
  box-shadow: 0 0 12px #00808066;
}

/* Calendar modals */
.kpi-app .cal-modal-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(4, 24, 40, 0.72); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  animation: calFadeIn .14s ease-out;
}
@keyframes calFadeIn { from { opacity: 0; } to { opacity: 1; } }
.kpi-app .cal-modal {
  width: 100%; max-width: 440px;
  background: linear-gradient(180deg, #ffffff 0%, #f0f5fa 100%);
  border-radius: 10px; overflow: hidden;
  box-shadow: 0 20px 50px #00000066, 0 0 0 1px #c8d8ea;
  animation: calIn .18s cubic-bezier(.22,1,.36,1);
  display: flex; flex-direction: column;
}
@keyframes calIn { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }
.kpi-app .cal-modal-pwd { max-width: 360px; }
.kpi-app .cal-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  background: linear-gradient(135deg, #008080 0%, #006666 100%);
  color: #f7fffe; font-size: 13px; font-weight: 900;
  letter-spacing: .02em;
  border-bottom: 2px solid #004d4d;
}
.kpi-app .cal-modal-x {
  background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.25);
  color: #fff; cursor: pointer; width: 24px; height: 24px; border-radius: 5px;
  font-size: 16px; line-height: 1;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.kpi-app .cal-modal-x:hover { background: rgba(255,255,255,.32); }
.kpi-app .cal-modal-body { padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.kpi-app .cal-modal-hint { font-size: 11px; color: #475569; margin: 0 0 4px; font-weight: 600; }
.kpi-app .cal-pwd-input {
  width: 100%; padding: 9px 12px; border-radius: 6px;
  border: 1.5px solid #c8d8ea; background: #fff;
  font-size: 14px; font-family: monospace; letter-spacing: .2em;
  text-align: center; color: #1a2e1a;
  transition: border-color .12s;
}
.kpi-app .cal-pwd-input:focus { outline: none; border-color: #008080; box-shadow: 0 0 0 3px #00808022; }
.kpi-app .cal-pwd-input.err { border-color: #dc2626; box-shadow: 0 0 0 3px #dc262622; }
.kpi-app .cal-pwd-err { color: #dc2626; font-size: 10.5px; font-weight: 700; text-align: center; }
.kpi-app .cal-field { display: flex; flex-direction: column; gap: 5px; }
.kpi-app .cal-field-label {
  font-size: 10px; font-weight: 800; color: #475569;
  text-transform: uppercase; letter-spacing: .04em;
}
.kpi-app .cal-field-input {
  width: 100%; padding: 8px 10px; border-radius: 6px;
  border: 1.5px solid #c8d8ea; background: #fff;
  font-size: 12px; color: #1a2e1a; font-family: inherit;
  transition: border-color .12s;
}
.kpi-app .cal-field-input:focus { outline: none; border-color: #008080; box-shadow: 0 0 0 3px #00808022; }
.kpi-app .cal-field-textarea {
  width: 100%; min-height: 80px; padding: 8px 10px; border-radius: 6px;
  border: 1.5px solid #c8d8ea; background: #fff;
  font-size: 12px; color: #1a2e1a; font-family: inherit; line-height: 1.4;
  resize: vertical; transition: border-color .12s;
}
.kpi-app .cal-field-textarea:focus { outline: none; border-color: #008080; box-shadow: 0 0 0 3px #00808022; }
.kpi-app .cal-owner-grid {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px;
}
.kpi-app .cal-owner-opt {
  padding: 6px 4px; border-radius: 5px;
  background: #fff; border: 1.5px solid #c8d8ea;
  color: #1a3a5e; font-family: inherit; font-size: 10px; font-weight: 800;
  cursor: pointer; transition: all .12s;
  white-space: nowrap;
}
.kpi-app .cal-owner-opt:hover { background: #f0f7ff; border-color: #5090d8; }
.kpi-app .cal-owner-opt.on { color: #fff; }
.kpi-app .cal-owner-custom { margin-top: 6px; }
.kpi-app .cal-edit-err { color: #dc2626; font-size: 10.5px; font-weight: 700; }
.kpi-app .cal-modal-actions {
  display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px;
}
.kpi-app .cal-modal-save {
  padding: 8px 18px; border-radius: 6px;
  background: linear-gradient(135deg, #008080 0%, #006666 100%);
  color: #f7fffe; border: none; cursor: pointer;
  font-family: inherit; font-size: 12px; font-weight: 900;
  transition: all .12s;
}
.kpi-app .cal-modal-save:hover { box-shadow: 0 3px 10px #00808055; }
.kpi-app .cal-modal-save:disabled { opacity: 0.6; cursor: wait; }
.kpi-app .cal-modal-del {
  padding: 8px 14px; border-radius: 6px;
  background: #fff; border: 1.5px solid #dc2626;
  color: #dc2626; cursor: pointer;
  font-family: inherit; font-size: 12px; font-weight: 800;
  transition: all .12s;
}
.kpi-app .cal-modal-del:hover { background: #dc2626; color: #fff; }
.kpi-app .cal-modal-del:disabled { opacity: 0.6; cursor: wait; }

/* Desktop */
.kpi-app .desktop-split { display: none; }
.kpi-app .dsk-company { display: none; }
.kpi-app .dsk-ad-wrap { display: none; }
.kpi-app .kpi-ad.is-phong { display: none; }
.kpi-app .afyp-chart-wrap { display: none; background: linear-gradient(145deg, #070e1a, #0c1b30, #0a1628); border: 1px solid #1a3355; border-radius: 16px; padding: 16px 18px 18px; box-shadow: 0 12px 40px #00000050; }
.kpi-app .afyp-chart-title { font-size: .82rem; font-weight: 700; color: #a0d4f0; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.kpi-app .afyp-chart { position: relative; width: 100%; height: 240px; }
.kpi-app .afyp-chart svg { width: 100%; height: 100%; }
.kpi-app .afyp-chart-summary { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 14px; }
.kpi-app .sum-item { background: linear-gradient(135deg, #0a1a2e, #0d2240); border: 1px solid #1a3355; border-radius: 10px; padding: 8px 10px; text-align: center; }
.kpi-app .sum-label { font-size: .58rem; font-weight: 700; color: #5a8aaa; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 3px; }
.kpi-app .sum-val { font-size: .85rem; font-weight: 900; color: #e0f0ff; line-height: 1.1; }
.kpi-app .sum-val.green { color: #4ade80; } .kpi-app .sum-val.gold { color: #fbbf24; } .kpi-app .sum-val.red { color: #f87171; }
.kpi-app .chart-legend { display: flex; gap: 12px; margin-top: 14px; justify-content: center; flex-wrap: wrap; }
.kpi-app .legend-item { display: flex; align-items: center; gap: 6px; font-size: .7rem; color: #7aa0be; }
.kpi-app .legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }

@media (min-width: 900px) {
  .kpi-app .mob-region-wrap { display: none; }
  .kpi-app .region-divider { display: flex !important; margin: 24px 0 14px; }
  .kpi-app .afyp-chart-wrap { display: block; }
  .kpi-app .app-wrap { max-width: none; }
  .kpi-app #view-main { display: flex; flex-direction: column; gap: 0; padding: 16px 24px 24px; max-width: none; margin: 0 auto; }
  .kpi-app #view-main header { max-width: 1800px; width: 100%; margin-bottom: 0; }
  .kpi-app .main-header { display: flex; align-items: center; gap: 10px; }
  .kpi-app .main-header > .btn-back-u + div { margin-right: 0; }
  .kpi-app .main-header .btn-back-u { width: 32px; height: 32px; border-radius: 8px; }
  .kpi-app .hero-title { font-size: clamp(1.8rem, 3vw, 2.4rem) !important; margin: 0 !important; }
  .kpi-app .hero-sub { display: none; }
  .kpi-app .ctrl-bar { margin-top: 0 !important; }
  .kpi-app .nav-grid { max-width: 1800px; width: 100%; display: flex; gap: 6px; margin: 12px 0 0; flex-wrap: nowrap; }
  .kpi-app .nav-row-3 { display: contents; }
  .kpi-app .nav-btn { flex: 1; padding: 8px 10px; font-size: 10px; border-radius: 8px; white-space: nowrap; }

  .kpi-app .kpi-cty { display: none !important; }
  .kpi-app .dsk-company { display: flex; flex-direction: column; gap: 0; background: linear-gradient(135deg, #0d2137, #153a5e, #0d2137); border: 1px solid #2e5a8a; border-radius: 16px; overflow: hidden; margin-top: 16px; box-shadow: 0 8px 32px #0008, 0 0 40px #1a5a9a18; }
  .kpi-app .dsk-cty-top { display: flex; align-items: stretch; gap: 4px; padding: 4px; }
  .kpi-app .dsk-cty-left { display: flex; flex-direction: column; min-width: 220px; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
  .kpi-app .dsk-cty-main-head { padding: 8px 16px; background: linear-gradient(135deg, #f2b24d, #d4a030); display: flex; align-items: center; gap: 6px; }
  .kpi-app .dsk-cty-main-label { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; color: #fff; }
  .kpi-app .dsk-cty-main-body { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 14px 18px 14px; background: #132a4a; }
  .kpi-app .dsk-cty-pct { font-size: 2.6rem; font-weight: 900; line-height: 1; color: #ffe0a0; text-shadow: 0 0 20px #f2b24d44; }
  .kpi-app .dsk-cty-prog-wrap { margin-top: 10px; }
  .kpi-app .dsk-cty-prog { width: 100%; height: 8px; border-radius: 99px; background: #0d1e36; overflow: hidden; box-shadow: inset 0 1px 3px #00000044; }
  .kpi-app .dsk-cty-prog-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #40d890, #70f0b8); transition: width 1s cubic-bezier(.22,1,.36,1); box-shadow: 0 0 10px #40d89044; }
  .kpi-app .dsk-cty-afyp { margin-top: 10px; font-size: 1.2rem; font-weight: 900; color: #fff; }
  .kpi-app .dsk-cty-kh { font-size: .72rem; font-weight: 700; color: #6ab0e8; }
  .kpi-app .dsk-cty-right { display: flex; flex-direction: column; flex: 1; gap: 4px; }
  .kpi-app .dsk-cty-tier { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; flex: 1; }
  .kpi-app .dsk-cty-kpi { overflow: hidden; border-radius: 8px; display: flex; flex-direction: column; }
  .kpi-app .dsk-cty-kpi-head { padding: 7px 8px; display: flex; align-items: center; justify-content: center; gap: 4px; }
  .kpi-app .dsk-cty-kpi-label { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; color: #fff; line-height: 1.2; white-space: nowrap; text-align: center; }
  .kpi-app .dsk-cty-kpi-sub { font-size: 0.55em; font-weight: 700; opacity: .75; margin-left: 1px; }
  .kpi-app .dsk-cty-kpi-body { background: #132a4a; flex: 1; display: flex; align-items: center; justify-content: center; padding: 10px 8px; text-align: center; }
  .kpi-app .dsk-cty-kpi-val { font-size: 1.3rem; font-weight: 900; line-height: 1; text-shadow: 0 0 10px currentColor; }
  .kpi-app .dsk-cty-kpi.hd .dsk-cty-kpi-head { background: #3a7cc8; } .kpi-app .dsk-cty-kpi.hd .dsk-cty-kpi-val { color: #7ab8f0; }
  .kpi-app .dsk-cty-kpi.td .dsk-cty-kpi-head { background: #8a7ab8; } .kpi-app .dsk-cty-kpi.td .dsk-cty-kpi-val { color: #b8a8e0; }
  .kpi-app .dsk-cty-kpi.chuan .dsk-cty-kpi-head { background: #2a9aaa; } .kpi-app .dsk-cty-kpi.chuan .dsk-cty-kpi-val { color: #60d0d8; }
  .kpi-app .dsk-cty-kpi.ip .dsk-cty-kpi-head { background: #c8a848; } .kpi-app .dsk-cty-kpi.ip .dsk-cty-kpi-val { color: #f0d070; }
  .kpi-app .dsk-cty-kpi.ns .dsk-cty-kpi-head { background: #5a9a68; } .kpi-app .dsk-cty-kpi.ns .dsk-cty-kpi-val { color: #80d890; }
  .kpi-app .dsk-cty-kpi.dl .dsk-cty-kpi-head { background: #a08050; } .kpi-app .dsk-cty-kpi.dl .dsk-cty-kpi-val { color: #e0b870; }
  .kpi-app .dsk-cty-kpi.sl .dsk-cty-kpi-head { background: #6a88a8; } .kpi-app .dsk-cty-kpi.sl .dsk-cty-kpi-val { color: #a0c0e0; }
  .kpi-app .dsk-cty-kpi.tbtn .dsk-cty-kpi-head { background: #7C3AED; } .kpi-app .dsk-cty-kpi.tbtn .dsk-cty-kpi-val { color: #c4b5fd; }
  .kpi-app .dsk-cty-progress { width: 100%; height: 4px; background: #0d1e36; }
  .kpi-app .dsk-cty-progress-fill { height: 100%; transition: width 1s cubic-bezier(.22,1,.36,1); background: linear-gradient(90deg, #40d890, #70f0b8); box-shadow: 0 0 8px #40d89033; }
  .kpi-app .desktop-split { display: grid; grid-template-columns: 38% 62%; gap: 20px; width: 100%; max-width: 1800px; align-self: center; align-items: start; margin-top: 20px; }
  .kpi-app .split-left { display: none; }
  .kpi-app .split-center { display: flex; flex-direction: column; gap: 0; position: sticky; top: 16px; align-self: start; }
  .kpi-app .split-right { display: flex; flex-direction: column; gap: 0; }
  .kpi-app .afyp-chart { min-height: 320px; }
  .kpi-app .region-divider { display: flex !important; margin: 24px 0 14px; }
  .kpi-app .kpi-phong { display: none !important; }
  .kpi-app .kpi-ad.is-phong { display: block; background: linear-gradient(180deg, #e8f0fa, #d4e2f4); border: 1px solid #7aacdc88; border-top: 3px solid #3a8ad4; border-radius: 14px; padding: 16px 18px 18px; }
  .kpi-app .kpi-ad.is-phong .ad-name { color: #1a4a7a; }
  .kpi-app .kpi-ad.is-phong .ad-pct { color: #1a6ab4; }
  .kpi-app .ad-grid { display: none !important; }
  .kpi-app .dsk-ad-wrap { display: block; margin-top: 8px; }
  .kpi-app .dsk-ad-table { display: table; width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; background: #0a1525; border-radius: 8px; overflow: hidden; border: 1px solid #1a2a44; }
  .kpi-app .dsk-ad-table thead th { padding: 6px 6px 5px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: #6a8aaa; background: #0d1a2e; border-bottom: 1px solid #1a2a44; text-align: center; white-space: nowrap; }
  .kpi-app .dsk-ad-table thead th:first-child { text-align: left; padding-left: 10px; }
  .kpi-app .dsk-ad-table tbody tr { cursor: pointer; transition: background .15s; }
  .kpi-app .dsk-ad-table tbody tr:hover { background: #142440; }
  .kpi-app .dsk-ad-table tbody td { padding: 7px 6px; text-align: center; border-bottom: 1px solid #0f1e34; font-weight: 700; white-space: nowrap; color: #c8d8ea; }
  .kpi-app .dsk-ad-table tbody td:first-child { text-align: left; padding-left: 10px; }
  .kpi-app .dsk-ad-name { font-weight: 900; color: #e0f0ff; }
  .kpi-app .dsk-ad-pct { font-weight: 900; }
  .kpi-app .dsk-ad-pct.green { color: #4ade80; } .kpi-app .dsk-ad-pct.gold { color: #fbbf24; } .kpi-app .dsk-ad-pct.red { color: #f87171; }
  .kpi-app .dsk-ad-mini-prog { width: 40px; height: 4px; border-radius: 99px; background: #1a2a44; display: inline-block; vertical-align: middle; overflow: hidden; }
  .kpi-app .dsk-ad-mini-prog-fill { height: 100%; border-radius: inherit; transition: width .8s cubic-bezier(.22,1,.36,1); }
  /* Desktop detail */
  .kpi-app #view-detail .detail-shell { max-width: 1200px; width: 100%; margin: 0 auto; padding: 16px 24px; }
  .kpi-app #view-detail .detail-list-wrap { display: flex; flex-direction: column; gap: 0; max-width: 1200px; width: 100%; margin: 0 auto; }
  .kpi-app #view-detail .dt-phong { max-width: 800px; width: 100%; margin-left: auto; margin-right: auto; }
  /* Desktop calendar */
  .kpi-app #view-calendar .cal-wrap { max-width: 920px; margin-left: auto; margin-right: auto; }
}
/* Responsive mobile */
@media (max-width: 640px) {
  .kpi-app .ctrl-bar { gap: 6px; margin-top: 10px; }
  .kpi-app .ctrl-select { height: 34px; }
  .kpi-app .ctrl-hint { font-size: 9px; }
  .kpi-app .sync-status { width: 34px; height: 34px; }
  .kpi-app .cty-body { grid-template-columns: 1fr; gap: 10px; }
  .kpi-app .phong-body { grid-template-columns: 1fr; gap: 10px; }
  .kpi-app .phong-main-prog { height: 5px; }
  .kpi-app .phong-sub-grid { grid-template-columns: repeat(4,1fr); gap: 4px; }
  .kpi-app .phong-sub-label { font-size: 5.5px; }
  .kpi-app .phong-sub-val { font-size: 12px; }
  .kpi-app .phong-sub-head { padding: 4px 2px; }
  .kpi-app .phong-sub-body { padding: 6px 2px; }
  .kpi-app .phong-main-name { font-size: 10px; }
  .kpi-app .phong-main-pct { font-size: 15px; }
  .kpi-app .phong-main-afyp { font-size: 1.3rem; }
  .kpi-app .nav-grid { gap: 7px; margin-top: 18px; }
  .kpi-app .nav-btn { padding: 11px 9px; border-radius: 10px; font-size: 10px; min-height: 46px; }
  .kpi-app .ad-top { grid-template-columns: 80px minmax(0, 1fr); gap: 6px; }
  .kpi-app .ad-name { font-size: 11px; }
  .kpi-app .ad-pct { font-size: 11px; }
  .kpi-app .ad-stat-label { font-size: 5.5px; }
  .kpi-app .ad-stat-val { font-size: 9px; }
  .kpi-app .ad-progress { margin-top: 3px; height: 3px; }
  .kpi-app .cal-filter { grid-template-columns: repeat(6, 1fr); gap: 3px; }
  .kpi-app .cal-fbtn { padding: 5px 1px; border-radius: 6px; min-height: 28px; font-size: 8px; }
  .kpi-app .cal-row { grid-template-columns: 46px minmax(0,1fr) 58px; }
  .kpi-app .cal-head { grid-template-columns: 46px minmax(0,1fr) 58px; }
  .kpi-app .month-grid { grid-template-columns: repeat(9, 1fr); gap: 3px; margin-top: 10px; }
  .kpi-app .month-cell { padding: 5px 1px; border-radius: 6px; min-height: 28px; }
  .kpi-app .month-cell .mc-label { font-size: 8px; }
  .kpi-app .main-header .btn-back-u { width: 34px; height: 34px; }
}
`;

/* ================= TYPES ================= */
interface Contract {
  id: string; agentCode: string; agentName: string; position: string;
  ban: string; nhom: string; maNhom: string; maBanNhom: string;
  ad: string; effectiveDate: string; issueDate: string | null; afyp: number; fyp: number;
  pdt10DT: number; tinhLuot3tr: number; ngayBatDauLamViec: string | null;
  thangTD: string | null; namTD: string | null; thangHL: string | null;
}
interface Staff { id: string; agentCode: string; agentName: string; nhom: string; maNhom: string; position: string; startDate: string | null; }
interface Revenue { id: string; month: string; maNhom: string; nhom: string; agentCode: string; agentName: string; totalFYP: number; totalAFYP: number; contractCount: number; activityRounds: number; }
interface LeaderInfo { id: string; agentCode: string; agentName: string; position: string; ban: string; nhom: string; maNhom: string; }
interface CalendarEvent { id: number; title: string; date: string; color: string; owner?: string; }
interface ADStructure { id: string; maAD: string; tenAD: string; maPhong: string; note: string; }
interface PhongStructure { id: string; maPhong: string; tenPhong: string; note: string; }
interface BanNhomStructure { id: string; maBanNhom: string; tenBanNhom: string; maAD: string; ngayBatDau: string; note: string; }
interface TVVStructItem { id: string; agentCode: string; agentName: string; maBanNhom: string; chucVu: string; ngayBatDau: string | null; note: string; }

interface ADData { ten: string; managerKey: string; afyp: number; kh: number; lhd: number; td: number; hdChuan: number; tyTrong: number; }
interface PhongData { ten: string; afyp: number; kh: number; lhd: number; td: number; hdChuan: number; tyTrong: number; ads: ADData[]; noAds: boolean; tvvCount?: number; }
interface TotalData { afyp: number; kh: number; lhd: number; td: number; hdChuan: number; tyTrong: number; totalIP: number; slHD: number; nangSuat: number; doLonHD: number; }
interface GroupDetail { name: string; maBanNhom: string; tenAD: string; maAD: string; tenPhong: string; maPhong: string; afyp: number; kh: number; pct: number; tnName: string; }

/* ================= CONSTANTS ================= */
const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const WEEKDAY_NAMES = ['CN','T2','T3','T4','T5','T6','T7'];

// AD short-name → full name mapping (DB stores short names, display full names)
const AD_FULL_NAME_MAP: Record<string, string> = {
  'AD Uy': 'Trương Quốc Uy',
  'AD Trí': 'Lê Quang Trọng Trí',
  'AD Có': 'Nguyễn Văn Có',
  'AD Long': 'Nguyễn Thanh Long',
  'AD Trang': 'Đàm Thị Hương Trang',
  'AD Danh': 'Đặng Công Danh',
};
const resolveAdName = (adKey: string): string => AD_FULL_NAME_MAP[adKey] || adKey;

/* ================= UTILITIES ================= */
function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const s = String(v).trim().replace(/\s/g, '').replace(/%/g, '');
  if (!s) return 0;
  const n = Number(s.replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}
function fmt(n: number): string { return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0, roundingMode: 'halfEven' }).format(Math.round(n)); }
function fmtBig(v: number): string {
  if (v >= 1e9) return Math.round(v/1e9) + ' tỷ';
  if (v >= 1e6) return (v/1e6).toFixed(0) + ' tr';
  if (v >= 1e3) return (v/1e3).toFixed(0) + 'k';
  return v.toFixed(0);
}
function fmtTyTrong(v: number): string {
  if (!isFinite(v) || isNaN(v)) return '0%';
  if (Math.abs(v % 1) < 0.001) return fmt(Math.round(v)) + '%';
  return v.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '%';
}
function fmtShort(v: number): string {
  if (v >= 1e9) return Math.round(v/1e9) + ' tỷ';
  if (v >= 1e6) return (v/1e6).toFixed(0) + ' tr';
  if (v >= 1e3) return (v/1e3).toFixed(0) + 'k';
  return v.toFixed(0);
}
function progressColor(pct: number): string {
  const p = Math.max(0, Math.min(100, pct || 0));
  const hue = 0 + (120 * (p / 100));
  return `hsl(${hue}, 68%, 52%)`;
}
/* 7-color gradient for circular progress: red → orange → yellow → lime → green → cyan → blue */
function circleColor(pct: number): string {
  const p = Math.max(0, Math.min(pct || 0, 150));
  if (p >= 100) return '#4ade80';
  if (p >= 85) return '#22d3ee';
  if (p >= 70) return '#34d399';
  if (p >= 55) return '#a3e635';
  if (p >= 40) return '#facc15';
  if (p >= 25) return '#fb923c';
  return '#f87171';
}
/* SVG circle stroke-dasharray helper: returns { dasharray, dashoffset } for a circle of given radius at given pct */
function circleStroke(radius: number, pct: number) {
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.max(0, Math.min(pct || 0, 150));
  const fill = (clampedPct / 100) * circumference;
  return { dasharray: circumference, dashoffset: circumference - fill };
}
function glowCls(pct: number): string { return pct >= 100 ? ' glow-full' : ''; }
function pctClass(pct: number): string { return pct >= 100 ? 'green' : pct >= 75 ? 'gold' : 'red'; }
function normKey(v: string): string {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/Đ/g,'D').replace(/đ/g,'d').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
function getMonthFromDate(d: string | null | undefined): string {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
  } catch { return ''; }
}
function getMonthNum(d: string | null | undefined): number {
  if (!d) return 0;
  try { const dt = new Date(d); return isNaN(dt.getTime()) ? 0 : dt.getMonth() + 1; } catch { return 0; }
}
// Get doanh so month from issueDate (Ngày PH), fallback effectiveDate (Ngày HL) — same as quan-ly
function getDoanhSoMonth(c: { issueDate: string | null; effectiveDate: string }): Date {
  const issueD = c.issueDate ? new Date(c.issueDate) : null;
  if (issueD && !isNaN(issueD.getTime())) return issueD;
  return new Date(c.effectiveDate);
}
// Format currency in compact form (trđ, tỷ)
function formatKpiCurrency(amount: number): string {
  if (amount >= 1_000_000_000) return `${Math.round(amount / 1_000_000_000)} tỷ`;
  if (amount >= 1_000_000) return `${Math.round(amount / 1_000_000)} trđ`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)} ngàn`;
  return amount.toFixed(0);
}
// Period-to-months mapping — same as quan-ly page
function getPeriodMonths(period: string): number[] {
  if (period.startsWith('month-')) return [parseInt(period.split('-')[1])];
  if (period === 'q1') return [1,2,3];
  if (period === 'q2') return [4,5,6];
  if (period === 'q3') return [7,8,9];
  if (period === 'q4') return [10,11,12];
  if (period === 'h1') return [1,2,3,4,5,6];
  if (period === 'h2') return [7,8,9,10,11,12];
  if (period === 'year') return [1,2,3,4,5,6,7,8,9,10,11,12];
  return [1,2,3,4,5,6,7,8,9,10,11,12];
}
function getPeriodLabel(period: string): string {
  if (period.startsWith('month-')) return `T${period.split('-')[1]}`;
  if (period.startsWith('q')) return period.replace('q', 'Q').toUpperCase();
  if (period === 'h1') return 'H1';
  if (period === 'h2') return 'H2';
  if (period === 'year') return 'Cả năm';
  return period;
}

/* ================= ANIMATION HOOKS ================= */
function useAnimateValue(ref: React.RefObject<HTMLElement | null>, end: number, dur = 900) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let st: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!st) st = ts;
      const p = Math.min((ts - st) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.floor(end * ease));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ref, end, dur]);
}

function useAnimatePct(ref: React.RefObject<HTMLElement | null>, target: number, dur = 900, dec = 0) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let st: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!st) st = ts;
      const p = Math.min((ts - st) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * ease).toFixed(dec) + '%';
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ref, target, dur, dec]);
}

/* ================= ANIMATED NUMBER COMPONENT ================= */
function AnimNum({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useAnimateValue(ref, value);
  return <span ref={ref} className={className}>0</span>;
}
function AnimPct({ value, dec = 0, className }: { value: number; dec?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useAnimatePct(ref, value, 900, dec);
  return <span ref={ref} className={className}>0%</span>;
}

/* ================= MAIN COMPONENT ================= */
export default function KPIDashboard() {
  const router = useRouter();
  const [rawData, setRawData] = useState<{
    contracts: Contract[]; staff: Staff[]; revenue: Revenue[];
    leaders: LeaderInfo[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [view, setView] = useState<'main' | 'detail' | 'calendar'>('main');
  const [selectedKy, setSelectedKy] = useState('');
  const [kyDropdownOpen, setKyDropdownOpen] = useState(false);
  const [detailMonth, setDetailMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [detailAdFilter, setDetailAdFilter] = useState<string>('all'); // AD filter for detail view
  const [detailAdDropdownOpen, setDetailAdDropdownOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  // Calendar edit popup state (settings button locked with password)
  const [calAuthed, setCalAuthed] = useState(false);
  const [calPwdOpen, setCalPwdOpen] = useState(false);
  const [calPwdInput, setCalPwdInput] = useState('');
  const [calPwdError, setCalPwdError] = useState(false);
  const [calEditOpen, setCalEditOpen] = useState(false);
  const [calEditForm, setCalEditForm] = useState<{ id: number | null; date: string; title: string; owner: string; ownerCustom: string }>({ id: null, date: '', title: '', owner: '', ownerCustom: '' });
  const [calEditSaving, setCalEditSaving] = useState(false);
  const [calEditError, setCalEditError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [overviewPeriod, setOverviewPeriod] = useState<string>(`month-${new Date().getMonth() + 1}`);
  const [onlineSettings, setOnlineSettings] = useState<Record<string, string>>({});
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [adStructList, setAdStructList] = useState<ADStructure[]>([]);
  const [phongStructList, setPhongStructList] = useState<PhongStructure[]>([]);
  const [banNhomStructList, setBanNhomStructList] = useState<BanNhomStructure[]>([]);
  const [tvvStructList, setTvvStructList] = useState<TVVStructItem[]>([]);

  /* AD detail popup state */
  const [adPopup, setAdPopup] = useState<{ maAD: string; tenAD: string } | null>(null);
  const [adPopupNhom, setAdPopupNhom] = useState<string | null>(null);

  const NOW = useMemo(() => new Date(), []);
  const CUR_YEAR = NOW.getFullYear();
  const CUR_MONTH = String(NOW.getMonth() + 1).padStart(2, '0');

  /* Fetch data */
  const fetchData = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/quan-ly/all');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setRawData(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Fetch online settings (KPI targets from quan-ly) */
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : {})
      .then(data => setOnlineSettings(data))
      .catch(() => setOnlineSettings({}));
  }, []);

  /* Fetch AD/Phong/BanNhom/TVV structure — same as quan-ly page */
  useEffect(() => {
    Promise.all([
      fetch('/api/structure/ad').then(r => r.ok ? r.json() : []),
      fetch('/api/structure/phong').then(r => r.ok ? r.json() : []),
      fetch('/api/structure/bannhom').then(r => r.ok ? r.json() : []),
      fetch('/api/structure/tvv').then(r => r.ok ? r.json() : []),
    ]).then(([ads, phongs, bannhoms, tvvs]) => {
      setAdStructList(ads);
      setPhongStructList(phongs);
      setBanNhomStructList(bannhoms);
      setTvvStructList(tvvs);
    }).catch(() => {});
  }, []);

  /* Fetch calendar events */
  const refreshCalendarEvents = useCallback(() => {
    const year = CUR_YEAR;
    const month = `${year}-${calMonth}`;
    fetch(`/api/calendar?month=${month}`).then(r => r.ok ? r.json() : []).then(setCalendarEvents).catch(() => setCalendarEvents([]));
  }, [calMonth, CUR_YEAR]);

  useEffect(() => {
    if (view !== 'calendar') return;
    refreshCalendarEvents();
  }, [view, calMonth, CUR_YEAR, refreshCalendarEvents]);

  /* Calendar edit handlers */
  const CAL_OWNERS = ['Công ty', 'HTKD', 'PTKD', 'DVKH'];
  const CAL_OWNER_COLORS: Record<string, string> = {
    'Công ty': '#7c3aed', // purple
    'HTKD':    '#0ea5e9', // sky blue
    'PTKD':    '#16a34a', // green
    'DVKH':    '#ea580c', // orange
  };
  const getOwnerColor = (owner: string) => CAL_OWNER_COLORS[owner] || '#475569'; // slate for custom/other

  const openCalPwd = () => {
    if (calAuthed) { setCalEditOpen(true); return; }
    setCalPwdOpen(true); setCalPwdInput(''); setCalPwdError(false);
  };

  const submitCalPwd = () => {
    if (calPwdInput === '123456') {
      setCalAuthed(true); setCalPwdOpen(false); setCalPwdInput(''); setCalPwdError(false);
      // Open edit popup for new entry by default
      setCalEditForm({ id: null, date: `${CUR_YEAR}-${calMonth}-01`, title: '', owner: '', ownerCustom: '' });
      setCalEditOpen(true);
    } else {
      setCalPwdError(true);
    }
  };

  const openCalEditFor = (ev: CalendarEvent) => {
    const isCustom = !!ev.owner && !CAL_OWNERS.includes(ev.owner);
    setCalEditForm({
      id: ev.id,
      date: ev.date,
      title: ev.title,
      owner: isCustom ? '__other' : (ev.owner || ''),
      ownerCustom: isCustom ? (ev.owner || '') : '',
    });
    setCalEditError(null);
    setCalEditOpen(true);
  };

  const openCalEditForNew = () => {
    setCalEditForm({ id: null, date: `${CUR_YEAR}-${calMonth}-01`, title: '', owner: '', ownerCustom: '' });
    setCalEditError(null);
    setCalEditOpen(true);
  };

  const saveCalEdit = async () => {
    if (!calEditForm.date || !calEditForm.title.trim()) {
      setCalEditError('Vui lòng nhập ngày và nội dung.');
      return;
    }
    const owner = calEditForm.owner === '__other' ? calEditForm.ownerCustom.trim() : calEditForm.owner;
    setCalEditSaving(true);
    setCalEditError(null);
    try {
      const method = calEditForm.id ? 'PUT' : 'POST';
      const body: any = { title: calEditForm.title.trim(), date: calEditForm.date, color: '#00ff88', owner };
      if (calEditForm.id) body.id = calEditForm.id;
      const res = await fetch('/api/calendar', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      await refreshCalendarEvents();
      setCalEditOpen(false);
    } catch (e) {
      setCalEditError('Lỗi khi lưu. Vui lòng thử lại.');
    } finally {
      setCalEditSaving(false);
    }
  };

  const deleteCalEdit = async () => {
    if (!calEditForm.id) return;
    if (!confirm('Xóa kế hoạch này?')) return;
    setCalEditSaving(true);
    try {
      const res = await fetch(`/api/calendar?id=${calEditForm.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      await refreshCalendarEvents();
      setCalEditOpen(false);
    } catch (e) {
      setCalEditError('Lỗi khi xóa. Vui lòng thử lại.');
    } finally {
      setCalEditSaving(false);
    }
  };

  /* Period list */
  const kyList = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    for (let m = 1; m <= 12; m++) {
      const mk = `${CUR_YEAR}-${String(m).padStart(2, '0')}`;
      if (!seen.has(mk)) { seen.add(mk); list.push(mk); }
    }
    return list;
  }, [CUR_YEAR]);

  useEffect(() => {
    if (!selectedKy && kyList.length) {
      const dk = `${CUR_YEAR}-${CUR_MONTH}`;
      setSelectedKy(kyList.includes(dk) ? dk : kyList[0]);
    }
  }, [kyList, selectedKy, CUR_YEAR, CUR_MONTH]);

  /* Compute dashboard data — using same logic as quan-ly page */
  const dashboard = useMemo(() => {
    if (!rawData) return null;
    const { contracts, staff, revenue } = rawData;

    const currentYear = new Date().getFullYear();
    // Filter contracts for current year using getDoanhSoMonth (same as quan-ly)
    const yearContracts = contracts.filter(c => {
      const d = getDoanhSoMonth(c);
      return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
    });

    // Apply period filter
    const periodMonths = getPeriodMonths(overviewPeriod);
    const periodContracts = yearContracts.filter(c => {
      const d = getDoanhSoMonth(c);
      return periodMonths.includes(d.getMonth() + 1);
    });

    // ========== KH (Kế hoạch) AFYP — from online settings, same keys as quan-ly ==========
    const adPlans = new Map<string, number>();
    adStructList.forEach(ad => {
      const val = parseFloat(onlineSettings[`nmc-kh-ad-${ad.maAD}`] || '0') || 0;
      adPlans.set(ad.maAD, val);
    });
    const targetTongAFYP = adStructList.reduce((s, ad) => s + (adPlans.get(ad.maAD) || 0), 0);

    // Helper: tính period KH cho 1 annual KH (dùng monthly ratios)
    const calcPeriodKh = (annualKh: number): number => {
      if (annualKh <= 0) return 0;
      let k = 0;
      periodMonths.forEach(m => {
        const mm = String(m).padStart(2, '0');
        const ratio = parseFloat(onlineSettings[`nmc-kh-ratio-${mm}`] || '0') || 0;
        if (ratio > 0) k += annualKh * ratio / 100;
      });
      return k;
    };

    // ========== Build lookups: BanNhom → AD, AD → Phong ==========
    const phongNameMap = new Map<string, string>();
    phongStructList.forEach(p => phongNameMap.set(p.maPhong, p.tenPhong));

    const adToPhongMap = new Map<string, { maPhong: string; tenPhong: string; tenAD: string }>();
    adStructList.forEach(ad => {
      const pName = phongNameMap.get(ad.maPhong) || '';
      adToPhongMap.set(ad.maAD, { maPhong: ad.maPhong, tenPhong: pName, tenAD: ad.tenAD });
    });

    const bnToAdMap = new Map<string, { maAD: string; tenAD: string; maPhong: string; tenPhong: string }>();
    banNhomStructList.forEach(bn => {
      const adInfo = adToPhongMap.get(bn.maAD);
      if (adInfo) {
        bnToAdMap.set(bn.maBanNhom, { maAD: bn.maAD, tenAD: adInfo.tenAD, maPhong: adInfo.maPhong, tenPhong: adInfo.tenPhong });
      }
    });

    // ========== TVV tuyển dụng trong period — theo AD/Phong ==========
    const tvvInPeriodByAD = new Map<string, number>();
    const tvvInPeriodByPhong = new Map<string, number>();
    let tvvInPeriodTotal = 0;

    tvvStructList.forEach(t => {
      if (!t.ngayBatDau) return;
      const d = new Date(t.ngayBatDau);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() !== currentYear) return;
      if (!periodMonths.includes(d.getMonth() + 1)) return;

      const adInfo = bnToAdMap.get(t.maBanNhom);
      if (!adInfo) return;

      tvvInPeriodTotal++;
      tvvInPeriodByAD.set(adInfo.maAD, (tvvInPeriodByAD.get(adInfo.maAD) || 0) + 1);
      tvvInPeriodByPhong.set(adInfo.maPhong, (tvvInPeriodByPhong.get(adInfo.maPhong) || 0) + 1);
    });

    // ========== PA / Banca detection helpers ==========
    const isPaCode = (code: string): boolean => {
      if (!code) return false;
      const c = String(code).trim();
      return c === 'PA' || c === 'U104101014' || c.toLowerCase() === 'pa';
    };
    const isBancaCode = (code: string): boolean => {
      if (!code) return false;
      const c = String(code).trim();
      return c === 'Banca' || c === 'A473DSO000' || c === 'DSO' || c.toLowerCase() === 'banca' || c.toLowerCase() === 'dso';
    };
    const isPaOrBanca = (code: string): boolean => isPaCode(code) || isBancaCode(code);

    // ========== Count TVV in PA only (for Banca-PA card display) ==========
    // User requirement: count TVV whose AD belongs to PHÒNG PA (not Banca)
    let paTvvCount = 0;
    tvvStructList.forEach(t => {
      const adInfo = bnToAdMap.get(t.maBanNhom);
      if (!adInfo) return;
      if (isPaCode(adInfo.maPhong) || isPaCode(adInfo.tenPhong)) {
        paTvvCount++;
      }
    });

    // ========== Per-Phong and per-AD data ==========
    const phongs: PhongData[] = [];
    let bancaPaPhong: PhongData | null = null;
    let bancaPaIpSum = 0;
    const bancaPaContractIds = new Set<string>();

    for (const phongStruct of phongStructList) {
      const pName = phongStruct.tenPhong;

      // PA or Banca → merge into Banca - PA
      if (isPaOrBanca(phongStruct.maPhong) || isPaOrBanca(pName)) {
        if (!bancaPaPhong) {
          bancaPaPhong = { ten: 'Banca - PA', afyp: 0, kh: 0, lhd: 0, td: 0, hdChuan: 0, tyTrong: 0, ads: [], noAds: true, tvvCount: paTvvCount };
        }
        // Match contracts by nhom / ban / maNhom / ad containing PA / Banca / DSO / PGB
        const paContracts = periodContracts.filter(c => {
          if (isPaOrBanca(c.nhom || '') || isPaOrBanca(c.ban || '') || isPaOrBanca(c.maNhom || '')) return true;
          // Match contracts with ad = 'Banca - PA' or contains 'Banca'
          const adNorm = normKey(c.ad || '');
          if (adNorm.includes('BANCAPA') || adNorm.includes('BANCA')) return true;
          // Match contracts with ban field containing PGB (PGB = Phát hành Banca)
          const banNorm = normKey(c.ban || '');
          if (banNorm.includes('PGB')) return true;
          const nhomNorm = normKey(c.nhom || '');
          if (nhomNorm.includes('BANCA') || nhomNorm.includes('DSO')) return true;
          const maNhomNorm = normKey(c.maNhom || '');
          if (maNhomNorm.includes('BANCA') || maNhomNorm.includes('DSO')) return true;
          return false;
        });

        // Add only contracts not already counted
        const newContracts = paContracts.filter(c => !bancaPaContractIds.has(c.id));
        newContracts.forEach(c => bancaPaContractIds.add(c.id));

        if (bancaPaPhong) {
          bancaPaPhong.afyp += newContracts.reduce((s, c) => s + num(c.afyp), 0);
          bancaPaIpSum += newContracts.reduce((s, c) => s + num(c.pdt10DT), 0);
          bancaPaPhong.lhd += newContracts.filter(c => num(c.tinhLuot3tr) >= 3000000).length;
          bancaPaPhong.hdChuan += newContracts.filter(c => num(c.tinhLuot3tr) >= 12000000).length;
          bancaPaPhong.td += tvvInPeriodByPhong.get(phongStruct.maPhong) || 0;
          bancaPaPhong.tyTrong = bancaPaPhong.afyp > 0 ? (bancaPaIpSum / bancaPaPhong.afyp * 100) : 0;
        }
        continue;
      }

      // Regular phong with ADs
      const p: PhongData = { ten: pName, afyp: 0, kh: 0, lhd: 0, td: 0, hdChuan: 0, tyTrong: 0, ads: [], noAds: false };
      let pIpSum = 0;

      const phongADs = adStructList.filter(a => a.maPhong === phongStruct.maPhong);

      phongADs.forEach(adStruct => {
        const adKey = adStruct.tenAD;
        const adNormKey = normKey(adKey);

        // Display short name ("AD Uy"); resolve full name ONLY for contract matching
        const displayName = adKey;
        const leader = rawData.leaders.find(l => normKey(l.agentName).includes(adNormKey) || adNormKey.includes(normKey(l.agentName)));
        const matchName = leader?.agentName || resolveAdName(adKey);
        const matchNormKey = normKey(matchName);

        // Find contracts for this AD — match by normalized name (both adKey and resolved full name)
        // Contracts' ad field stores FULL name (e.g. "Trương Quốc Uy"), adKey may be short ("AD Uy")
        const adContracts = periodContracts.filter(c => {
          const cAdNorm = normKey(c.ad || '');
          if (!cAdNorm) return false;
          return cAdNorm === adNormKey || cAdNorm.includes(adNormKey) || adNormKey.includes(cAdNorm)
            || cAdNorm === matchNormKey || cAdNorm.includes(matchNormKey) || matchNormKey.includes(cAdNorm);
        });

        const afyp = adContracts.reduce((s, c) => s + num(c.afyp), 0);
        const ip = adContracts.reduce((s, c) => s + num(c.pdt10DT), 0);
        const lhd = adContracts.filter(c => num(c.tinhLuot3tr) >= 3000000).length;
        const td = tvvInPeriodByAD.get(adStruct.maAD) || 0;
        const hdChuan = adContracts.filter(c => num(c.tinhLuot3tr) >= 12000000).length;
        const tyTrong = afyp > 0 ? (ip / afyp * 100) : 0;

        const adKh = adPlans.get(adStruct.maAD) || 0;
        const adPeriodKh = calcPeriodKh(adKh);

        const d: ADData = { ten: displayName, managerKey: adKey, afyp, kh: adPeriodKh, lhd, td, hdChuan, tyTrong };
        p.ads.push(d);
        p.afyp += afyp; p.kh += adPeriodKh; p.lhd += lhd; p.td += td; p.hdChuan += hdChuan;
        pIpSum += ip;
      });

      p.tyTrong = p.afyp > 0 ? (pIpSum / p.afyp * 100) : 0;
      phongs.push(p);
    }

    if (bancaPaPhong) {
      phongs.push(bancaPaPhong);
    }

    // ========== Company total = SUM OF ALL PHONGS (ensure consistency) ==========
    const totalAFYP = phongs.reduce((s, p) => s + p.afyp, 0);
    const totalKH = phongs.reduce((s, p) => s + p.kh, 0);
    const totalLhd = phongs.reduce((s, p) => s + p.lhd, 0);
    const totalTd = phongs.reduce((s, p) => s + p.td, 0);
    const totalHdChuan = phongs.reduce((s, p) => s + p.hdChuan, 0);

    const totalIP = periodContracts.reduce((s, c) => s + num(c.pdt10DT), 0);
    const slHD = periodContracts.length;
    const ipAfypRatio = totalAFYP > 0 ? (totalIP / totalAFYP) * 100 : 0;

    const total: TotalData = {
      afyp: totalAFYP,
      kh: totalKH,
      lhd: totalLhd,
      td: totalTd,
      hdChuan: totalHdChuan,
      tyTrong: ipAfypRatio,
      totalIP,
      slHD,
      nangSuat: totalLhd > 0 ? slHD / totalLhd : 0,
      doLonHD: totalLhd > 0 ? totalAFYP / totalLhd : 0,
    };

    return { total, phongs, periodContracts };
  }, [rawData, overviewPeriod, onlineSettings, adStructList, phongStructList, banNhomStructList, tvvStructList]);

  /* Compute detail data */
  const detailData = useMemo(() => {
    if (!rawData) return [];
    const { contracts } = rawData;

    // Determine which months to include based on detailMonth filter
    let selectedMonths: number[];
    if (detailMonth === 'H1') selectedMonths = [1,2,3,4,5,6];
    else if (detailMonth === 'Q1') selectedMonths = [1,2,3];
    else if (detailMonth === 'Q2') selectedMonths = [4,5,6];
    else if (detailMonth === 'Q3') selectedMonths = [7,8,9];
    else if (detailMonth === 'Q4') selectedMonths = [10,11,12];
    else if (detailMonth === 'Y') selectedMonths = [1,2,3,4,5,6,7,8,9,10,11,12];
    else { const m = parseInt(detailMonth, 10); selectedMonths = m ? [m] : [1,2,3,4,5,6,7,8,9,10,11,12]; }

    // Get period contracts using getDoanhSoMonth (same as main dashboard)
    const yearContracts = contracts.filter(c => {
      const d = getDoanhSoMonth(c);
      return !isNaN(d.getTime()) && d.getFullYear() === CUR_YEAR;
    });
    const periodContracts = yearContracts.filter(c => {
      const d = getDoanhSoMonth(c);
      return selectedMonths.includes(d.getMonth() + 1);
    });

    // Load BanNhom KH from settings (same as quan-ly)
    const nhomPlans = new Map<string, number>();
    banNhomStructList.forEach(bn => {
      const val = parseFloat(onlineSettings[`nmc-kh-nhom-${bn.maBanNhom}`] || '0') || 0;
      nhomPlans.set(bn.maBanNhom, val);
    });

    // Build GroupDetail items from DB structure (Phong > AD > BanNhom)
    const items: GroupDetail[] = [];

    for (const phongStruct of phongStructList) {
      const phongADs = adStructList.filter(a => a.maPhong === phongStruct.maPhong);

      for (const adStruct of phongADs) {
        const adBannhoms = banNhomStructList.filter(bn => bn.maAD === adStruct.maAD);

        for (const bn of adBannhoms) {
          // Find contracts for this BanNhom via maBanNhom
          const bnContracts = periodContracts.filter(c => {
            const cMaBN = c.maBanNhom || '';
            return cMaBN === bn.maBanNhom;
          });

          // Also try matching by nhom name if maBanNhom is empty
          const bnContractsByName = bnContracts.length > 0 ? bnContracts : periodContracts.filter(c => {
            const cNhom = normKey(c.nhom || '');
            const bnName = normKey(bn.tenBanNhom);
            return cNhom && (cNhom === bnName || cNhom.includes(bnName) || bnName.includes(cNhom));
          });

          const afyp = bnContractsByName.reduce((s, c) => s + num(c.afyp), 0);
          const afypTrd = Math.round(afyp / 1000000);

          // KH for this BanNhom — annual × monthly ratios for selected period
          const annualKh = nhomPlans.get(bn.maBanNhom) || 0;
          let periodKh = 0;
          if (annualKh > 0) {
            selectedMonths.forEach(m => {
              const mm = String(m).padStart(2, '0');
              const ratio = parseFloat(onlineSettings[`nmc-kh-ratio-${mm}`] || '0') || 0;
              if (ratio > 0) periodKh += annualKh * ratio / 100;
            });
          }
          const khTrd = Math.round(periodKh / 1000000);
          const pct = khTrd ? (afypTrd / khTrd * 100) : 0;

          // Get TN (Trưởng Nhóm/Ban) only — no TVV as per user request
          const chucVuOrder: Record<string, number> = { 'Trưởng Ban': 1, 'Trưởng nhóm': 2, 'Tiền trưởng nhóm': 3 };
          const bnTNs = tvvStructList.filter(t =>
            t.maBanNhom === bn.maBanNhom &&
            (normKey(t.chucVu).includes('TRUONG') || normKey(t.chucVu).includes('TN'))
          ).sort((a, b) => (chucVuOrder[a.chucVu] ?? 99) - (chucVuOrder[b.chucVu] ?? 99));

          // Get TN name for display (first TN found)
          const tnName = bnTNs.length > 0 ? bnTNs[0].agentName : '';

          items.push({
            name: bn.tenBanNhom,
            maBanNhom: bn.maBanNhom,
            tenAD: adStruct.tenAD,
            maAD: adStruct.maAD,
            tenPhong: phongStruct.tenPhong,
            maPhong: phongStruct.maPhong,
            afyp: afypTrd,
            kh: khTrd,
            pct,
            tnName,
          });
        }
      }
    }

    items.sort((a, b) => b.pct - a.pct);
    return items;
  }, [rawData, detailMonth, CUR_YEAR, banNhomStructList, adStructList, phongStructList, tvvStructList, onlineSettings]);

  /* ============= AD detail popup data ============= */
  const adPopupData = useMemo(() => {
    if (!adPopup || !dashboard || !rawData) return null;

    // All BanNhom of this AD
    const adBannhoms = banNhomStructList.filter(bn => bn.maAD === adPopup.maAD);
    if (adBannhoms.length === 0) return null;

    // Selected nhóm (default first)
    const selectedMaBN = adPopupNhom && adBannhoms.some(bn => bn.maBanNhom === adPopupNhom)
      ? adPopupNhom
      : adBannhoms[0].maBanNhom;
    const selectedBN = adBannhoms.find(bn => bn.maBanNhom === selectedMaBN) || adBannhoms[0];

    // IMPORTANT: Use ALL year contracts (NOT dashboard.periodContracts which is
    // filtered by the user's selected overviewPeriod on the dashboard). The popup
    // must show IP for all months 3-9 regardless of what period is selected.
    const popupYearContracts = rawData.contracts.filter(c => {
      const d = getDoanhSoMonth(c);
      return !isNaN(d.getTime()) && d.getFullYear() === CUR_YEAR;
    });

    // Contracts of selected nhóm
    const bnContracts = popupYearContracts.filter(c => (c.maBanNhom || '') === selectedBN.maBanNhom);
    const finalContracts = bnContracts.length > 0 ? bnContracts : popupYearContracts.filter(c => {
      const cNhom = normKey(c.nhom || '');
      const bnName = normKey(selectedBN.tenBanNhom);
      return cNhom && (cNhom === bnName || cNhom.includes(bnName) || bnName.includes(cNhom));
    });

    // Group metrics
    const afyp = finalContracts.reduce((s, c) => s + num(c.afyp), 0);
    const ip = finalContracts.reduce((s, c) => s + num(c.pdt10DT), 0);
    const lhd = finalContracts.filter(c => num(c.tinhLuot3tr) >= 3000000).length;
    const hdChuan = finalContracts.filter(c => num(c.tinhLuot3tr) >= 12000000).length;
    const slHD = finalContracts.length;
    const tyTrongIP = afyp > 0 ? (ip / afyp * 100) : 0;
    const nangSuat = lhd > 0 ? slHD / lhd : 0;
    const doLonHD = lhd > 0 ? afyp / lhd : 0;

    // Annual KH 2026
    const annualKh = parseFloat(onlineSettings[`nmc-kh-nhom-${selectedBN.maBanNhom}`] || '0') || 0;

    // TVV of nhóm
    const allTvv = tvvStructList.filter(t => t.maBanNhom === selectedBN.maBanNhom);
    const tvvMoi = allTvv.filter(t => {
      if (!t.ngayBatDau) return false;
      const d = new Date(t.ngayBatDau);
      return !isNaN(d.getTime()) && d.getFullYear() === CUR_YEAR;
    }).length;
    const tvvConLai = allTvv.length - tvvMoi;
    const tvvTtn = allTvv.filter(t => {
      const n = normKey(t.chucVu);
      return n.includes('TIEN') || n.includes('TIENTRUONGNHOM');
    }).length;

    // Sort TVV by chucVu: TB → TN → TTN → TVV
    const getOrder = (cv: string): number => {
      const n = normKey(cv);
      if (n.includes('TRUONG') && n.includes('BAN')) return 1;
      if (n.includes('TRUONG') && n.includes('NHOM') && !n.includes('TIEN')) return 2;
      if (n.includes('TIEN') || n.includes('TIENTRUONGNHOM')) return 3;
      return 4;
    };
    const abbreviateChucVu = (cv: string): string => {
      const n = normKey(cv);
      if (n.includes('TRUONG') && n.includes('BAN')) return 'TB';
      if (n.includes('TRUONG') && n.includes('NHOM') && !n.includes('TIEN')) return 'TN';
      if (n.includes('TIEN')) return 'TTN';
      return 'TVV';
    };

    const sortedTvv = [...allTvv].sort((a, b) => {
      const ordA = getOrder(a.chucVu);
      const ordB = getOrder(b.chucVu);
      if (ordA !== ordB) return ordA - ordB;
      return a.agentName.localeCompare(b.agentName, 'vi');
    });

    // IP per month per TVV (months 3-9)
    const months37 = [3, 4, 5, 6, 7, 8, 9];
    const tvvTable = sortedTvv.map((t, idx) => {
      const ipByMonth: Record<number, number> = {};
      months37.forEach(m => {
        ipByMonth[m] = finalContracts
          .filter(c => c.agentCode === t.agentCode)
          .filter(c => {
            const d = getDoanhSoMonth(c);
            return !isNaN(d.getTime()) && d.getFullYear() === CUR_YEAR && (d.getMonth() + 1) === m;
          })
          .reduce((s, c) => s + num(c.pdt10DT), 0);
      });
      return {
        stt: idx + 1,
        agentCode: t.agentCode,
        agentName: t.agentName,
        chucVu: abbreviateChucVu(t.chucVu),
        ipByMonth,
        ipTotal: months37.reduce((s, m) => s + ipByMonth[m], 0),
      };
    });

    return {
      ad: adPopup,
      bannhoms: adBannhoms,
      selectedBN,
      groupInfo: {
        annualKh,
        afyp,
        tyTrongIP,
        lhd,
        hdChuan,
        td: tvvMoi,
        nangSuat,
        doLonHD,
        slHD,
        totalTvv: allTvv.length,
        tvvMoi,
        tvvTtn,
        tvvConLai,
      },
      tvvTable,
      months37,
    };
  }, [adPopup, adPopupNhom, dashboard, rawData, banNhomStructList, tvvStructList, onlineSettings, CUR_YEAR]);


  /* Monthly AFYP chart data */
  const chartData = useMemo(() => {
    if (!rawData) return [];
    const months: { month: number; label: string; afyp: number; kh: number }[] = [];
    // Use adStructList for AD names (from DB) instead of CO_CAU
    const adKeys = adStructList.map(a => a.tenAD);
    const currentYear = new Date().getFullYear();

    // Use adStructList for KH calculation (same as quan-ly)
    const chartAdPlans = new Map<string, number>();
    adStructList.forEach(ad => {
      const val = parseFloat(onlineSettings[`nmc-kh-ad-${ad.maAD}`] || '0') || 0;
      chartAdPlans.set(ad.maAD, val);
    });
    const chartTargetTong = adStructList.reduce((s, ad) => s + (chartAdPlans.get(ad.maAD) || 0), 0);

    for (let m = 1; m <= 12; m++) {
      const mk = `${currentYear}-${String(m).padStart(2, '0')}`;
      const mContracts = rawData.contracts.filter(c => {
        const d = getDoanhSoMonth(c);
        return !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() + 1 === m;
      });

      let afyp = 0;
      adKeys.forEach(adKey => {
        mContracts.filter(c => {
          const adNorm = normKey(c.ad || '');
          return adNorm && (adNorm === normKey(adKey) || adNorm.includes(normKey(adKey)) || normKey(adKey).includes(adNorm));
        }).forEach(c => { afyp += num(c.afyp); });
      });

      // KH for this month — same as quan-ly: annual × ratio / 100
      const mm = String(m).padStart(2, '0');
      const ratio = parseFloat(onlineSettings[`nmc-kh-ratio-${mm}`] || '0') || 0;
      const kh = chartTargetTong > 0 && ratio > 0 ? chartTargetTong * ratio / 100 : 0;

      months.push({ month: m, label: `T${m}`, afyp, kh });
    }
    return months;
  }, [rawData, onlineSettings, adStructList]);

  /* Format ky label */
  const formatKyLabel = (ky: string) => {
    if (!ky) return '--';
    const monthMatch = ky.match(/(\d{2})$/);
    if (/^\d{4}-\d{2}$/.test(ky) && monthMatch) return `T${parseInt(monthMatch[1])}`;
    return ky.replace(/^\d{4}-/, '');
  };

  /* Calendar render data */
  const calendarRows = useMemo(() => {
    const monthNum = parseInt(calMonth, 10);
    if (!monthNum) return [];
    const daysInMonth = new Date(CUR_YEAR, monthNum, 0).getDate();
    const rows: { day: number; weekday: number; events: CalendarEvent[]; isToday: boolean; isWeekend: boolean; isSunday: boolean }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(CUR_YEAR, monthNum - 1, day);
      const weekday = dateObj.getDay();
      const dateStr = `${CUR_YEAR}-${calMonth}-${String(day).padStart(2, '0')}`;
      const dayEvents = calendarEvents.filter(e => e.date === dateStr);
      rows.push({
        day, weekday, events: dayEvents,
        isToday: day === NOW.getDate() && calMonth === CUR_MONTH,
        isWeekend: weekday === 6,
        isSunday: weekday === 0,
      });
    }
    return rows;
  }, [calMonth, CUR_YEAR, calendarEvents, NOW, CUR_MONTH]);

  /* Render AFYP Chart SVG — with KH line */
  const renderChart = () => {
    if (typeof window === 'undefined' || !chartData.some(d => d.afyp > 0 || d.kh > 0)) return null;

    const W = 600, H = 320;
    const padL = 68, padR = 20, padT = 30, padB = 40;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const maxVal = Math.max(1, ...chartData.map(d => Math.max(d.afyp, d.kh)));
    const niceMax = Math.pow(10, Math.floor(Math.log10(maxVal))) * (maxVal / Math.pow(10, Math.floor(Math.log10(maxVal))) > 5 ? 10 : maxVal / Math.pow(10, Math.floor(Math.log10(maxVal))) > 2 ? 5 : 2);
    const slotW = chartW / 12;
    const barW = slotW * 0.45;

    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">`;
    svg += '<defs>';
    svg += '<linearGradient id="barCyan" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#0284c7"/></linearGradient>';
    svg += '<linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4ade80"/><stop offset="100%" stop-color="#16a34a"/></linearGradient>';
    svg += '<linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fbbf24"/><stop offset="100%" stop-color="#d97706"/></linearGradient>';
    svg += '<linearGradient id="barRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f87171"/><stop offset="100%" stop-color="#dc2626"/></linearGradient>';
    svg += '<filter id="barShadow" x="-10%" y="-5%" width="120%" height="115%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/></filter>';
    svg += '</defs>';

    for (let gi = 0; gi <= 5; gi++) {
      const gy = padT + chartH - (chartH * gi / 5);
      svg += `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${W-padR}" y2="${gy.toFixed(1)}" stroke="#1e3a5f" stroke-width="1" stroke-dasharray="${gi===0?'0':'4,4'}"/>`;
      const gVal = niceMax * gi / 5;
      svg += `<text x="${padL-8}" y="${(gy+4).toFixed(1)}" fill="#6b8aaa" font-size="11" text-anchor="end" font-family="inherit">${fmtShort(gVal)}</text>`;
    }

    // KH line points
    const khLinePoints: string[] = [];
    chartData.forEach((d, mi) => {
      const cx = padL + slotW * mi + slotW / 2;
      if (d.kh > 0) {
        const khH = d.kh / niceMax * chartH;
        khLinePoints.push(`${cx.toFixed(1)},${(padT+chartH-khH).toFixed(1)}`);
      }
    });

    // AFYP bars
    const afypLinePoints: string[] = [];
    chartData.forEach((d, mi) => {
      const cx = padL + slotW * mi + slotW / 2;
      if (d.afyp > 0) {
        const afypH = d.afyp / niceMax * chartH;
        const khPct = d.kh > 0 ? (d.afyp / d.kh * 100) : 0;
        const gradId = khPct >= 100 ? 'barGreen' : khPct >= 70 ? 'barGold' : 'barCyan';
        const barX = cx - barW / 2;
        svg += `<rect x="${barX.toFixed(1)}" y="${(padT+chartH-afypH).toFixed(1)}" width="${barW.toFixed(1)}" height="${afypH.toFixed(1)}" rx="4" fill="url(#${gradId})" filter="url(#barShadow)"/>`;
        svg += `<text x="${cx.toFixed(1)}" y="${(padT+chartH-afypH-8).toFixed(1)}" fill="#fbbf24" font-size="10" font-weight="700" text-anchor="middle" font-family="inherit">${fmtShort(d.afyp)}</text>`;
        afypLinePoints.push(`${cx.toFixed(1)},${(padT+chartH-afypH).toFixed(1)}`);
      }
      svg += `<text x="${cx.toFixed(1)}" y="${H-12}" fill="#8faabe" font-size="11" text-anchor="middle" font-weight="600" font-family="inherit">${d.label}</text>`;
    });

    // KH line
    if (khLinePoints.length > 1) {
      svg += `<polyline points="${khLinePoints.join(' ')}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6,3"/>`;
      khLinePoints.forEach(pt => {
        const [cx, cy] = pt.split(',');
        svg += `<circle cx="${cx}" cy="${cy}" r="3.5" fill="#0b1a2e" stroke="#f59e0b" stroke-width="2"/>`;
      });
    }

    // AFYP trend line
    if (afypLinePoints.length > 1) {
      svg += `<polyline points="${afypLinePoints.join(' ')}" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
    }

    svg += '</svg>';
    return svg;
  };

  /* Render helpers */
  const pct = dashboard ? (dashboard.total.kh ? (dashboard.total.afyp / dashboard.total.kh * 100) : 0) : 0;
  const cp = Math.min(pct, 100);

  /* Detail top 3 */
  const top3Items = detailData.filter(x => x.kh > 0).slice(0, 3);
  const top3Order = [top3Items.length > 1 ? top3Items[1] : null, top3Items[0] || null, top3Items.length > 2 ? top3Items[2] : null];
  const crowns = [<Award key="a" size={14} />, <Crown key="c" size={14} />, <Medal key="m" size={14} />];
  const cls3 = ['t3-silver', 't3-gold', 't3-bronze'];

  /* AD list for detail filter — derived from detailData */
  const detailAdList = useMemo(() => {
    const map = new Map<string, { maAD: string; tenAD: string }>();
    detailData.forEach(item => {
      if (!map.has(item.maAD)) map.set(item.maAD, { maAD: item.maAD, tenAD: item.tenAD });
    });
    return Array.from(map.values());
  }, [detailData]);

  /* Filtered detail data (by selected AD) */
  const filteredDetailData = useMemo(() => {
    if (detailAdFilter === 'all') return detailData;
    return detailData.filter(item => item.maAD === detailAdFilter);
  }, [detailData, detailAdFilter]);

  return (
    <div className="kpi-app">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bg-scene" aria-hidden="true">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <div className="app-wrap">
        {/* ===== MAIN VIEW ===== */}
        <section className={`view ${view === 'main' ? 'active' : ''}`} id="view-main" role="main">
          <header>
            <div className="main-header">
              <BackButton href="/" size={20} title="Trở về trang chủ" />
              <div>
                <h1 className="hero-title">Tiến Độ Kinh Doanh</h1>
                <p className="hero-sub">Bảo Việt Nhân Thọ An Giang</p>
              </div>
            </div>
            <div className="ctrl-bar">
              <span className="ctrl-hint">chọn thời gian xem</span>
              <div className={`ctrl-select-wrap ${periodDropdownOpen ? 'open' : ''}`}>
                <button type="button" className="ctrl-select ctrl-select-period" onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}>
                  <span className="ctrl-period-label">{overviewPeriod.startsWith('month-') ? `T${overviewPeriod.split('-')[1]}` : overviewPeriod.startsWith('q') ? overviewPeriod.replace('q', 'Q').toUpperCase() : overviewPeriod === 'h1' ? 'H1' : overviewPeriod === 'h2' ? 'H2' : overviewPeriod === 'year' ? 'Năm' : 'T?'}</span>
                </button>
                <div className="ctrl-select-popup" role="listbox">
                  {/* Months */}
                  <p style={{ gridColumn: '1/-1', fontSize: '10px', fontWeight: 800, color: '#9db3d2', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 0' }}>Tháng</p>
                  {Array.from({ length: 12 }, (_, i) => {
                    const key = `month-${i + 1}`;
                    return (
                      <button key={key} className={`ctrl-select-opt ${overviewPeriod === key ? 'on' : ''}`}
                        onClick={() => { setOverviewPeriod(key); setPeriodDropdownOpen(false); }}>
                        T{i + 1}
                      </button>
                    );
                  })}
                  {/* Quarters */}
                  <p style={{ gridColumn: '1/-1', fontSize: '10px', fontWeight: 800, color: '#9db3d2', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 0', marginTop: '4px' }}>Quý</p>
                  {(['q1', 'q2', 'q3', 'q4'] as const).map(q => (
                    <button key={q} className={`ctrl-select-opt ${overviewPeriod === q ? 'on' : ''}`}
                      onClick={() => { setOverviewPeriod(q); setPeriodDropdownOpen(false); }}>
                      {q.replace('q', 'Q').toUpperCase()}
                    </button>
                  ))}
                  {/* Half / Year */}
                  <p style={{ gridColumn: '1/-1', fontSize: '10px', fontWeight: 800, color: '#9db3d2', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '2px 0', marginTop: '4px' }}>Khác</p>
                  <button className={`ctrl-select-opt ${overviewPeriod === 'h1' ? 'on' : ''}`}
                    onClick={() => { setOverviewPeriod('h1'); setPeriodDropdownOpen(false); }}>H1</button>
                  <button className={`ctrl-select-opt ${overviewPeriod === 'h2' ? 'on' : ''}`}
                    onClick={() => { setOverviewPeriod('h2'); setPeriodDropdownOpen(false); }}>H2</button>
                  <button className={`ctrl-select-opt ${overviewPeriod === 'year' ? 'on' : ''}`}
                    onClick={() => { setOverviewPeriod('year'); setPeriodDropdownOpen(false); }}>Cả năm</button>
                </div>
              </div>
              <button className={`sync-status ${syncing ? 'syncing' : ''}`} onClick={fetchData} title="Đồng bộ" aria-label="Đồng bộ dữ liệu">
                <span className="sync-check"><Check size={16} /></span>
                <span className="sync-spinner"><RotateCw size={14} /></span>
              </button>
            </div>
          </header>

          {loading && (
            <div id="skeleton-main">
              <div className="skel skel-cty" />
              <div className="skel skel-phong" />
              <div className="skel skel-ad" />
              <div className="skel skel-ad" />
              <div className="skel skel-phong" />
            </div>
          )}

          {error && (
            <div className="error-state">
              <p>Không thể tải dữ liệu. Vui lòng thử lại.</p>
              <button className="btn-sync" onClick={fetchData}>Thử lại</button>
            </div>
          )}

          {dashboard && !loading && (
            <>
              {/* Company Card (Mobile) */}
              <div id="kpi-company">
                <div className={`kpi-card kpi-cty anim-in${glowCls(pct)}`}>
                  <div className="cty-inner">
                    <div className="cty-head">
                      <div className="cty-name"><Trophy size={16} style={{ color: '#ffc46b' }} /><span>Công Ty</span></div>
                      <div className="cty-pct-num"><AnimPct value={pct} /></div>
                    </div>
                    <div className="cty-body">
                      <div className="afyp-kh-row">
                        <span className="afyp-big" style={{ fontSize: 'clamp(1.6rem, 5.5vw, 2.4rem)' }}>{fmt(dashboard.total.afyp)}<span style={{ fontSize: '0.4em', fontWeight: 600, color: '#8ab8e0', marginLeft: 3 }}>đ</span></span>
                        {dashboard.total.kh > 0 && <span className="kh-small">/{fmt(Math.round(dashboard.total.kh))}<span style={{ fontSize: '0.75em', color: '#6ab0e8', marginLeft: 2 }}>đ</span></span>}
                      </div>
                      {dashboard.total.kh > 0 && <div className="cty-progress"><div className="cty-progress-fill" style={{ width: `${cp}%` }} /></div>}
                    </div>
                    <div className="cty-stats">
                      <div className="cty-stat hd"><div className="cty-stat-label">LƯỢT HĐ</div><div className="cty-stat-val"><AnimNum value={dashboard.total.lhd} /></div></div>
                      <div className="cty-stat td"><div className="cty-stat-label">TUYỂN DỤNG</div><div className="cty-stat-val"><AnimNum value={dashboard.total.td} /></div></div>
                      <div className="cty-stat chuan"><div className="cty-stat-label">Lượt HĐC</div><div className="cty-stat-val"><AnimNum value={dashboard.total.hdChuan} /></div></div>
                      <div className="cty-stat ip"><div className="cty-stat-label">%IP</div><div className="cty-stat-val">{Math.round(dashboard.total.tyTrong)}</div></div>
                      <div className="cty-stat ns"><div className="cty-stat-label">NĂNG SUẤT</div><div className="cty-stat-val">{dashboard.total.nangSuat.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
                      <div className="cty-stat dl"><div className="cty-stat-label">ĐLHĐ <span className="cty-stat-sub">(TRĐ)</span></div><div className="cty-stat-val">{(dashboard.total.doLonHD / 1000000).toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div></div>
                      <div className="cty-stat sl"><div className="cty-stat-label">SỐ LƯỢNG HĐ</div><div className="cty-stat-val"><AnimNum value={dashboard.total.slHD} /></div></div>
                      <div className="cty-stat tbtn"><div className="cty-stat-label">SL TB/TN</div><div className="cty-stat-val">{rawData?.leaders?.length ?? 0}</div></div>
                    </div>

                  </div>
                </div>

                {/* Desktop Company Strip */}
                <div className="dsk-company">
                  <div className="dsk-cty-top">
                    <div className="dsk-cty-left">
                      <div className="dsk-cty-main-head"><Trophy size={13} style={{ color: '#fff' }} /><span className="dsk-cty-main-label">Công Ty</span></div>
                      <div className="dsk-cty-main-body">
                        <div className="dsk-cty-pct"><AnimPct value={pct} /></div>
                        {dashboard.total.kh > 0 && <div className="dsk-cty-prog-wrap"><div className="dsk-cty-prog"><div className="dsk-cty-prog-fill" style={{ width: `${cp}%` }} /></div></div>}
                        <div className="dsk-cty-afyp">{fmt(dashboard.total.afyp)}<span style={{ fontSize: '0.4em', fontWeight: 600, color: '#8ab8e0', marginLeft: 3 }}>đ</span></div>
                        {dashboard.total.kh > 0 && <div className="dsk-cty-kh">/ KH: {fmt(Math.round(dashboard.total.kh))}đ</div>}
                      </div>
                    </div>
                    <div className="dsk-cty-right">
                      <div className="dsk-cty-tier">
                        <div className="dsk-cty-kpi hd"><div className="dsk-cty-kpi-head"><span className="dsk-cty-kpi-label">LƯỢT HĐ</span></div><div className="dsk-cty-kpi-body"><div className="dsk-cty-kpi-val"><AnimNum value={dashboard.total.lhd} /></div></div></div>
                        <div className="dsk-cty-kpi td"><div className="dsk-cty-kpi-head"><span className="dsk-cty-kpi-label">TUYỂN DỤNG</span></div><div className="dsk-cty-kpi-body"><div className="dsk-cty-kpi-val"><AnimNum value={dashboard.total.td} /></div></div></div>
                        <div className="dsk-cty-kpi chuan"><div className="dsk-cty-kpi-head"><span className="dsk-cty-kpi-label">LƯỢT HĐ CHUẨN</span></div><div className="dsk-cty-kpi-body"><div className="dsk-cty-kpi-val"><AnimNum value={dashboard.total.hdChuan} /></div></div></div>
                        <div className="dsk-cty-kpi ip"><div className="dsk-cty-kpi-head"><span className="dsk-cty-kpi-label">TỶ TRỌNG IP</span></div><div className="dsk-cty-kpi-body"><div className="dsk-cty-kpi-val">{Math.round(dashboard.total.tyTrong)}</div></div></div>
                      </div>
                      <div className="dsk-cty-tier">
                        <div className="dsk-cty-kpi ns"><div className="dsk-cty-kpi-head"><span className="dsk-cty-kpi-label">NĂNG SUẤT</span></div><div className="dsk-cty-kpi-body"><div className="dsk-cty-kpi-val">{dashboard.total.nangSuat.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div></div>
                        <div className="dsk-cty-kpi dl"><div className="dsk-cty-kpi-head"><span className="dsk-cty-kpi-label">ĐỘ LỚN HĐ <span className="dsk-cty-kpi-sub">(TRĐ)</span></span></div><div className="dsk-cty-kpi-body"><div className="dsk-cty-kpi-val">{(dashboard.total.doLonHD / 1000000).toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</div></div></div>
                        <div className="dsk-cty-kpi sl"><div className="dsk-cty-kpi-head"><span className="dsk-cty-kpi-label">SỐ LƯỢNG HĐ</span></div><div className="dsk-cty-kpi-body"><div className="dsk-cty-kpi-val"><AnimNum value={dashboard.total.slHD} /></div></div></div>
                        <div className="dsk-cty-kpi tbtn"><div className="dsk-cty-kpi-head"><span className="dsk-cty-kpi-label">SL TB/TN</span></div><div className="dsk-cty-kpi-body"><div className="dsk-cty-kpi-val">{rawData?.leaders?.length ?? 0}</div></div></div>
                      </div>
                    </div>
                  </div>
                  {dashboard.total.kh > 0 && <div className="dsk-cty-progress"><div className="dsk-cty-progress-fill" style={{ width: `${cp}%` }} /></div>}
                </div>
              </div>

              {/* Navigation Grid */}
              <nav className="nav-grid" aria-label="Điều hướng">
                <button className="nav-btn nav-detail" onClick={() => { setDetailAdFilter('all'); setDetailAdDropdownOpen(false); setView('detail'); }}>
                  <span className="nav-icon"><BarChart3 size={14} /></span> Chi tiết nhóm
                </button>
                <button className="nav-btn nav-plan" onClick={() => setView('calendar')}>
                  <span className="nav-icon"><CalendarDays size={14} /></span> Kế hoạch khung
                </button>
                <div className="nav-row-3">
                  <a className="nav-btn nav-race" href="/thi-dua-chau">
                    <span className="nav-icon"><Flag size={14} /></span> Thi đua
                  </a>
                  <button className="nav-btn nav-policy">
                    <span className="nav-icon"><BookOpen size={14} /></span> Chính sách 2026
                  </button>
                  <button className="nav-btn nav-clb">
                    <span className="nav-icon"><Star size={14} /></span> CLB Sao Việt
                  </button>
                </div>
              </nav>

              {/* Region Divider - Mobile */}
              <div className="region-divider mobile-only">
                <span className="region-divider-title">Tiến Độ Khu Vực</span>
              </div>

              {/* Mobile Region - Redesign as table-style cards */}
              <div className="rg-wrap mobile-only">
                {dashboard.phongs.map((phong, pi) => {
                  const pPct = phong.kh ? (phong.afyp / phong.kh * 100) : 0;
                  const pCp = Math.min(pPct, 100);
                  const pProgStart = progressColor(Math.max(pPct - 24, 0));
                  const pProgEnd = progressColor(pPct);
                  const pAfypTrd = Math.round(phong.afyp / 1000000);
                  const pKhTrd = Math.round(phong.kh / 1000000);
                  const pCls = phong.noAds ? 'is-banca' : '';
                  const glowClsStr = glowCls(pPct);
                  return (
                    <div className={`rg-card ${pCls} anim-in${glowClsStr}`} key={pi} style={{ animationDelay: `${pi * 60}ms` }}>
                      {/* Header: tên phòng + %KH trên góc phải (như cũ) */}
                      <div className="rg-head">
                        <div className="rg-head-left">
                          <Clipboard size={14} style={{ color: '#fff', flexShrink: 0 }} />
                          <span className="rg-head-name">{phong.ten}</span>
                        </div>
                        {!phong.noAds && phong.kh > 0 && <span className="rg-head-pct"><AnimPct value={pPct} /></span>}
                      </div>
                      {/* AFYP row: AFYP + KH inline (1 bên, như cũ) — đơn vị đ */}
                      {(phong.afyp > 0 || phong.noAds) && (
                        <div className="rg-afyp-row">
                          <span className="rg-afyp"><AnimNum value={phong.afyp} /><span className="rg-afyp-unit">đ</span></span>
                          {phong.noAds ? (
                            <span className="rg-banca-tvv-count">SL TVV PA: {phong.tvvCount ?? 0}</span>
                          ) : (
                            pKhTrd > 0 && <span className="rg-kh">KH: {fmt(phong.kh)} đ</span>
                          )}
                        </div>
                      )}
                      {/* Progress bar (no % overlay — như cũ) */}
                      {!phong.noAds && phong.kh > 0 && (
                        <div className="rg-prog"><div className="rg-prog-fill" style={{ width: `${pCp}%`, background: `linear-gradient(90deg,${pProgStart},${pProgEnd})` }} /></div>
                      )}
                      {/* Summary 4 stats: Lượt HĐ / Tuyển dụng / HĐ chuẩn / Tỷ trọng IP (BỎ AFYP — đã có ở dòng trên) */}
                      <div className={`rg-summary${phong.noAds ? ' rg-summary-2col' : ''}`}>
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">Lượt</div>
                          <div className="rg-sum-val hd"><AnimNum value={phong.lhd} /></div>
                        </div>
                        {!phong.noAds && (
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">Tuyển dụng</div>
                          <div className="rg-sum-val td"><AnimNum value={phong.td} /></div>
                        </div>
                        )}
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">HĐ chuẩn</div>
                          <div className="rg-sum-val chuan"><AnimNum value={phong.hdChuan} /></div>
                        </div>
                        {!phong.noAds && (
                        <div className="rg-sum-cell">
                          <div className="rg-sum-label">Tỷ trọng IP</div>
                          <div className="rg-sum-val ip">{fmtTyTrong(phong.tyTrong)}</div>
                        </div>
                        )}
                      </div>
                      {/* Thin separator (thay cho dòng Tỷ trọng IP riêng) */}
                      <div className="rg-divider" />
                      {/* AD Table */}
                      {!phong.noAds && phong.ads.length > 0 && (
                        <div className="rg-ad-wrap">
                          <table className="rg-ad-table">
                            <thead>
                              <tr>
                                <th>AD</th>
                                <th>AFYP</th>
                                <th>LƯỢT</th>
                                <th>TD</th>
                                <th>HĐC</th>
                                <th>IP%</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {phong.ads.map((ad, ai) => {
                                const aPct = ad.kh ? (ad.afyp / ad.kh * 100) : 0;
                                const aCp = Math.min(aPct, 100);
                                const aPctCls = pctClass(aPct);
                                const aProgStart = progressColor(Math.max(aPct - 24, 0));
                                const aProgEnd = progressColor(aPct);
                                const aGlow = aPct >= 100 ? 'rg-ad-glow' : '';
                                const adStructForPopup = adStructList.find(a => a.tenAD === ad.managerKey);
                                const canOpenPopup = !!adStructForPopup;
                                const openAdPopup = () => {
                                  if (!adStructForPopup) return;
                                  setAdPopupNhom(null);
                                  setAdPopup({ maAD: adStructForPopup.maAD, tenAD: ad.ten });
                                };
                                return (
                                  <tr key={ai} className={`${aGlow}${canOpenPopup ? ' rg-ad-row-clickable' : ''}`} onClick={openAdPopup}>
                                    <td>
                                      <div className="rg-ad-name-cell">
                                        <span className="rg-ad-name">{ad.ten}</span>
                                        {ad.kh > 0 && <span className="rg-ad-sub">KH: {fmt(ad.kh)}đ</span>}
                                      </div>
                                    </td>
                                    <td><span className="rg-ad-afyp">{fmt(ad.afyp)}<span className="rg-ad-afyp-unit">đ</span></span></td>
                                    <td className="rg-ad-val lhd">{ad.lhd}</td>
                                    <td className="rg-ad-val td">{ad.td}</td>
                                    <td className="rg-ad-val hdc">{ad.hdChuan}</td>
                                    <td className="rg-ad-val ip">{Math.round(ad.tyTrong)}%</td>
                                    <td className="rg-ad-prog-cell">
                                      {aPct >= 100 ? (
                                        <div className="rg-ad-checkmark"><Check size={18} strokeWidth={3.5} /></div>
                                      ) : (
                                        <svg width="32" height="32" viewBox="0 0 32 32" className="rg-ad-circle">
                                          <circle cx="16" cy="16" r="13" className="rg-ad-circle-bg" />
                                          <circle cx="16" cy="16" r="13" className="rg-ad-circle-fg"
                                            stroke={progressColor(aPct)}
                                            strokeDasharray={2 * Math.PI * 13}
                                            strokeDashoffset={2 * Math.PI * 13 - (Math.min(aPct, 100) / 100) * 2 * Math.PI * 13}
                                            transform="rotate(-90 16 16)" />
                                          <text x="16" y="16" className={`rg-ad-circle-text ${aPctCls}`}>{Math.round(aPct)}%</text>
                                        </svg>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Split Layout */}
              <div className="desktop-split">
                <div className="split-left" id="split-company" />
                <div className="split-center" id="split-chart">
                  <div className="afyp-chart-wrap">
                    <div className="afyp-chart-title"><BarChart3 size={14} style={{ color: '#38bdf8' }} /> Biến động AFYP theo tháng</div>
                    <div className="afyp-chart-summary">
                      <div className="sum-item"><div className="sum-label">Tổng AFYP (T1-T{CUR_MONTH})</div><div className="sum-val">{fmtBig(chartData.slice(0, parseInt(CUR_MONTH)).reduce((s,d) => s+d.afyp, 0))}</div></div>
                      <div className="sum-item"><div className="sum-label">Tháng cao nhất</div><div className="sum-val">{fmtBig(Math.max(...chartData.map(d => d.afyp)))}</div></div>
                      <div className="sum-item"><div className="sum-label">TB/tháng</div><div className="sum-val">{fmtBig(chartData.reduce((s,d) => s+d.afyp, 0) / 12)}</div></div>
                    </div>
                    <div className="afyp-chart" dangerouslySetInnerHTML={{ __html: renderChart() || '' }} />
                    <div className="chart-legend">
                      <div className="legend-item"><div className="legend-dot" style={{ background: 'linear-gradient(180deg,#38bdf8,#0284c7)' }} />AFYP Thực hiện</div>
                      <div className="legend-item"><div className="legend-dot" style={{ background: 'linear-gradient(180deg,#4ade80,#16a34a)' }} />Đạt KH</div>
                      <div className="legend-item"><div className="legend-dot" style={{ background: '#f59e0b', borderRadius: '50%' }} />Kế hoạch</div>
                      <div className="legend-item"><div className="legend-dot" style={{ background: '#38bdf8', borderRadius: '50%' }} />Xu hướng</div>
                    </div>
                  </div>
                </div>
                <div className="split-right" id="split-depts">
                  <div className="region-divider" style={{ display: "flex" }}><span className="region-divider-title">Tiến Độ Khu Vực</span></div>
                  <div className="kpi-stack">
                    {dashboard.phongs.map((phong, pi) => {
                      const pPct = phong.kh ? (phong.afyp / phong.kh * 100) : 0;
                      const pCp = Math.min(pPct, 100);
                      const progStart = progressColor(Math.max(pPct - 24, 0));
                      const progEnd = progressColor(pPct);
                      const afypTrd = Math.round(phong.afyp / 1000000);
                      const khTrd = Math.round(phong.kh / 1000000);

                      return (
                        <div className="dept-section" key={pi}>
                          {/* Mobile Phong Card - HIDDEN, replaced by rg-card */}
                          {false && (
                          <div className={`kpi-card kpi-phong ${phong.noAds ? 'banca ' : ''}anim-in${glowCls(pPct)}`} style={{ animationDelay: `${pi * 60}ms` }}>
                            <div className="phong-inner">
                              {/* Main Indicator Card */}
                              <div className="phong-main-card">
                                <div className="phong-main-head">
                                  <span className="phong-main-name"><Clipboard size={13} style={{ color: '#fff' }} />{phong.ten}</span>
                                  {!phong.noAds && <span className="phong-main-pct"><AnimPct value={pPct} /></span>}
                                </div>
                                <div className="phong-main-body">
                                  <div className="phong-main-afyp-row">
                                    <span className="phong-main-afyp"><AnimNum value={phong.afyp} /></span>
                                    {!phong.noAds && <span className="phong-main-kh">/{fmt(phong.kh)}đ</span>}
                                  </div>
                                  {!phong.noAds && <div className="phong-main-prog"><div className="phong-main-prog-fill" style={{ width: `${pCp}%` }} /></div>}
                                </div>
                              </div>
                              {/* Sub Indicators Grid */}
                              <div className="phong-sub-grid">
                                <div className="phong-sub hd"><div className="phong-sub-head"><div className="phong-sub-label">LƯỢT HĐ</div></div><div className="phong-sub-body"><div className="phong-sub-val"><AnimNum value={phong.lhd} /></div></div></div>
                                <div className="phong-sub td"><div className="phong-sub-head"><div className="phong-sub-label">TUYỂN DỤNG</div></div><div className="phong-sub-body"><div className="phong-sub-val"><AnimNum value={phong.td} /></div></div></div>
                                <div className="phong-sub chuan"><div className="phong-sub-head"><div className="phong-sub-label">LƯỢT HĐ CHUẨN</div></div><div className="phong-sub-body"><div className="phong-sub-val"><AnimNum value={phong.hdChuan} /></div></div></div>
                                {!phong.noAds && <div className="phong-sub ip"><div className="phong-sub-head"><div className="phong-sub-label">TỶ TRỌNG IP</div></div><div className="phong-sub-body"><div className="phong-sub-val">{Math.round(phong.tyTrong)}</div></div></div>}
                              </div>
                            </div>
                          </div>
                          )}

                          {/* Desktop Phong Card - Redesign as lighter floating card */}
                          <div className={`rg-card ${phong.noAds ? 'is-banca ' : ''}anim-in${glowCls(pPct)}`} style={{ animationDelay: `${pi * 60}ms` }}>
                            {/* Header: tên phòng + %KH trên góc phải (như cũ) */}
                            <div className="rg-head">
                              <div className="rg-head-left">
                                <Clipboard size={15} style={{ color: '#fff', flexShrink: 0 }} />
                                <span className="rg-head-name">{phong.ten}</span>
                              </div>
                              {!phong.noAds && phong.kh > 0 && <span className="rg-head-pct"><AnimPct value={pPct} /></span>}
                            </div>
                            {/* AFYP row: AFYP + KH inline (1 bên, như cũ) — đơn vị đ */}
                            {(phong.afyp > 0 || phong.noAds) && (
                              <div className="rg-afyp-row">
                                <span className="rg-afyp"><AnimNum value={phong.afyp} /><span className="rg-afyp-unit">đ</span></span>
                                {phong.noAds ? (
                                  <span className="rg-banca-tvv-count">SL TVV PA: {phong.tvvCount ?? 0}</span>
                                ) : (
                                  khTrd > 0 && <span className="rg-kh">KH: {fmt(phong.kh)} đ</span>
                                )}
                              </div>
                            )}
                            {/* Progress bar (no % overlay — như cũ) */}
                            {!phong.noAds && phong.kh > 0 && (
                              <div className="rg-prog"><div className="rg-prog-fill" style={{ width: `${pCp}%`, background: `linear-gradient(90deg,${progStart},${progEnd})` }} /></div>
                            )}
                            {/* Summary 4 stats: Lượt HĐ / Tuyển dụng / HĐ chuẩn / Tỷ trọng IP (BỎ AFYP) */}
                            <div className={`rg-summary${phong.noAds ? ' rg-summary-2col' : ''}`}>
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">Lượt</div>
                                <div className="rg-sum-val hd"><AnimNum value={phong.lhd} /></div>
                              </div>
                              {!phong.noAds && (
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">Tuyển dụng</div>
                                <div className="rg-sum-val td"><AnimNum value={phong.td} /></div>
                              </div>
                              )}
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">HĐ chuẩn</div>
                                <div className="rg-sum-val chuan"><AnimNum value={phong.hdChuan} /></div>
                              </div>
                              {!phong.noAds && (
                              <div className="rg-sum-cell">
                                <div className="rg-sum-label">Tỷ trọng IP</div>
                                <div className="rg-sum-val ip">{fmtTyTrong(phong.tyTrong)}</div>
                              </div>
                              )}
                            </div>
                            {/* Thin separator */}
                            <div className="rg-divider" />
                            {/* AD Table */}
                            {!phong.noAds && phong.ads.length > 0 && (
                              <div className="rg-ad-wrap">
                                <table className="rg-ad-table">
                                  <thead>
                                    <tr>
                                      <th>AD</th>
                                      <th>AFYP</th>
                                      <th>LƯỢT</th>
                                      <th>TD</th>
                                      <th>HĐC</th>
                                      <th>IP%</th>
                                      <th></th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {phong.ads.map((ad, ai) => {
                                      const aPct = ad.kh ? (ad.afyp / ad.kh * 100) : 0;
                                      const aCp = Math.min(aPct, 100);
                                      const aPctCls = pctClass(aPct);
                                      const aProgStart = progressColor(Math.max(aPct - 24, 0));
                                      const aProgEnd = progressColor(aPct);
                                      const aGlow = aPct >= 100 ? 'rg-ad-glow anim-in' : 'anim-in';
                                      const adStructForPopup = adStructList.find(a => a.tenAD === ad.managerKey);
                                      const canOpenPopup = !!adStructForPopup;
                                      const openAdPopup = () => {
                                        if (!adStructForPopup) return;
                                        setAdPopupNhom(null);
                                        setAdPopup({ maAD: adStructForPopup.maAD, tenAD: ad.ten });
                                      };
                                      return (
                                        <tr key={ai} className={`${aGlow}${canOpenPopup ? ' rg-ad-row-clickable' : ''}`} style={{ animationDelay: `${(pi * 60) + (ai * 30)}ms` }} onClick={openAdPopup}>
                                          <td>
                                            <div className="rg-ad-name-cell">
                                              <span className="rg-ad-name">{ad.ten}</span>
                                              {ad.kh > 0 && <span className="rg-ad-sub">KH: {fmt(ad.kh)}đ</span>}
                                            </div>
                                          </td>
                                          <td><span className="rg-ad-afyp">{fmt(ad.afyp)}<span className="rg-ad-afyp-unit">đ</span></span></td>
                                          <td className="rg-ad-val lhd">{ad.lhd}</td>
                                          <td className="rg-ad-val td">{ad.td}</td>
                                          <td className="rg-ad-val hdc">{ad.hdChuan}</td>
                                          <td className="rg-ad-val ip">{Math.round(ad.tyTrong)}%</td>
                                          <td className="rg-ad-prog-cell">
                                            {aPct >= 100 ? (
                                              <div className="rg-ad-checkmark"><Check size={20} strokeWidth={3.5} /></div>
                                            ) : (
                                              <svg width="34" height="34" viewBox="0 0 32 32" className="rg-ad-circle">
                                                <circle cx="16" cy="16" r="13" className="rg-ad-circle-bg" />
                                                <circle cx="16" cy="16" r="13" className="rg-ad-circle-fg"
                                                  stroke={progressColor(aPct)}
                                                  strokeDasharray={2 * Math.PI * 13}
                                                  strokeDashoffset={2 * Math.PI * 13 - (Math.min(aPct, 100) / 100) * 2 * Math.PI * 13}
                                                  transform="rotate(-90 16 16)" />
                                                <text x="16" y="16" className={`rg-ad-circle-text ${aPctCls}`}>{Math.round(aPct)}%</text>
                                              </svg>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                        {/* AD Cards (Mobile) - HIDDEN, replaced by rg-ad-table inside rg-card */}
                          {!phong.noAds && false && (
                            <div className="ad-grid">
                              {phong.ads.map((ad, ai) => {
                                const aPct = ad.kh ? (ad.afyp / ad.kh * 100) : 0;
                                const aCp = Math.min(aPct, 100);
                                const aProgStart = progressColor(Math.max(aPct - 24, 0));
                                const aProgEnd = progressColor(aPct);
                                return (
                                  <div className={`kpi-ad anim-in${glowCls(aPct)}`} key={ai} style={{ animationDelay: `${(pi * 60) + (ai * 30)}ms` }}>
                                    <div className="ad-inner">
                                      <div className="ad-top">
                                        <div className="ad-left">
                                          <div className="ad-name-row"><span className="ad-name">{ad.ten}</span><span className="ad-pct">{Math.round(aPct)}%</span></div>
                                          <span className="ad-kh">KH: {fmt(ad.kh)}trđ</span>
                                        </div>
                                        <div className="ad-right">
                                          <div className="ad-stats">
                                            <div className="ad-stat afyp"><span className="ad-stat-label">AFYP</span><span className="ad-stat-val">{fmt(ad.afyp)}<span className="ad-stat-unit">đ</span></span></div>
                                            <div className="ad-stat lhd"><span className="ad-stat-label">LƯỢT HĐ</span><span className="ad-stat-val"><AnimNum value={ad.lhd} /></span></div>
                                            <div className="ad-stat td"><span className="ad-stat-label">TUYỂN DỤNG</span><span className="ad-stat-val"><AnimNum value={ad.td} /></span></div>
                                            <div className="ad-stat chuan"><span className="ad-stat-label">LƯỢT HĐ CHUẨN</span><span className="ad-stat-val"><AnimNum value={ad.hdChuan} /></span></div>
                                            <div className="ad-stat ip"><span className="ad-stat-label">TỶ TRỌNG IP</span><span className="ad-stat-val">{fmtTyTrong(ad.tyTrong)}</span></div>
                                          </div>
                                          <div className="ad-progress"><div className="ad-progress-fill" style={{ width: `${aCp}%`, background: `linear-gradient(90deg,${aProgStart},${aProgEnd})` }} /></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* AD Table (Desktop) - HIDDEN, replaced by rg-ad-table inside rg-card */}
                          {!phong.noAds && false && (
                            <div className="dsk-ad-wrap">
                              <table className="dsk-ad-table">
                                <thead><tr><th>AD</th><th>% KH</th><th>AFYP</th><th>KH</th><th>LƯỢT HĐ</th><th>TUYỂN DỤNG</th><th>LƯỢT HĐ CHUẨN</th><th>TỶ TRỌNG IP</th><th></th></tr></thead>
                                <tbody>
                                  {phong.ads.map((ad, ai) => {
                                    const aPct = ad.kh ? (ad.afyp / ad.kh * 100) : 0;
                                    const aCp = Math.min(aPct, 100);
                                    const aPctCls = pctClass(aPct);
                                    const aProgStart = progressColor(Math.max(aPct - 24, 0));
                                    const aProgEnd = progressColor(aPct);
                                    const khTrd = Math.round(ad.kh / 1000000);
                                    return (
                                      <tr key={ai} className="anim-in" style={{ animationDelay: `${(pi * 60) + (ai * 30)}ms` }}>
                                        <td><span className="dsk-ad-name">{ad.ten}</span></td>
                                        <td><span className={`dsk-ad-pct ${aPctCls}`}>{Math.round(aPct)}%</span></td>
                                        <td>{fmt(ad.afyp)}</td>
                                        <td className="dsk-ad-kh-cell">{khTrd ? `${khTrd}trđ` : '--'}</td>
                                        <td>{ad.lhd}</td>
                                        <td>{ad.td}</td>
                                        <td>{ad.hdChuan}</td>
                                        <td>{fmtTyTrong(ad.tyTrong)}</td>
                                        <td><span className="dsk-ad-mini-prog"><span className="dsk-ad-mini-prog-fill" style={{ width: `${aCp}%`, background: `linear-gradient(90deg,${aProgStart},${aProgEnd})` }} /></span></td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ===== DETAIL VIEW ===== */}
        <section className={`view ${view === 'detail' ? 'active' : ''}`} id="view-detail" role="region">
          <div className="detail-shell">
            <div className="detail-topbar">
              <BackButton onClick={() => setView('main')} size={20} title="Quay lại" />
              <div style={{ width: 38, height: 38, flexShrink: 0 }} />
            </div>
            <div className="detail-hero">
              <div className="detail-title">Chi Tiết Ban Nhóm</div>
              <div className="detail-meta">AFYP — {detailMonth === 'Y' ? `Năm ${CUR_YEAR}` : detailMonth === 'H1' ? `6T đầu ${CUR_YEAR}` : detailMonth.startsWith('Q') ? `${detailMonth} ${CUR_YEAR}` : `T${parseInt(detailMonth)}/${CUR_YEAR}`}</div>
            </div>
            <div className="month-grid">
              {MONTHS.map(m => (
                <button key={m} className={`month-cell ${detailMonth === m ? 'on' : ''}`} onClick={() => setDetailMonth(m)}>
                  <span className="mc-label">T{parseInt(m)}</span>
                </button>
              ))}
              <button className={`month-cell ${detailMonth === 'H1' ? 'on' : ''}`} onClick={() => setDetailMonth('H1')} style={{ fontSize: 8, fontWeight: 800, background: detailMonth === 'H1' ? '' : '#0a3434', borderColor: detailMonth === 'H1' ? '' : '#008080', color: detailMonth === 'H1' ? '' : '#b9ffff' }}>6T</button>
              {['Q1','Q2','Q3','Q4','Y'].map(f => (
                <button key={f} className={`month-cell ${detailMonth === f ? 'on' : ''}`} onClick={() => setDetailMonth(f)} style={{ fontSize: 8, fontWeight: 800, background: detailMonth === f ? '' : '#251e47', borderColor: detailMonth === f ? '' : '#3b2b63', color: detailMonth === f ? '' : '#c4b8f0' }}>
                  {f === 'Y' ? 'Năm' : f}
                </button>
              ))}
            </div>

            {/* Top 3 Podium */}
            {top3Items.length > 0 && (
              <div className="top3-section">
                <div className="top3-grid">
                  {top3Order.map((item, i) => {
                    if (!item) return <div key={i} />;
                    const isF = i === 1;
                    return (
                      <div className={`top3-card ${isF ? 'top3-first ' : ''}${cls3[i]}`} key={i} style={{ animationDelay: `${i * 80}ms` }}>
                        {isF && <div className="top3-crown">{crowns[i]}</div>}
                        <div className="top3-rank"><span className="top3-rank-num">{i === 0 ? '2' : i === 1 ? '1' : '3'}</span></div>
                        <div className="top3-name">{item.name}</div>
                        <div className="top3-val"><AnimNum value={item.afyp} />trđ</div>
                        <div className="top3-bar" />
                        <div className="top3-pct">{item.pct.toFixed(1)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Thin separator between top3 and group list */}
            <div className="detail-divider" />

            {/* AD Filter — slim dropdown */}
            {detailAdList.length > 0 && (
              <div className={`detail-ad-filter-wrap ${detailAdDropdownOpen ? 'open' : ''}`}>
                <button type="button" className="detail-ad-filter-btn" onClick={() => setDetailAdDropdownOpen(!detailAdDropdownOpen)}>
                  <span className="detail-ad-filter-label">
                    {detailAdFilter === 'all' ? 'Tất cả AD' : (detailAdList.find(a => a.maAD === detailAdFilter)?.tenAD || 'AD')}
                  </span>
                  <span className="detail-ad-filter-caret">▾</span>
                </button>
                {detailAdDropdownOpen && (
                  <>
                    <div className="detail-ad-filter-overlay" onClick={() => setDetailAdDropdownOpen(false)} />
                    <div className="detail-ad-filter-popup" role="listbox">
                      <button className={`detail-ad-filter-opt ${detailAdFilter === 'all' ? 'on' : ''}`} onClick={() => { setDetailAdFilter('all'); setDetailAdDropdownOpen(false); }}>Tất cả AD</button>
                      {detailAdList.map(ad => (
                        <button key={ad.maAD} className={`detail-ad-filter-opt ${detailAdFilter === ad.maAD ? 'on' : ''}`} onClick={() => { setDetailAdFilter(ad.maAD); setDetailAdDropdownOpen(false); }}>
                          {ad.tenAD}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Group List — flat (no Phong/AD hierarchy), filtered by AD */}
            <div className="detail-list-wrap detail-list-flat">
              {filteredDetailData.length === 0 && <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 }}>Chưa có dữ liệu nhóm</div>}
              {filteredDetailData.map((item, idx) => {
                const fill = Math.min(item.pct, 100);
                const pc = item.pct >= 90 ? '#7de8c8' : item.pct >= 70 ? '#8fd0ff' : '#7a9bbf';
                return (
                  <div className="dt-bn-flat" key={item.maBanNhom}>
                    <div className="grp-item grp-item-flat" style={{ animationDelay: `${idx * 30}ms` }}>
                      <div className="grp-fill" style={{ width: `${fill}%` }} />
                      {/* Single-line header: Nhóm ... - TN ... - TLHT ... */}
                      <div className="grp-head-line">
                        <span className="grp-name">Nhóm {item.name}</span>
                        {item.tnName && <span className="grp-tn-inline"> - TN: {item.tnName}</span>}
                        <span className="grp-pct" style={{ color: pc }}><AnimPct value={item.pct} dec={1} /></span>
                      </div>
                      {/* Body: TH/KH + progress bar (unchanged) */}
                      <div className="grp-bot-row">
                        <span className="grp-stats-inline">
                          <span className="grp-stat-main">TH: <AnimNum value={item.afyp} />trđ</span>
                          <span className="grp-stat-kh">/ KH: {fmt(item.kh)}trđ</span>
                        </span>
                      </div>
                      <div className="grp-prog-row"><div className="grp-prog"><div className="grp-prog-fill" style={{ width: `${fill}%` }} /></div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== CALENDAR VIEW ===== */}
        <section className={`view ${view === 'calendar' ? 'active' : ''}`} id="view-calendar" role="region">
          <div className="sub-header">
            <BackButton onClick={() => setView('main')} size={20} title="Quay lại" />
            <span className="sub-title">Kế Hoạch Khung</span>
            <button
              className={`cal-settings-btn${calAuthed ? ' authed' : ''}`}
              onClick={calAuthed ? openCalEditForNew : openCalPwd}
              title={calAuthed ? 'Thêm kế hoạch mới' : 'Mở cài đặt (cần mật khẩu)'}
              aria-label="Cài đặt lịch"
            >
              <Settings size={16} />
            </button>
          </div>
          <div className="sub-line-wrap"><div className="sub-line" /></div>
          <div className="cal-filter">
            {MONTHS.map(m => (
              <button key={m} className={`cal-fbtn ${calMonth === m ? 'on' : ''}`} onClick={() => setCalMonth(m)}>T{parseInt(m)}</button>
            ))}
          </div>
          <div className="cal-wrap">
            <div className="cal-head">
              <span>Ngày</span>
              <span>Nội dung kế hoạch</span>
              <span>Phụ trách</span>
            </div>
            <div>
              {calendarRows.map(row => {
                const rowCls = ['cal-row'];
                if (row.isToday) rowCls.push('is-today');
                if (row.isWeekend) rowCls.push('is-weekend');
                if (row.isSunday) rowCls.push('is-sunday');
                return (
                  <div className={rowCls.join(' ')} key={row.day} style={{ animationDelay: `${(row.day - 1) * 22}ms` }}>
                    <div className="cal-day">
                      <span className="cal-day-num">{row.day}</span>
                      <span className="cal-day-week">{WEEKDAY_NAMES[row.weekday]}</span>
                    </div>
                    <div className="cal-text">
                      {row.events.length > 0
                        ? row.events.map((e, ei) => (
                          <span
                            className={`cal-line${calAuthed ? ' editable' : ''}`}
                            key={ei}
                            onClick={calAuthed ? () => openCalEditFor(e) : undefined}
                          >
                            {e.title}
                          </span>
                        ))
                        : <span className="cal-empty" />}
                    </div>
                    <div className="cal-owner">
                      {row.events.map((e, ei) => (
                        <span
                          className="cal-owner-tag"
                          key={ei}
                          style={{ color: '#fff', background: getOwnerColor(e.owner || '') }}
                          title={e.owner || ''}
                        >
                          {e.owner || '—'}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===== CALENDAR PASSWORD POPUP ===== */}
        {calPwdOpen && (
          <div className="cal-modal-overlay" onClick={() => setCalPwdOpen(false)}>
            <div className="cal-modal cal-modal-pwd" onClick={e => e.stopPropagation()}>
              <div className="cal-modal-head">
                <span>Xác thực quản trị</span>
                <button className="cal-modal-x" onClick={() => setCalPwdOpen(false)}>×</button>
              </div>
              <div className="cal-modal-body">
                <p className="cal-modal-hint">Nhập mật khẩu để mở khóa cài đặt lịch:</p>
                <input
                  type="password"
                  className={`cal-pwd-input${calPwdError ? ' err' : ''}`}
                  value={calPwdInput}
                  autoFocus
                  onChange={e => { setCalPwdInput(e.target.value); setCalPwdError(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') submitCalPwd(); }}
                  placeholder="••••••"
                />
                {calPwdError && <span className="cal-pwd-err">Mật khẩu không đúng</span>}
                <button className="cal-modal-save" onClick={submitCalPwd}>Xác nhận</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== CALENDAR EDIT POPUP ===== */}
        {calEditOpen && (
          <div className="cal-modal-overlay" onClick={() => !calEditSaving && setCalEditOpen(false)}>
            <div className="cal-modal cal-modal-edit" onClick={e => e.stopPropagation()}>
              <div className="cal-modal-head">
                <span>{calEditForm.id ? 'Sửa kế hoạch' : 'Thêm kế hoạch mới'}</span>
                <button className="cal-modal-x" onClick={() => !calEditSaving && setCalEditOpen(false)}>×</button>
              </div>
              <div className="cal-modal-body">
                <label className="cal-field">
                  <span className="cal-field-label">Ngày tháng năm</span>
                  <input
                    type="date"
                    className="cal-field-input"
                    value={calEditForm.date}
                    onChange={e => setCalEditForm(s => ({ ...s, date: e.target.value }))}
                  />
                </label>
                <label className="cal-field">
                  <span className="cal-field-label">Nội dung công việc</span>
                  <textarea
                    className="cal-field-textarea"
                    rows={4}
                    value={calEditForm.title}
                    autoFocus
                    placeholder="Nhập nội dung kế hoạch..."
                    onChange={e => setCalEditForm(s => ({ ...s, title: e.target.value }))}
                  />
                </label>
                <div className="cal-field">
                  <span className="cal-field-label">Phụ trách</span>
                  <div className="cal-owner-grid">
                    {CAL_OWNERS.map(o => (
                      <button
                        key={o}
                        type="button"
                        className={`cal-owner-opt${calEditForm.owner === o ? ' on' : ''}`}
                        style={calEditForm.owner === o ? { background: getOwnerColor(o), borderColor: getOwnerColor(o) } : {}}
                        onClick={() => setCalEditForm(s => ({ ...s, owner: o, ownerCustom: '' }))}
                      >
                        {o}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`cal-owner-opt${calEditForm.owner === '__other' ? ' on' : ''}`}
                      style={calEditForm.owner === '__other' ? { background: '#475569', borderColor: '#475569' } : {}}
                      onClick={() => setCalEditForm(s => ({ ...s, owner: '__other' }))}
                    >
                      Khác
                    </button>
                  </div>
                  {calEditForm.owner === '__other' && (
                    <input
                      type="text"
                      className="cal-field-input cal-owner-custom"
                      placeholder="Nhập đối tượng phụ trách..."
                      value={calEditForm.ownerCustom}
                      onChange={e => setCalEditForm(s => ({ ...s, ownerCustom: e.target.value }))}
                    />
                  )}
                </div>
                {calEditError && <div className="cal-edit-err">{calEditError}</div>}
                <div className="cal-modal-actions">
                  {calEditForm.id && (
                    <button className="cal-modal-del" disabled={calEditSaving} onClick={deleteCalEdit}>Xóa</button>
                  )}
                  <button className="cal-modal-save" disabled={calEditSaving} onClick={saveCalEdit}>
                    {calEditSaving ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== AD DETAIL POPUP ===== */}
      {adPopupData && (
        <div className="adp-overlay" onClick={() => setAdPopup(null)}>
          <div className="adp-modal" onClick={e => e.stopPropagation()}>
            {/* Slim header: AD name + close */}
            <div className="adp-header">
              <span className="adp-header-name">{adPopupData.ad.tenAD}</span>
              <button className="adp-close" onClick={() => setAdPopup(null)} aria-label="Đóng">
                <X size={16} />
              </button>
            </div>

            <div className="adp-body">
              {/* TOP 1/3: DS nhóm + Thông tin nhóm */}
              <div className="adp-top">
                <div className="adp-top-grid">
                  <div className="adp-block">
                    <div className="adp-section-label">Danh sách nhóm</div>
                    <div className="adp-nhom-buttons">
                      {adPopupData.bannhoms.map(bn => {
                        const isOn = bn.maBanNhom === adPopupData.selectedBN.maBanNhom;
                        return (
                          <button
                            key={bn.maBanNhom}
                            className={`adp-nhom-btn${isOn ? ' on' : ''}`}
                            onClick={() => setAdPopupNhom(bn.maBanNhom)}
                          >
                            {bn.tenBanNhom}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="adp-block">
                    <div className="adp-section-label">Thông tin nhóm: <span className="adp-section-name">{adPopupData.selectedBN.tenBanNhom}</span></div>
                    <div className="adp-info-grid">
                      <div className="adp-info-row">
                        <span className="adp-info-key">KH AFYP</span>
                        <span className="adp-info-val">{(adPopupData.groupInfo.annualKh / 1000000).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</span>
                      </div>
                      <div className="adp-info-row">
                        <span className="adp-info-key">Thực hiện</span>
                        <span className="adp-info-val">{(adPopupData.groupInfo.afyp / 1000000).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</span>
                      </div>
                      <div className="adp-info-row">
                        <span className="adp-info-key">%HT</span>
                        <span className="adp-info-val">{adPopupData.groupInfo.tyTrongIP.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                      </div>
                      <div className="adp-info-row">
                        <span className="adp-info-key">Lượt HĐ</span>
                        <span className="adp-info-val">{adPopupData.groupInfo.lhd}</span>
                      </div>
                      <div className="adp-info-row">
                        <span className="adp-info-key">Lượt HĐC</span>
                        <span className="adp-info-val">{adPopupData.groupInfo.hdChuan}</span>
                      </div>
                      <div className="adp-info-row">
                        <span className="adp-info-key">Tuyển dụng</span>
                        <span className="adp-info-val">{adPopupData.groupInfo.td}</span>
                      </div>
                      <div className="adp-info-row">
                        <span className="adp-info-key">Năng suất</span>
                        <span className="adp-info-val">{adPopupData.groupInfo.nangSuat.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="adp-info-row">
                        <span className="adp-info-key">Độ lớn HĐ</span>
                        <span className="adp-info-val">{(adPopupData.groupInfo.doLonHD / 1000000).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</span>
                      </div>
                      <div className="adp-info-row adp-info-row-tvv">
                        <span className="adp-info-key">Tổng số TVV</span>
                        <span className="adp-info-val">
                          {adPopupData.groupInfo.totalTvv}
                          <span className="adp-info-sub"> (TVVm: {adPopupData.groupInfo.tvvMoi} · TTN: {adPopupData.groupInfo.tvvTtn} · còn lại: {adPopupData.groupInfo.tvvConLai})</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM 2/3: Bảng chi tiết TVV */}
              <div className="adp-bottom">
                <div className="adp-section-label">Thông tin chi tiết</div>
                <div className="adp-table-wrap">
                  <table className="adp-table">
                    <thead>
                      <tr>
                        <th rowSpan={2} className="adp-th-stt">STT</th>
                        <th rowSpan={2} className="adp-th-code">Mã số</th>
                        <th rowSpan={2} className="adp-th-name">Họ tên TVV</th>
                        <th rowSpan={2} className="adp-th-pos">CV</th>
                        <th colSpan={adPopupData.months37.length} className="adp-th-ip">
                          <span className="adp-th-ip-label">IP</span>
                          <span className="adp-th-ip-unit">(Triệu đồng)</span>
                        </th>
                      </tr>
                      <tr>
                        {adPopupData.months37.map(m => (
                          <th key={m} className="adp-th-month">{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {adPopupData.tvvTable.length === 0 && (
                        <tr><td colSpan={4 + adPopupData.months37.length} className="adp-empty">Chưa có TVV trong nhóm</td></tr>
                      )}
                      {adPopupData.tvvTable.map(row => (
                        <tr key={row.agentCode}>
                          <td className="adp-td-stt">{row.stt}</td>
                          <td className="adp-td-code">{row.agentCode}</td>
                          <td className="adp-td-name">{row.agentName}</td>
                          <td className="adp-td-pos">{row.chucVu}</td>
                          {adPopupData.months37.map(m => {
                            const v = row.ipByMonth[m];
                            const vM = Math.round(v / 1000000);
                            return (
                              <td key={m} className={`adp-td-ip${v > 0 ? ' has' : ''}`}>
                                {v > 0 ? vM.toLocaleString('vi-VN') : '–'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
