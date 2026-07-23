'use client';

import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Trophy, RotateCw, CalendarDays, BarChart3, Flag, BookOpen, Star,
  ArrowLeft, ChevronDown, Clipboard, Award, Crown, Medal, Check, X, Settings
} from 'lucide-react';
import { BackButton } from '@/components/back-button';
import { AppLoader } from '@/components/app-loader';
import { useAppData } from '@/lib/app-data-context';

// === KPI standalone app: link back to main nc-link app ===
// Used by standalone kpi-app (angiang2026-nhom.vercel.app) to open /quan-ly sheets
// in an iframe overlay (cross-origin to nc-link.vercel.app).
// In main app (standalone=false), unused — iframe src uses relative '/quan-ly?sheet=xxx&admin=1'.
const MAIN_APP_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_MAIN_APP_URL) || 'https://nc-link.vercel.app';
const buildMainUrl = (path: string) => MAIN_APP_URL.endsWith('/') ? MAIN_APP_URL + path.replace(/^\//, '') : MAIN_APP_URL + path;

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
.kpi-app { background: transparent; font-family: Tahoma, Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: var(--fg); overflow-x: hidden; -webkit-font-smoothing: antialiased; min-height: 100vh; position: relative; z-index: 1; }
.kpi-app .bg-scene { display: none; }
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
.kpi-app .hero-title { font-family: Tahoma, Arial, Helvetica, sans-serif; font-size: clamp(1.4rem, 5.5vw, 3rem); font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: 0; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; background: linear-gradient(135deg, #ffffff 0%, #c0e8ff 28%, #60b8ff 54%, #40e898 82%, #c0fff0 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.kpi-app .hero-sub { font-size: 11px; font-weight: 800; color: #e0c060; text-transform: uppercase; letter-spacing: .18em; margin-top: 4px; }
.kpi-app .main-header { display: flex; align-items: center; gap: 6px; position: relative; }
.kpi-app .main-header .btn-back-u { flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,.06); color: #9a9184; display: flex; align-items: center; justify-content: center; border: 1px solid #ffffff14; transition: all .2s; }
.kpi-app .main-header .btn-back-u:hover { color: #6cc78a; background: rgba(108,199,138,.12); border-color: #6cc78a44; }
/* Admin button (lock icon) — replaces BackButton on KPI main header */
.kpi-app .main-header .btn-admin-u { flex-shrink: 0; width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,.06); color: #c0a060; display: flex; align-items: center; justify-content: center; border: 1px solid #ffffff14; transition: all .2s; cursor: pointer; }
.kpi-app .main-header .btn-admin-u:hover { color: #ffd040; background: rgba(255,208,64,.12); border-color: #ffd04044; }
.kpi-app .main-header .btn-admin-u.authed { color: #6cc78a; border-color: #6cc78a44; background: rgba(108,199,138,.10); }
.kpi-app .main-header .btn-admin-u.authed:hover { color: #8ee0a8; background: rgba(108,199,138,.18); }
.kpi-app .main-header > div { flex: 1; text-align: center; }
.kpi-app .main-header > .btn-back-u + div { margin-right: 46px; }
.kpi-app .main-header > .btn-admin-u + div { margin-right: 46px; }

/* Controls */
.kpi-app .ctrl-bar { display: flex; gap: 10px; margin-top: 16px; flex-wrap: nowrap; align-items: center; position: relative; }
.kpi-app .ctrl-select-wrap { position: static; }
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
.kpi-app .ctrl-select-popup { position: absolute; top: calc(100% + 8px); left: 0; right: 0; width: auto; max-width: none; background: #0f2040ee; border: 1px solid #2a5a8a; border-radius: 14px; box-shadow: 0 18px 36px #00000066; backdrop-filter: blur(14px); padding: 10px; display: none; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 6px; z-index: 30; max-height: 260px; overflow-y: auto; }
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
.kpi-app .cty-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 3px; margin-top: 10px; }
.kpi-app .cty-stat { border-radius: 5px; padding: 4px 3px 4px; text-align: center; border: none; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 38px; }
.kpi-app .cty-stat-label { font-size: 7px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; color: rgba(255,255,255,.85); line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; letter-spacing: .03em; }
.kpi-app .cty-stat-val { font-size: 13px; font-weight: 800; line-height: 1.05; white-space: nowrap; color: #fff; }
.kpi-app .cty-stat-sub { font-size: 0.55em; font-weight: 700; opacity: .7; margin-left: 1px; }
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
.kpi-app .nav-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 18px; }
.kpi-app .nav-row-3 { display: contents; }
.kpi-app .nav-btn { padding: 10px 8px; border-radius: 12px; border: 1px solid rgba(255,255,255,.16); cursor: pointer; font-family: inherit; font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; color: #fff; display: flex; align-items: center; justify-content: center; gap: 6px; transition: transform .18s ease, filter .18s ease, box-shadow .18s ease; position: relative; overflow: hidden; box-shadow: 0 5px 12px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.14); min-height: 52px; text-align: center; }
.kpi-app .nav-btn:hover { transform: translateY(-2px); filter: brightness(1.08); box-shadow: 0 10px 22px rgba(0,0,0,.55); }
.kpi-app .nav-btn:active { transform: translateY(0) scale(.98); filter: brightness(.92); box-shadow: 0 3px 8px rgba(0,0,0,.40); }
.kpi-app .nav-btn .nav-icon { font-size: 12px; line-height: 1; flex-shrink: 0; }
.kpi-app .nav-btn .nav-label { white-space: normal; line-height: 1.1; }
/* 6 nút — mỗi nút 1 màu solid, bỏ glow halo, chỉ giữ drop shadow đen */
.kpi-app .nav-detail { background: #2563EB; }   /* blue-600 */
.kpi-app .nav-plan   { background: #16A34A; }   /* green-600 */
.kpi-app .nav-race   { background: #0891B2; }   /* cyan-600 */
.kpi-app .nav-policy { background: #CA8A04; }   /* yellow-600 */
.kpi-app .nav-clb    { background: #EA580C; }   /* orange-600 */
.kpi-app .nav-target-reg { background: linear-gradient(135deg, #c89828, #a87818); } /* gold — ĐK mục tiêu */

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
  padding: 12px 12px;
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
  padding: 10px 12px;
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
  padding: 8px 0 10px;
  /* căn trái-phải bằng 0 để bảng AD dùng margin 12px — cùng lề với rg-head/rg-afyp-row */
}
.kpi-app .rg-ad-table {
  width: calc(100% - 24px); margin: 0 12px; border-collapse: separate; border-spacing: 0; font-size: 11px;
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

/* Region divider: TIẾN ĐỘ KHU VỰC — gold text + gold gradient lines, no bg fill */
.kpi-app .region-divider { display: flex; align-items: center; gap: 14px; margin: 32px 0 18px !important; padding: 0 4px; background: transparent !important; }
.kpi-app .region-divider::before, .kpi-app .region-divider::after { content: ''; flex: 1; height: 2px; background: linear-gradient(90deg, transparent, #d4a843, #ffd76b, #d4a843, transparent); }
.kpi-app .region-divider-title {
  font-size: 16px !important; font-weight: 900; text-transform: uppercase; letter-spacing: .15em;
  color: #ffd76b; white-space: nowrap;
  text-shadow: 0 1px 6px rgba(255,215,107,.35), 0 0 18px rgba(212,168,67,.30);
  padding: 4px 14px; border-radius: 4px;
  background: transparent; border: none; box-shadow: none;
}

/* ============= TIẾN ĐỘ KHU VỰC COLLAPSE ============= */
/* Make region-divider clickable: button-like with hover */
.kpi-app .region-divider.is-collapse-btn { cursor: pointer; user-select: none; transition: opacity .2s; }
.kpi-app .region-divider.is-collapse-btn:hover { opacity: .85; }
.kpi-app .region-divider.is-collapse-btn .region-divider-title {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 16px; border-radius: 6px;
  background: linear-gradient(135deg, rgba(212,168,67,.18), rgba(255,215,107,.10));
  border: 1px solid rgba(255,215,107,.30);
}
.kpi-app .region-divider.is-collapse-btn .region-divider-title .collapse-icon {
  display: inline-block; width: 14px; height: 14px; transition: transform .25s ease;
  border: solid #ffd76b; border-width: 0 2px 2px 0; padding: 2px; transform: rotate(45deg);
}
.kpi-app .region-divider.is-collapse-btn.collapsed .region-divider-title .collapse-icon {
  transform: rotate(-45deg);
}
/* Hidden content when collapsed — applied to wrapper containing the cards */
.kpi-app .khuvuc-region { display: grid; grid-template-rows: 1fr; overflow: hidden; opacity: 1; transform: translateY(0); transition: grid-template-rows .42s cubic-bezier(.22,1,.36,1), opacity .22s ease, transform .42s cubic-bezier(.22,1,.36,1), margin .42s ease; }
.kpi-app .khuvuc-region > * { min-height: 0; overflow: hidden; }
.kpi-app .khuvuc-region.collapsed { grid-template-rows: 0fr; height: 0 !important; opacity: 0; transform: translateY(-8px); margin-top: 0 !important; margin-bottom: 0 !important; pointer-events: none; }

/* ============= BANCA GOLD CIRCLES (15 ô tròn) — Wall of Fame style ============= */
/* User request (v2): bố trí so le, to nhỏ ngẫu hứng như bức tường vinh danh.
   Nền dark, ảnh chèn lên có hiệu ứng bắt mắt. 50% ô trống phía trên chứa ảnh,
   50% phía dưới để trống. */
.kpi-app .banca-imgs-section {
  margin-top: 14px;
  padding: 0;
  background:
    radial-gradient(ellipse at 20% 20%, rgba(255,215,107,.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 60%, rgba(192,132,252,.04) 0%, transparent 50%),
    linear-gradient(180deg, #0a0e1a 0%, #050810 100%);
  border: 1px solid rgba(255,215,107,.22);
  border-radius: 14px;
  /* Section cao cố định: 50% trên chứa ảnh (wall-of-fame), 50% dưới để trống */
  min-height: 80vh;
  display: flex; flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,215,107,.10);
}
/* Decorative gold top border accent */
.kpi-app .banca-imgs-section::before {
  content: '';
  position: absolute; top: 0; left: 8%; right: 8%; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,215,107,.6), rgba(212,168,67,.9), rgba(255,215,107,.6), transparent);
  z-index: 1;
}
.kpi-app .banca-imgs-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px 6px; flex-wrap: wrap; gap: 8px;
  position: relative; z-index: 2;
}
.kpi-app .banca-imgs-title {
  font-size: 11px; font-weight: 800; color: #ffd76b; letter-spacing: .12em;
  text-transform: uppercase; display: flex; align-items: center; gap: 6px;
  text-shadow: 0 0 12px rgba(255,215,107,.4);
}
.kpi-app .banca-imgs-wall {
  /* Wall-of-fame container: chiếm 50% phía trên của section.
     Dùng position: relative + absolute placement để ảnh so le ngẫu hứng. */
  position: relative;
  flex: 0 0 50%;
  min-height: 280px;
  margin: 0 8px;
  z-index: 2;
}
.kpi-app .banca-img-cell {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fff8d8, #f3d77a 60%, #b89838 100%);
  border: 3px solid #ffd76b;
  box-shadow:
    0 0 0 2px rgba(255,215,107,.18),
    0 4px 14px rgba(184,152,56,.40),
    0 0 20px rgba(255,215,107,.15);
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: transform .25s ease, box-shadow .25s ease, z-index 0s;
}
.kpi-app .banca-img-cell:hover {
  transform: scale(1.12) translateZ(0);
  box-shadow:
    0 0 0 3px rgba(255,215,107,.55),
    0 8px 24px rgba(184,152,56,.60),
    0 0 32px rgba(255,215,107,.40);
  z-index: 10;
}
.kpi-app .banca-img-cell img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.kpi-app .banca-img-cell .banca-img-placeholder {
  font-size: 10px; color: #7a5c14; font-weight: 800; text-align: center;
  padding: 2px; line-height: 1;
}
.kpi-app .banca-img-cell .banca-img-del {
  position: absolute; top: -4px; right: -4px;
  width: 18px; height: 18px;
  background: #ef4444; color: white;
  border: 2px solid #1a1a2e; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 900; cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,.5);
  opacity: 0; transition: opacity .2s;
}
.kpi-app .banca-img-cell:hover .banca-img-del { opacity: 1; }
.kpi-app .banca-img-cell.is-uploading { opacity: .5; pointer-events: none; }
.kpi-app .banca-img-empty-hint {
  text-align: center; font-size: 10px; color: #8a7530; font-style: italic;
  padding: 12px 14px;
  position: relative; z-index: 2;
}
/* Bottom 50% empty space — giữ trống theo yêu cầu user.
   Thêm subtle decoration để không bị trống trải. */
.kpi-app .banca-imgs-bottom-empty {
  flex: 0 0 50%;
  position: relative;
  background:
    repeating-linear-gradient(45deg, transparent 0, transparent 20px, rgba(255,215,107,.012) 20px, rgba(255,215,107,.012) 40px);
}
.kpi-app .banca-imgs-bottom-empty::after {
  content: '';
  position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
  width: 60px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,215,107,.30), transparent);
}
@media (max-width: 640px) {
  .kpi-app .banca-imgs-section { min-height: 70vh; }
  .kpi-app .banca-imgs-wall { min-height: 220px; }
  /* Mobile: ảnh nhỏ hơn để vừa màn hình */
  .kpi-app .banca-img-cell { transform: scale(.85) translate(-50%, -50%); transform-origin: 0 0; }
  .kpi-app .banca-img-cell:hover { transform: scale(.95) translate(-50%, -50%); }
}

/* ============= VINH DANH NGÔI SAO — 2 HẠNG ĐỒNG NHẤT ============= */
.kpi-app .banca-imgs-section { min-height: 680px; border-radius: 18px; }
.kpi-app .banca-imgs-header { padding: 18px 18px 6px; }
.kpi-app .banca-imgs-title { font-size: 14px; letter-spacing: .16em; }
.kpi-app .banca-imgs-wall { flex-basis: 62%; min-height: 410px; margin: 0 12px; }
.kpi-app .banca-imgs-wall::before, .kpi-app .banca-imgs-wall::after { position: absolute; left: 50%; transform: translateX(-50%); z-index: 1; display: inline-flex; white-space: nowrap; font-size: 10px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; padding: 5px 13px; border-radius: 999px; backdrop-filter: blur(4px); }
.kpi-app .banca-imgs-wall::before { content: '✦ NGÔI SAO BẠCH KIM ✦'; top: 1px; color: #e9f7ff; border: 1px solid rgba(213,239,255,.72); background: linear-gradient(135deg, rgba(225,245,255,.20), rgba(130,190,225,.10)); box-shadow: 0 0 18px rgba(177,224,255,.24); }
.kpi-app .banca-imgs-wall::after { content: '✦ NGÔI SAO VÀNG ✦'; top: 57%; color: #ffd76b; border: 1px solid rgba(255,215,107,.62); background: linear-gradient(135deg, rgba(255,215,107,.16), rgba(184,152,56,.10)); box-shadow: 0 0 18px rgba(255,215,107,.18); }
.kpi-app .banca-imgs-wall .banca-img-cell:nth-of-type(-n+8) { border-color: #d9f1ff; background: radial-gradient(circle at 30% 30%, #fff, #d7f0ff 58%, #719bb8 100%); box-shadow: 0 0 0 2px rgba(210,239,255,.20), 0 4px 16px rgba(136,204,242,.38), 0 0 26px rgba(194,232,255,.20); }
.kpi-app .banca-imgs-wall .banca-img-cell:nth-of-type(n+9) { border-color: #ffd76b; }
.kpi-app .banca-imgs-bottom-empty { flex-basis: 38%; }
@media (max-width: 640px) { .kpi-app .banca-imgs-section { min-height: 600px; } .kpi-app .banca-imgs-wall { min-height: 360px; } .kpi-app .banca-imgs-wall::before, .kpi-app .banca-imgs-wall::after { font-size: 8px; letter-spacing: .11em; padding: 4px 9px; } }

/* Admin modal grid (upload): dùng grid đều để dễ upload — khác với wall-of-fame ở section chính */
.kpi-app .banca-admin-modal .banca-imgs-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  align-content: center;
  justify-items: center;
  padding: 12px 4px;
}
.kpi-app .banca-admin-modal .banca-img-cell {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 90px;
  transform: none;
  left: auto; top: auto;
}
.kpi-app .banca-admin-modal .banca-img-cell:hover {
  transform: scale(1.05);
  z-index: auto;
}
.kpi-app .banca-admin-modal .banca-img-cell .banca-img-del {
  opacity: 1; /* luôn hiện trong modal để dễ xóa */
}
@media (max-width: 640px) {
  .kpi-app .banca-admin-modal .banca-imgs-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
}

/* ============= BANCA ADMIN MODAL (upload 15 ảnh) ============= */
.kpi-app .banca-admin-modal {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,.7); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.kpi-app .banca-admin-modal-inner {
  background: #0e1424; border: 1px solid rgba(255,215,107,.30);
  border-radius: 14px; padding: 20px;
  max-width: 720px; width: 100%; max-height: 85vh; overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
}
.kpi-app .banca-admin-modal-title {
  font-size: 14px; font-weight: 800; color: #ffd76b; text-transform: uppercase;
  letter-spacing: .08em; margin-bottom: 14px;
  display: flex; align-items: center; justify-content: space-between;
}

/* ============= ĐĂNG KÝ MỤC TIÊU THÁNG — button + popup ============= */
.kpi-app .target-reg-section {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255,255,255,.10);
}
.kpi-app .target-reg-btn {
  width: 100%;
  padding: 14px 18px;
  background: linear-gradient(135deg, #c89828 0%, #a87818 100%);
  color: #fff;
  border: none; border-radius: 10px;
  font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
  cursor: pointer; transition: transform .15s, box-shadow .15s;
  box-shadow: 0 4px 12px rgba(184,152,56,.30);
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.kpi-app .target-reg-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(184,152,56,.45); }
.kpi-app .target-reg-btn:active { transform: translateY(0); }

.kpi-app .tgr-modal {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,.75); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.kpi-app .tgr-modal-inner {
  background: #0e1424; border: 1px solid rgba(108,199,138,.30);
  border-radius: 14px; padding: 22px;
  max-width: 480px; width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
}
.kpi-app .tgr-modal-title {
  font-size: 14px; font-weight: 800; color: #6cc78a; text-transform: uppercase;
  letter-spacing: .08em; margin-bottom: 16px; text-align: center;
}
.kpi-app .tgr-choice-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;
}
.kpi-app .tgr-choice-btn {
  padding: 18px 12px; border-radius: 10px; border: 1px solid rgba(108,199,138,.30);
  background: rgba(108,199,138,.06); color: #6cc78a;
  font-size: 12px; font-weight: 700; cursor: pointer; transition: all .15s;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.kpi-app .tgr-choice-btn:hover {
  background: rgba(108,199,138,.18); transform: translateY(-2px);
  border-color: rgba(108,199,138,.60);
}
.kpi-app .tgr-choice-btn .tgr-choice-icon { font-size: 22px; }
.kpi-app .tgr-choice-btn .tgr-choice-sub { font-size: 9px; opacity: .7; font-weight: 500; }

.kpi-app .tgr-form { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }
.kpi-app .tgr-field { display: flex; flex-direction: column; gap: 4px; }
.kpi-app .tgr-field-label {
  font-size: 10px; font-weight: 700; color: #8ab8e0; text-transform: uppercase;
  letter-spacing: .06em;
}
.kpi-app .tgr-field-input,
.kpi-app .tgr-field-select {
  height: 38px; padding: 0 12px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.15);
  border-radius: 8px; color: #fff; font-size: 13px; font-weight: 600;
  outline: none; transition: border-color .15s;
  font-family: inherit;
}
.kpi-app .tgr-field-input:focus,
.kpi-app .tgr-field-select:focus { border-color: #6cc78a; }
.kpi-app .tgr-field-input:read-only { background: rgba(255,255,255,.03); color: #8ab8e0; }
.kpi-app .tgr-field-row { display: flex; gap: 10px; }
.kpi-app .tgr-field-row > .tgr-field { flex: 1; }
.kpi-app .tgr-field-suffix {
  font-size: 10px; color: #8ab8e0; font-weight: 600; padding-top: 4px;
}
.kpi-app .tgr-actions {
  display: flex; gap: 10px; margin-top: 6px;
}
.kpi-app .tgr-btn {
  flex: 1; height: 40px; border-radius: 8px; border: none;
  font-size: 12px; font-weight: 800; letter-spacing: .05em;
  cursor: pointer; transition: all .15s;
  display: flex; align-items: center; justify-content: center; gap: 6px;
}
.kpi-app .tgr-btn-cancel { background: rgba(255,255,255,.08); color: #c0c8d0; }
.kpi-app .tgr-btn-cancel:hover { background: rgba(255,255,255,.14); }
.kpi-app .tgr-btn-confirm { background: #6cc78a; color: #062a14; }
.kpi-app .tgr-btn-confirm:hover { background: #7ed3a0; }
.kpi-app .tgr-btn-confirm:disabled { opacity: .5; cursor: not-allowed; }

/* ============= TARGET REG LIST VIEW ============= */
.kpi-app .tgr-list-shell { margin-top: 0; margin-left: auto; margin-right: auto; max-width: 100%; padding: 0 4px; }
.kpi-app .tgr-list-table-wrap {
  background: rgba(14,20,36,.6); border: 1px solid rgba(108,199,138,.18);
  border-radius: 12px; padding: 8px; margin-top: 12px;
}
.kpi-app .tgr-list-table-meta {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
  padding: 2px 2px 10px; color: #9bb2c8; font-size: 10px;
}
.kpi-app .tgr-list-table-meta em { color: #7890a8; font-size: 9px; font-style: italic; white-space: nowrap; }
.kpi-app .tgr-list-table { width: 100%; min-width: 700px; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
.kpi-app .tgr-list-table thead th {
  background: rgba(108,199,138,.10); color: #6cc78a;
  padding: 10px 8px; text-align: left; font-size: 10px; font-weight: 800;
  text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid rgba(108,199,138,.20);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.kpi-app .tgr-list-table tbody td {
  padding: 9px 8px; color: #e0e6ed; border-bottom: 1px solid rgba(255,255,255,.06);
  vertical-align: middle; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.kpi-app .tgr-list-table tbody tr:hover td { background: rgba(108,199,138,.04); }
.kpi-app .tgr-list-empty {
  text-align: center; padding: 30px 16px; color: #8a93a0; font-size: 12px; font-style: italic;
}
.kpi-app .tgr-list-actions { display: flex; gap: 6px; justify-content: flex-end; }
.kpi-app .tgr-list-action-btn {
  height: 26px; padding: 0 8px; border-radius: 6px; border: none;
  font-size: 10px; font-weight: 700; cursor: pointer; transition: all .15s;
  display: inline-flex; align-items: center; gap: 4px;
}
.kpi-app .tgr-list-action-btn.edit { background: rgba(108,199,138,.16); color: #6cc78a; }
.kpi-app .tgr-list-action-btn.edit:hover { background: rgba(108,199,138,.30); }
.kpi-app .tgr-list-action-btn.del { background: rgba(239,68,68,.16); color: #f87171; }
.kpi-app .tgr-list-action-btn.del:hover { background: rgba(239,68,68,.30); }

/* Mobile compact: smaller fonts/padding */
@media (max-width: 640px) {
  .kpi-app .tgr-list-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .kpi-app .tgr-list-table-meta { min-width: 700px; }
  .kpi-app .rg-head { padding: 10px 12px; }
  .kpi-app .rg-head-name { font-size: 11px; }
  .kpi-app .rg-head-pct { font-size: 15px; }
  .kpi-app .rg-afyp { font-size: 1.2rem; }
  .kpi-app .rg-sum-val { font-size: 14px; }
  .kpi-app .rg-sum-label { font-size: 8px; }
  .kpi-app .rg-ad-table thead th { font-size: 8px; padding: 5px 2px; }
  .kpi-app .rg-ad-table tbody td { font-size: 10px; padding: 6px 2px; }
  .kpi-app .rg-ad-mini-prog { width: 36px; }
  /* Đảm bảo bảng AD căn cùng lề 12px với header/AFYP row trên mobile */
  .kpi-app .rg-ad-table { width: calc(100% - 24px); margin: 0 12px; }
  .kpi-app .rg-afyp-row { padding: 10px 12px; }
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
  animation: adpFadeIn .2s ease-out;
}
@keyframes adpFadeIn { from { opacity: 0; } to { opacity: 1; } }

.kpi-app .adp-modal {
  width: 100%; max-width: 1080px;
  /* Chiều cao = 3× kích thước đã thu nhỏ (1/4 → 3/4 so với ban đầu) */
  height: calc(75vh - 18px); min-height: 450px; max-height: 570px;
  background: linear-gradient(180deg, #ffffff 0%, #f0f5fa 100%);
  border-radius: 8px; overflow: hidden;
  box-shadow: 0 16px 40px #00000066, 0 0 0 1px #c8d8ea;
  display: flex; flex-direction: column;
  transform: scale(.9);
  transform-origin: center center;
  animation: adpIn .24s cubic-bezier(.22, 1, .36, 1);
  will-change: transform, opacity;
}
@keyframes adpIn {
  from { opacity: 0; transform: scale(.18); }
  to   { opacity: 1; transform: scale(.9); }
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
  overflow: auto;
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
  font-size: 9px; font-weight: 800; color: #5a7088;
  text-transform: uppercase; letter-spacing: .03em;
  text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  width: 100%;
  line-height: 1.15;
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
    max-width: 100%; height: 75vh; min-height: 390px; max-height: 570px;
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
.kpi-app .cal-filter { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; margin-top: 10px; }
.kpi-app .cal-fbtn { padding: 4px 2px; border-radius: 6px; border: 1.2px solid #008080; background: #083636; color: #b9ffff; cursor: pointer; font-family: inherit; font-weight: 700; font-size: 8px; text-align: center; transition: all .2s; min-height: 24px; }
.kpi-app .cal-fbtn:hover { background: #0d4d4d; color: #f3ffff; }
.kpi-app .cal-fbtn.on { background: #008080; color: #003b3b; border-color: #008080; box-shadow: 0 0 10px #0080804d; font-weight: 900; }
.kpi-app .cal-wrap { background: #f7ffff; border-radius: 8px; overflow: hidden; box-shadow: 0 16px 40px #0000004d; border: 1px solid #00808066; border-bottom: 3px solid #008080; margin-top: 10px; }
.kpi-app .cal-head { background: #008080; color: #f7fffe; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; padding: 6px 0; display: grid; grid-template-columns: 42px minmax(0,1fr) 60px; text-align: center; border-radius: 8px 8px 0 0; }
.kpi-app .cal-head span { padding: 0 6px; display: flex; align-items: center; justify-content: center; min-height: 100%; }
.kpi-app .cal-row { display: grid; grid-template-columns: 42px minmax(0,1fr) 60px; gap: 0; border-bottom: 1px dashed #00808055; transition: background .2s; animation: cardSlideIn .4s ease-out both; background: #f7ffff; align-items: stretch; }
.kpi-app .cal-row:hover { background: #eef9f9; }
.kpi-app .cal-row.is-today { background: #e0f2fe; box-shadow: inset 0 0 0 2px #38bdf8; }
.kpi-app .cal-row.is-weekend { background: #e8f4f0; }
.kpi-app .cal-row.is-sunday { background: #f5e8e8; }
.kpi-app .cal-day { padding: 5px 4px; font-weight: 900; font-size: 11px; color: #008080; background: #f1fbfb; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.kpi-app .cal-day-num { line-height: 1; font-size: 11px; }
.kpi-app .cal-day-week { font-size: 7px; font-weight: 700; color: #5a7a99; line-height: 1; }
.kpi-app .cal-row.is-sunday .cal-day { color: #dc2626; background: #fde8e8; }
.kpi-app .cal-row.is-sunday .cal-day-week { color: #dc2626; }
.kpi-app .cal-row.is-weekend .cal-day { color: #ea580c; background: #fff0e0; }
.kpi-app .cal-row.is-weekend .cal-day-week { color: #ea580c; }
.kpi-app .cal-text { border-left: 1px solid #00808055; padding: 5px 7px; font-weight: 600; font-size: 10.5px; line-height: 1.25; color: #1a2e1a; display: flex; flex-direction: column; justify-content: center; gap: 2px; background: #f7ffff; }
.kpi-app .cal-owner { min-width: 50px; border-left: 1px solid #00808055; padding: 4px 3px; font-size: 8px; color: #2a3a2a; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-align: center; background: #f7ffff; word-break: break-word; }
.kpi-app .cal-empty { color: #94a3b8; font-style: italic; }
.kpi-app .cal-line { display: block; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
.kpi-app .cal-line.editable { cursor: pointer; padding: 2px 4px; border-radius: 3px; transition: background .12s, box-shadow .12s; }
.kpi-app .cal-line.editable.authed:hover { background: #fef9c3; box-shadow: 0 0 0 1px #facc15; }
.kpi-app .cal-line.editable.locked { cursor: pointer; }
.kpi-app .cal-line.editable.locked::before {
  content: '🔒';
  display: inline-block;
  margin-right: 4px;
  font-size: 9px;
  vertical-align: middle;
  opacity: 0.55;
}
.kpi-app .cal-line.editable.locked:hover { background: #f1f5f9; box-shadow: 0 0 0 1px #94a3b8; }
.kpi-app .cal-owner-tag {
  display: inline-block; padding: 1px 4px; border-radius: 3px;
  font-size: 7.5px; font-weight: 800; line-height: 1.2;
  max-width: 100%; white-space: normal; word-break: break-word; overflow-wrap: anywhere;
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
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px;
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

/* ============================================================
   DESKTOP LAYOUT — Redesigned for balanced, proportional UI
   Breakpoints:
   - @media (min-width: 900px)  → base desktop (laptop 1024–1399)
   - @media (min-width: 1400px) → large desktop (1440–1699)
   - @media (min-width: 1700px) → XL desktop (≥1700)
   Container max-width: 1280 / 1440 / 1560 — centered, never stretched
   ============================================================ */

/* === Base desktop (≥900px) === */
@media (min-width: 900px) {
  /* --- Layout shell --- */
  .kpi-app .mob-region-wrap { display: none; }
  .kpi-app .region-divider { display: flex !important; margin: 28px 0 16px; }
  .kpi-app .afyp-chart-wrap { display: block; }
  .kpi-app .app-wrap { max-width: 1280px; margin: 0 auto; padding: 28px 32px 48px; }
  .kpi-app #view-main { display: flex; flex-direction: column; gap: 0; padding: 0; max-width: 100%; margin: 0; }
  /* Khi #view-main không active (đang ở detail/calendar) → phải ẩn.
     Rule #view-main { display:flex } specificity cao hơn .view/.view.active,
     cần rule tường minh để đè lại khi không có class .active. */
  .kpi-app #view-main:not(.active) { display: none !important; }
  .kpi-app #view-main header { width: 100%; margin-bottom: 0; }

  /* --- Main header --- */
  .kpi-app .ctrl-select-wrap { position: static; }
  .kpi-app .ctrl-select-popup { left: auto; right: 0; width: 380px; max-width: calc(100vw - 64px); grid-template-columns: repeat(4, minmax(0,1fr)); }
  .kpi-app .main-header { display: flex; align-items: center; gap: 14px; }
  .kpi-app .main-header > .btn-back-u + div { margin-right: 0; }
  .kpi-app .main-header .btn-back-u { width: 36px; height: 36px; border-radius: 9px; }
  .kpi-app .hero-title { font-size: clamp(1.8rem, 2.4vw, 2.2rem) !important; margin: 0 !important; }
  .kpi-app .hero-sub { display: block; font-size: 11px !important; }
  .kpi-app .ctrl-bar { margin-top: 12px !important; gap: 14px; }
  .kpi-app .ctrl-hint { font-size: 11px; }
  .kpi-app .ctrl-select { height: 40px; padding: 0 16px; font-size: 12px; }
  .kpi-app .ctrl-select-period { padding: 0 18px; }
  .kpi-app .ctrl-select-period .ctrl-period-label { font-size: 15px; }
  .kpi-app .ctrl-select-opt { min-height: 38px; font-size: 12px; }
  .kpi-app .sync-status { width: 40px; height: 40px; }

  /* --- Notification banner: bigger, more readable --- */
  .kpi-app .kpi-notice-banner { height: 40px; }
  .kpi-app .kpi-notice-marquee { font-size: 13px; padding: 0 32px; }

  /* --- Nav grid: ẩn trên desktop (đã move vào split-center) --- */
  .kpi-app .nav-grid.mobile-only { display: none !important; }
  /* --- Nav grid desktop (bên trong split-center): 6 nút đều nhau --- */
  .kpi-app .nav-grid.dsk-nav { display: grid !important; grid-template-columns: repeat(6, 1fr); gap: 12px; width: 100%; margin: 0 0 16px; flex-wrap: nowrap; }
  .kpi-app .nav-grid.dsk-nav .nav-row-3 { display: contents; }
  .kpi-app .nav-grid.dsk-nav .nav-btn { padding: 12px 8px; font-size: 11px; min-height: 56px; }
  .kpi-app .nav-row-3 { display: contents; }
  .kpi-app .nav-btn { flex: 1; padding: 11px 14px; font-size: 12px; border-radius: 7px; white-space: nowrap; }
  .kpi-app .nav-btn .nav-icon svg { width: 18px; height: 18px; }

  /* --- Company strip — BỎ NỀN TỔNG (các ô đã tách biệt) --- */
  .kpi-app .dsk-company {
    display: flex; flex-direction: column; gap: 0;
    background: transparent;
    border: none;
    border-radius: 0;
    overflow: visible;
    margin-top: 20px;
    box-shadow: none;
  }
  .kpi-app .dsk-cty-top { display: grid; grid-template-columns: 280px 1fr; gap: 10px; padding: 0; }
  .kpi-app .dsk-cty-left { display: flex; flex-direction: column; border-radius: 9px; overflow: hidden; }
  .kpi-app .dsk-cty-main-head { padding: 9px 18px; background: linear-gradient(135deg, #f2b24d, #d4a030); display: flex; align-items: center; gap: 8px; }
  .kpi-app .dsk-cty-main-label { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .14em; color: #fff; }
  .kpi-app .dsk-cty-main-body { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 18px 22px; background: #132a4a; gap: 8px; }
  .kpi-app .dsk-cty-pct { font-size: 2.8rem; font-weight: 900; line-height: 1; color: #ffe0a0; text-shadow: 0 0 24px rgba(242,178,77,.32); }
  .kpi-app .dsk-cty-prog-wrap { margin-top: 4px; }
  .kpi-app .dsk-cty-prog { width: 100%; height: 10px; border-radius: 99px; background: #0d1e36; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,.4); }
  .kpi-app .dsk-cty-prog-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #40d890, #70f0b8); transition: width 1s cubic-bezier(.22,1,.36,1); box-shadow: 0 0 12px rgba(64,216,144,.4); }
  .kpi-app .dsk-cty-afyp { margin-top: 6px; font-size: 1.5rem; font-weight: 900; color: #fff; line-height: 1.1; }
  .kpi-app .dsk-cty-kh { font-size: .8rem; font-weight: 700; color: #6ab0e8; }
  .kpi-app .dsk-cty-right { display: flex; flex-direction: column; gap: 6px; }
  .kpi-app .dsk-cty-tier { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; flex: 1; }
  .kpi-app .dsk-cty-kpi { overflow: hidden; border-radius: 8px; display: flex; flex-direction: column; box-shadow: 0 2px 6px rgba(0,0,0,.2); }
  .kpi-app .dsk-cty-kpi-head { padding: 8px 10px; display: flex; align-items: center; justify-content: center; gap: 4px; }
  .kpi-app .dsk-cty-kpi-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; color: #fff; line-height: 1.2; white-space: nowrap; text-align: center; }
  .kpi-app .dsk-cty-kpi-sub { font-size: 0.7em; font-weight: 700; opacity: .75; margin-left: 2px; }
  .kpi-app .dsk-cty-kpi-body { background: #132a4a; flex: 1; display: flex; align-items: center; justify-content: center; padding: 14px 8px; text-align: center; }
  .kpi-app .dsk-cty-kpi-val { font-size: 1.35rem; font-weight: 800; line-height: 1; text-shadow: 0 0 10px currentColor; }
  .kpi-app .dsk-cty-kpi.hd .dsk-cty-kpi-head { background: #3a7cc8; } .kpi-app .dsk-cty-kpi.hd .dsk-cty-kpi-val { color: #7ab8f0; }
  .kpi-app .dsk-cty-kpi.td .dsk-cty-kpi-head { background: #8a7ab8; } .kpi-app .dsk-cty-kpi.td .dsk-cty-kpi-val { color: #b8a8e0; }
  .kpi-app .dsk-cty-kpi.chuan .dsk-cty-kpi-head { background: #2a9aaa; } .kpi-app .dsk-cty-kpi.chuan .dsk-cty-kpi-val { color: #60d0d8; }
  .kpi-app .dsk-cty-kpi.ip .dsk-cty-kpi-head { background: #c8a848; } .kpi-app .dsk-cty-kpi.ip .dsk-cty-kpi-val { color: #f0d070; }
  .kpi-app .dsk-cty-kpi.ns .dsk-cty-kpi-head { background: #5a9a68; } .kpi-app .dsk-cty-kpi.ns .dsk-cty-kpi-val { color: #80d890; }
  .kpi-app .dsk-cty-kpi.dl .dsk-cty-kpi-head { background: #a08050; } .kpi-app .dsk-cty-kpi.dl .dsk-cty-kpi-val { color: #e0b870; }
  .kpi-app .dsk-cty-kpi.sl .dsk-cty-kpi-head { background: #6a88a8; } .kpi-app .dsk-cty-kpi.sl .dsk-cty-kpi-val { color: #a0c0e0; }
  .kpi-app .dsk-cty-kpi.tbtn .dsk-cty-kpi-head { background: #7C3AED; } .kpi-app .dsk-cty-kpi.tbtn .dsk-cty-kpi-val { color: #c4b5fd; }
  .kpi-app .dsk-cty-progress { width: 100%; height: 5px; background: #0d1e36; }
  .kpi-app .dsk-cty-progress-fill { height: 100%; transition: width 1s cubic-bezier(.22,1,.36,1); background: linear-gradient(90deg, #40d890, #70f0b8); box-shadow: 0 0 8px rgba(64,216,144,.32); }

  /* --- Desktop split: 2 cột, cột PHẢI co giãn theo nội dung (không cắt AD)
     TRÁI (3fr): 5 nút nav + Công ty + Biểu đồ (chart fill phần còn lại)
     PHẢI (1fr): 4 phòng dọc — mỗi card cao theo nội dung AD, không bị ẩn --- */
  .kpi-app .desktop-split {
    display: grid; grid-template-columns: 3fr 1fr; gap: 20px;
    width: 100%; align-items: stretch; margin-top: 14px;
    /* Tăng height + min-height để 4 phòng có đủ chỗ hiển thị AD không bị ẩn */
    height: calc(100vh - 200px);
    min-height: 640px;
  }
  .kpi-app .split-left { display: none; }
  .kpi-app .split-center { display: flex; flex-direction: column; gap: 12px; min-width: 0; min-height: 0; height: 100%; }
  /* minmax(0, 1fr): 4 row BẰNG NHAU — row shrink được dưới content size.
     AD table scroll nội bộ (rg-ad-wrap overflow-y:auto) → không cắt info, không expand row. */
  .kpi-app .split-right { display: grid; grid-template-rows: repeat(4, minmax(0, 1fr)); gap: 10px; min-width: 0; height: 100%; padding-left: 4px; border-left: 1px solid rgba(255,255,255,.06); }
  /* Chart fill phần còn lại của split-center, co giãn được */
  .kpi-app .split-center .afyp-chart-wrap { flex: 1 1 0; min-height: 0; overflow: hidden; }
  .kpi-app .afyp-chart { min-height: 0 !important; flex: 1 1 0; }
  .kpi-app .afyp-chart-wrap { padding: 20px 22px 22px; border-radius: 14px; }
  .kpi-app .afyp-chart-title { font-size: .95rem; font-weight: 800; margin-bottom: 16px; gap: 10px; }
  .kpi-app .afyp-chart-title svg { width: 18px; height: 18px; }
  .kpi-app .afyp-chart-summary { gap: 10px; margin-bottom: 18px; }
  .kpi-app .sum-item { padding: 12px 12px; border-radius: 10px; }
  .kpi-app .sum-label { font-size: .65rem; margin-bottom: 5px; }
  .kpi-app .sum-val { font-size: 1rem; }
  .kpi-app .afyp-chart { min-height: 260px; }
  .kpi-app .chart-legend { gap: 16px; margin-top: 18px; }
  .kpi-app .legend-item { font-size: .78rem; }
  .kpi-app .legend-dot { width: 12px; height: 12px; }

  /* --- 4 ô PHÒNG xếp DỌC — BẰNG NHAU chiều cao, AD table scroll nội bộ nếu dài --- */
  /* dept-section fill 100% grid row height, overflow hidden để rg-card không grow vượt row */
  .kpi-app .dept-section { display: flex; min-width: 0; min-height: 0; height: 100%; overflow: hidden; }
  /* rg-card fill 100% dept-section, overflow hidden → clipped bởi grid row boundary */
  .kpi-app .dept-section > .rg-card,
  .kpi-app .dept-section > .banca-separator + .rg-card { flex: 1 1 0; width: 100%; min-width: 0; min-height: 0; height: 100%; overflow: hidden; }
  .kpi-app .rg-card { border-radius: 8px; display: flex; flex-direction: column; min-height: 0; height: 100%; }
  /* rg-ad-wrap scroll nội bộ — hiển thị ĐẦY ĐỦ content qua scroll, không cắt */
  .kpi-app .rg-card .rg-ad-wrap { overflow-y: auto; flex: 1 1 0; min-height: 0; }
  /* Các block fixed phía trên không co giãn, không shrink */
  .kpi-app .rg-card > .rg-head,
  .kpi-app .rg-card > .rg-afyp-row,
  .kpi-app .rg-card > .rg-prog,
  .kpi-app .rg-card > .rg-summary,
  .kpi-app .rg-card > .rg-divider { flex: 0 0 auto; }

  /* --- Region divider: ẩn trên desktop (đã bỏ theo yêu cầu user) --- */
  .kpi-app .region-divider { display: none !important; }

  /* --- Banca separator: ẩn trên desktop (rg-card.is-banca đã có border-top vàng).
     Nếu giữ separator sẽ ăn mất 15px height trong flex → card BANCA bị thấp hơn 3 card kia. --- */
  .kpi-app .split-right .banca-separator { display: none !important; }

  /* --- Department cards (rg-card) — typography cho cột hẹp, COMPACT để fit 141px height --- */
  .kpi-app .rg-head { padding: 6px 10px; }
  .kpi-app .rg-head-left { gap: 5px; }
  .kpi-app .rg-head-name { font-size: 10px; letter-spacing: .03em; line-height: 1.15; }
  .kpi-app .rg-head-pct { font-size: 14px; }
  .kpi-app .rg-afyp-row { padding: 3px 10px 4px; }
  .kpi-app .rg-afyp { font-size: .85rem; }
  .kpi-app .rg-afyp-unit { font-size: .55em; }
  .kpi-app .rg-kh { font-size: 8px; }
  .kpi-app .rg-prog { height: 4px; margin: 0 10px 4px; border-radius: 99px; }
  /* Summary: 1 row 4-col trên desktop để tiết kiệm chiều dọc cho AD table */
  .kpi-app .rg-summary { grid-template-columns: repeat(4, 1fr) !important; gap: 1px; }
  .kpi-app .rg-sum-cell { padding: 3px 2px; min-height: 26px; }
  .kpi-app .rg-sum-label { font-size: 7.5px; margin-bottom: 1px; }
  .kpi-app .rg-sum-val { font-size: 11px; }
  .kpi-app .rg-summary.rg-summary-2col { grid-template-columns: repeat(2, 1fr) !important; }
  .kpi-app .rg-divider { display: none; }
  .kpi-app .rg-ad-wrap { padding: 2px 0 4px; flex: 1 1 auto; min-height: 0; overflow-y: auto; }
  .kpi-app .rg-ad-table { width: calc(100% - 20px); margin: 0 10px; font-size: 9px; border-radius: 4px; }
  .kpi-app .rg-ad-table thead th { font-size: 8px; padding: 3px 3px; }
  .kpi-app .rg-ad-table thead th:first-child { padding-left: 8px; }
  .kpi-app .rg-ad-table tbody td { padding: 3px 3px; font-size: 9px; line-height: 1.1; }
  .kpi-app .rg-ad-table tbody td:first-child { padding-left: 8px; }
  .kpi-app .rg-ad-name { font-size: 9px; }
  .kpi-app .rg-ad-sub { font-size: 8px; }
  .kpi-app .rg-ad-afyp { font-size: 9px; }
  .kpi-app .rg-ad-afyp-unit { font-size: .6em; }
  .kpi-app .rg-ad-val { font-size: 9px; }
  .kpi-app .rg-ad-circle svg, .kpi-app .rg-ad-circle { width: 20px; height: 20px; }
  .kpi-app .rg-ad-circle-text { font-size: 7px; }
  .kpi-app .rg-ad-checkmark { width: 20px; height: 20px; }
  .kpi-app .rg-ad-checkmark svg { width: 12px; height: 12px; }
  .kpi-app .rg-banca-tvv-count { font-size: 9px; padding: 3px 6px; }

  /* --- Hidden legacy desktop blocks --- */
  .kpi-app .kpi-phong { display: none !important; }
  .kpi-app .kpi-ad.is-phong { display: none !important; }
  .kpi-app .ad-grid { display: none !important; }
  .kpi-app .dsk-ad-wrap { display: none !important; }

  /* --- Detail view --- */
  .kpi-app #view-detail { padding: 0; }
  .kpi-app #view-detail .detail-shell { max-width: 100%; width: 100%; margin: 0 auto; padding: 0; }
  .kpi-app .sub-header { padding: 0 0 10px; }
  .kpi-app .sub-title { font-size: 24px; }
  .kpi-app .detail-meta { font-size: 14px; margin-top: 8px; }
  .kpi-app .month-grid { grid-template-columns: repeat(9, 1fr); gap: 6px; margin-top: 16px; max-width: 720px; margin-left: auto; margin-right: auto; }
  .kpi-app .month-cell { padding: 10px 4px; }
  .kpi-app .mc-label { font-size: 12px; }
  .kpi-app .top3-section { margin-top: 28px; }
  .kpi-app .top3-grid { max-width: 880px; gap: 18px; }
  .kpi-app .top3-card { padding: 18px 14px 14px; border-radius: 14px; }
  .kpi-app .top3-rank { font-size: 15px; margin-bottom: 8px; }
  .kpi-app .top3-rank-num { width: 24px; height: 24px; font-size: 12px; }
  .kpi-app .top3-name { font-size: 13px; margin-bottom: 7px; }
  .kpi-app .top3-val { font-size: 14px; margin-bottom: 5px; }
  .kpi-app .top3-pct { font-size: 12px; }
  .kpi-app .top3-first { padding-top: 22px; padding-bottom: 18px; }
  .kpi-app .top3-first .top3-name { font-size: 14px; }
  .kpi-app .top3-first .top3-val { font-size: 16px; }
  .kpi-app .detail-divider { margin: 28px 0 18px; }
  .kpi-app .detail-ad-filter-wrap { margin: 0 0 18px; }
  .kpi-app .detail-ad-filter-btn { padding: 10px 18px; font-size: 12px; border-radius: 99px; }
  .kpi-app .detail-ad-filter-label { font-size: 13px; }
  .kpi-app .detail-ad-filter-caret { font-size: 11px; }
  .kpi-app .detail-ad-filter-popup { width: 320px; padding: 10px; gap: 5px; }
  .kpi-app .detail-ad-filter-opt { min-height: 40px; font-size: 13px; border-radius: 7px; }
  .kpi-app #view-detail .detail-list-wrap { display: flex; flex-direction: column; gap: 8px; max-width: 100%; width: 100%; margin: 0 auto; }
  .kpi-app .grp-item { padding: 12px 16px 11px; border-radius: 12px; }
  .kpi-app .grp-head-line { gap: 8px; }
  .kpi-app .grp-head-line .grp-name { font-size: 14px; }
  .kpi-app .grp-tn-inline { font-size: 12px; }
  .kpi-app .grp-head-line .grp-pct { font-size: 16px; }
  .kpi-app .grp-stats-inline { gap: 6px; font-size: 13px; }
  .kpi-app .grp-prog { height: 8px; border-radius: 99px; }
  .kpi-app #view-detail .dt-phong { max-width: 100%; margin-left: 0; margin-right: 0; }

  /* --- Calendar view --- */
  .kpi-app #view-calendar { padding: 0; }
  .kpi-app #view-calendar .cal-filter { max-width: 720px; margin: 18px auto 0; grid-template-columns: repeat(6, 1fr); gap: 6px; }
  .kpi-app .cal-fbtn { padding: 10px 4px; font-size: 12px; border-radius: 7px; }
  .kpi-app #view-calendar .cal-wrap { max-width: 920px; margin: 18px auto 0; border-radius: 12px; }
  .kpi-app .cal-head { font-size: 11px; padding: 10px 0; grid-template-columns: 64px minmax(0,1fr) 90px; }
  .kpi-app .cal-head span { padding: 0 10px; }
  .kpi-app .cal-row { grid-template-columns: 64px minmax(0,1fr) 90px; }
  .kpi-app .cal-day { padding: 10px 6px; font-size: 14px; gap: 2px; }
  .kpi-app .cal-day-num { font-size: 15px; }
  .kpi-app .cal-day-week { font-size: 9px; }
  .kpi-app .cal-text { padding: 8px 12px; }
  .kpi-app .cal-line { font-size: 13px; padding: 5px 11px; border-radius: 6px; margin-bottom: 4px; }
  .kpi-app .cal-owner { padding: 8px 8px; display: flex; flex-direction: column; gap: 3px; align-items: center; justify-content: center; }
  .kpi-app .cal-owner-tag { font-size: 11px; padding: 3px 8px; border-radius: 99px; }
}

/* === Large desktop (≥1400px) — wider container, more breathing room === */
@media (min-width: 1400px) {
  .kpi-app .app-wrap { max-width: 1440px; padding: 36px 40px 56px; }
  .kpi-app .hero-title { font-size: 2.4rem !important; }
  .kpi-app .hero-sub { font-size: 12px !important; }
  .kpi-app .ctrl-bar { margin-top: 14px !important; }
  .kpi-app .ctrl-select { height: 42px; font-size: 13px; }
  .kpi-app .ctrl-select-period .ctrl-period-label { font-size: 16px; }
  .kpi-app .nav-btn { padding: 13px 18px; font-size: 13px; }
  .kpi-app .kpi-notice-banner { height: 44px; }
  .kpi-app .kpi-notice-marquee { font-size: 14px; }
  .kpi-app .dsk-company { margin-top: 24px; }
  .kpi-app .dsk-cty-top { grid-template-columns: 320px 1fr; gap: 14px; }
  .kpi-app .dsk-cty-tier { gap: 14px; }
  .kpi-app .dsk-cty-main-head { padding: 11px 22px; }
  .kpi-app .dsk-cty-main-label { font-size: 12px; }
  .kpi-app .dsk-cty-main-body { padding: 22px 26px; gap: 10px; }
  .kpi-app .dsk-cty-pct { font-size: 3.2rem; }
  .kpi-app .dsk-cty-prog { height: 12px; }
  .kpi-app .dsk-cty-afyp { font-size: 1.7rem; }
  .kpi-app .dsk-cty-kh { font-size: .85rem; }
  .kpi-app .dsk-cty-kpi-head { padding: 10px 12px; }
  .kpi-app .dsk-cty-kpi-label { font-size: 11px; }
  .kpi-app .dsk-cty-kpi-body { padding: 18px 10px; }
  .kpi-app .dsk-cty-kpi-val { font-size: 1.55rem; }
  /* Desktop split: 2 cột (3/4 + 1/4) — nới gap cho màn lớn, min-height (cho grow) */
  .kpi-app .desktop-split { gap: 24px; height: calc(100vh - 250px); min-height: 540px; }
  .kpi-app .split-center { gap: 14px; }
  .kpi-app .split-right { gap: 12px; }
  .kpi-app .nav-grid.dsk-nav { gap: 14px; }
  .kpi-app .afyp-chart-wrap { padding: 24px 26px 26px; }
  .kpi-app .afyp-chart-title { font-size: 1.05rem; margin-bottom: 18px; }
  .kpi-app .sum-val { font-size: 1.1rem; }
  /* Chart min-height đã bị bỏ ở base desktop — để flex co giãn tự do */
  /* Compact rg-card typography (override ≥900px base, vẫn compact để fit card height) */
  .kpi-app .rg-head { padding: 7px 11px; }
  .kpi-app .rg-head-name { font-size: 11px; }
  .kpi-app .rg-head-pct { font-size: 15px; }
  .kpi-app .rg-afyp-row { padding: 4px 11px 5px; }
  .kpi-app .rg-afyp { font-size: .95rem; }
  .kpi-app .rg-kh { font-size: 9px; }
  .kpi-app .rg-prog { margin: 0 11px 5px; }
  /* Summary: 1 row 4-col trên desktop lớn */
  .kpi-app .rg-summary { grid-template-columns: repeat(4, 1fr) !important; }
  .kpi-app .rg-sum-cell { padding: 4px 3px; min-height: 30px; }
  .kpi-app .rg-sum-label { font-size: 8px; }
  .kpi-app .rg-sum-val { font-size: 12px; }
  .kpi-app .rg-summary.rg-summary-2col { grid-template-columns: repeat(2, 1fr) !important; }
  .kpi-app .rg-divider { display: none; }
  .kpi-app .rg-ad-wrap { padding: 2px 0 4px; flex: 1 1 auto; min-height: 0; overflow-y: auto; }
  .kpi-app .rg-ad-table { width: calc(100% - 22px); margin: 0 11px; font-size: 10px; }
  .kpi-app .rg-ad-table thead th { font-size: 9px; padding: 4px 4px; }
  .kpi-app .rg-ad-table thead th:first-child { padding-left: 9px; }
  .kpi-app .rg-ad-table tbody td { padding: 4px 4px; font-size: 10px; line-height: 1.15; }
  .kpi-app .rg-ad-table tbody td:first-child { padding-left: 9px; }
  .kpi-app .rg-ad-name { font-size: 10px; }
  .kpi-app .rg-ad-sub { font-size: 8px; }
  .kpi-app .rg-ad-afyp { font-size: 10px; }
  .kpi-app .rg-ad-val { font-size: 10px; }
  .kpi-app .rg-ad-circle svg, .kpi-app .rg-ad-circle { width: 22px; height: 22px; }
  .kpi-app .rg-ad-circle-text { font-size: 8px; }
  .kpi-app .rg-ad-checkmark { width: 22px; height: 22px; }
  .kpi-app .rg-ad-checkmark svg { width: 14px; height: 14px; }
  .kpi-app .sub-title { font-size: 28px; }
  .kpi-app .top3-grid { max-width: 980px; gap: 22px; }
  .kpi-app .top3-card { padding: 22px 18px 18px; }
  .kpi-app .top3-name { font-size: 15px; }
  .kpi-app .top3-val { font-size: 16px; }
  .kpi-app .top3-first .top3-name { font-size: 16px; }
  .kpi-app .top3-first .top3-val { font-size: 18px; }
  .kpi-app #view-calendar .cal-wrap { max-width: 1040px; }
  .kpi-app #view-calendar .cal-filter { max-width: 820px; }
  .kpi-app .cal-head { font-size: 12px; padding: 12px 0; grid-template-columns: 72px minmax(0,1fr) 100px; }
  .kpi-app .cal-row { grid-template-columns: 72px minmax(0,1fr) 100px; }
  .kpi-app .cal-day-num { font-size: 17px; }
  .kpi-app .cal-day-week { font-size: 10px; }
  .kpi-app .cal-line { font-size: 14px; padding: 6px 12px; }
  .kpi-app .cal-owner-tag { font-size: 12px; padding: 4px 10px; }
}

/* === XL desktop (≥1700px) — cap container to avoid over-stretching === */
@media (min-width: 1700px) {
  .kpi-app .app-wrap { max-width: 1560px; padding: 44px 48px 64px; }
  .kpi-app .hero-title { font-size: 2.6rem !important; }
  .kpi-app .desktop-split { gap: 28px; height: calc(100vh - 240px); min-height: 680px; }
  .kpi-app .split-center { gap: 16px; }
  .kpi-app .split-right { gap: 14px; }
  .kpi-app .nav-grid.dsk-nav { gap: 16px; }
  .kpi-app .dsk-cty-top { grid-template-columns: 360px 1fr; }
  .kpi-app .dsk-cty-tier { gap: 16px; }
  .kpi-app .dsk-cty-pct { font-size: 3.4rem; }
  .kpi-app .dsk-cty-kpi-val { font-size: 1.7rem; }
  .kpi-app .afyp-chart { min-height: 360px; }
  /* rg-card typography giữ nguyên compact từ ≥1400px (đã phù hợp) — không override nữa */
  .kpi-app .sub-title { font-size: 30px; }
  .kpi-app #view-calendar .cal-wrap { max-width: 1160px; }
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
  .kpi-app .nav-grid { gap: 10px; margin-top: 18px; }
  .kpi-app .nav-btn { padding: 9px 8px; border-radius: 6px; font-size: 9.5px; min-height: 42px; }
  .kpi-app .ad-top { grid-template-columns: 80px minmax(0, 1fr); gap: 6px; }
  .kpi-app .ad-name { font-size: 11px; }
  .kpi-app .ad-pct { font-size: 11px; }
  .kpi-app .ad-stat-label { font-size: 5.5px; }
  .kpi-app .ad-stat-val { font-size: 9px; }
  .kpi-app .ad-progress { margin-top: 3px; height: 3px; }
  .kpi-app .cal-filter { grid-template-columns: repeat(6, 1fr); gap: 2px; }
  .kpi-app .cal-fbtn { padding: 3px 1px; border-radius: 5px; min-height: 20px; font-size: 7px; }
  .kpi-app .cal-row { grid-template-columns: 38px minmax(0,1fr) 52px; }
  .kpi-app .cal-head { grid-template-columns: 38px minmax(0,1fr) 52px; padding: 5px 0; font-size: 8px; }
  .kpi-app .cal-day { padding: 4px 3px; font-size: 10px; }
  .kpi-app .cal-day-num { font-size: 10px; }
  .kpi-app .cal-day-week { font-size: 6.5px; }
  .kpi-app .cal-text { padding: 4px 5px; font-size: 9px; }
  .kpi-app .cal-owner { padding: 3px 2px; font-size: 7px; }
  .kpi-app .cal-owner-tag { font-size: 6.5px; padding: 1px 3px; }
  .kpi-app .month-grid { grid-template-columns: repeat(9, 1fr); gap: 3px; margin-top: 10px; }
  .kpi-app .month-cell { padding: 5px 1px; border-radius: 6px; min-height: 28px; }
  .kpi-app .month-cell .mc-label { font-size: 8px; }
  .kpi-app .main-header .btn-back-u { width: 34px; height: 34px; }
}

/* ============= BANCA YELLOW SEPARATOR ============= */
.kpi-app .banca-separator {
  grid-column: 1 / -1;
  height: 3px;
  background: linear-gradient(90deg, transparent 0%, #f5c842 8%, #ffd700 50%, #f5c842 92%, transparent 100%);
  box-shadow: 0 0 8px rgba(245, 200, 66, 0.65), 0 0 16px rgba(255, 215, 0, 0.35);
  border-radius: 2px;
  margin: 8px 0 4px;
  position: relative;
}
.kpi-app .banca-separator::before,
.kpi-app .banca-separator::after {
  content: '';
  position: absolute;
  top: 50%; transform: translateY(-50%);
  width: 8px; height: 8px;
  background: #ffd700;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.8), 0 0 14px rgba(255, 215, 0, 0.4);
}
.kpi-app .banca-separator::before { left: 6px; }
.kpi-app .banca-separator::after { right: 6px; }

.kpi-app .rg-card.is-banca.is-clickable { cursor: pointer; transition: transform .15s, box-shadow .15s; }
.kpi-app .rg-card.is-banca.is-clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 0 2px #ffd700aa, 0 14px 30px rgba(10,30,60,.24), 0 0 28px #ffd70066;
}
.kpi-app .rg-card.is-banca .rg-head-hint {
  margin-left: auto;
  font-size: 9px; font-weight: 700; opacity: 0.85;
  padding: 2px 8px;
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.28);
  border-radius: 10px;
  white-space: nowrap;
}

/* ============= BANCA POPUP (no summary, only detail table) ============= */
.kpi-app .adp-modal.is-banca-modal {
  /* Same look as AD modal but slimmer (no top section) */
}
.kpi-app .adp-modal.is-banca-modal .adp-body {
  grid-template-rows: 1fr;
}
.kpi-app .adp-modal.is-banca-modal .adp-header {
  background: linear-gradient(135deg, #c89828 0%, #a87818 100%);
  border-bottom: 2px solid #806010;
}

/* ============= DESKTOP COMPANY + NAV — CÙNG KHUNG, CÙNG NHỊP ============= */
@media (min-width: 900px) {
  .kpi-app .split-center { width: 100%; }
  .kpi-app .nav-grid.dsk-nav,
  .kpi-app .dsk-company { width: 100%; box-sizing: border-box; }
  .kpi-app .nav-grid.dsk-nav {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 7px;
    margin: 0 0 10px;
    padding: 7px;
    border: 1px solid rgba(102, 160, 205, .24);
    border-radius: 14px;
    background: linear-gradient(145deg, rgba(13, 34, 60, .72), rgba(7, 20, 38, .58));
    box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 8px 20px rgba(0,0,0,.16);
  }
  .kpi-app .nav-grid.dsk-nav .nav-btn {
    min-height: 50px;
    padding: 7px 8px;
    border-radius: 10px;
    flex-direction: column;
    gap: 3px;
    font-size: 10px;
    line-height: 1.12;
    white-space: normal;
    box-shadow: 0 3px 8px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.11);
  }
  .kpi-app .nav-grid.dsk-nav .nav-btn .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .kpi-app .nav-grid.dsk-nav .nav-btn .nav-icon svg { width: 16px; height: 16px; }
  .kpi-app .nav-grid.dsk-nav .nav-btn.nav-target-reg {
    background: linear-gradient(135deg, #bf9130, #8f661b) !important;
    border-color: rgba(255,215,107,.34);
  }
  .kpi-app .dsk-company { margin-top: 0; }
  .kpi-app .dsk-cty-top { gap: 10px; }
  .kpi-app .dsk-cty-left,
  .kpi-app .dsk-cty-kpi { border-radius: 14px; }
  .kpi-app .dsk-cty-main-head { border-radius: 14px 14px 0 0; }
  .kpi-app .dsk-cty-main-body { border-radius: 0 0 14px 14px; }
}

/* ============= DESKTOP KPI V2 — CÂN ĐỐI, KHÔNG CẮT NỘI DUNG ============= */
@media (min-width: 900px) {
  .kpi-app .app-wrap { max-width: 1440px; }
  .kpi-app .desktop-split {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr);
    height: auto !important;
    min-height: 0 !important;
    margin-top: 16px;
    gap: 0;
  }
  .kpi-app .split-center { height: auto; gap: 16px; }
  .kpi-app .nav-grid.dsk-nav {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 2px;
  }
  .kpi-app .nav-grid.dsk-nav .nav-btn {
    min-height: 58px;
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 11px;
    white-space: normal;
  }
  .kpi-app .dsk-company { margin-top: 2px; }
  .kpi-app .dsk-cty-top { grid-template-columns: minmax(240px, .9fr) minmax(0, 2.1fr); }
  .kpi-app .split-center .afyp-chart-wrap { flex: none; min-height: 350px; }
  .kpi-app .region-divider.is-collapse-btn {
    display: flex !important;
    grid-column: 1 / -1 !important;
    width: 100%;
    margin: 24px 0 12px !important;
  }
  .kpi-app .khuvuc-region {
    grid-column: 1 / -1 !important;
    width: 100%;
    height: auto;
  }
  .kpi-app .khuvuc-region:not(.collapsed) { margin-top: 4px !important; }
  .kpi-app .split-right {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: none;
    gap: 16px;
    height: auto;
    padding-left: 0;
    border-left: 0;
  }
  .kpi-app .dept-section { height: 360px; min-height: 360px; }
  .kpi-app .dept-section > .rg-card,
  .kpi-app .dept-section > .banca-separator + .rg-card { height: 100%; }
  .kpi-app .rg-card { border-radius: 14px; }
  .kpi-app .rg-head { padding: 10px 14px; }
  .kpi-app .rg-head-name { font-size: 12px; }
  .kpi-app .rg-head-pct { font-size: 17px; }
  .kpi-app .rg-afyp-row { padding: 8px 14px; }
  .kpi-app .rg-summary { grid-template-columns: repeat(4, 1fr) !important; }
  .kpi-app .rg-sum-cell { padding: 7px 4px; min-height: 38px; }
  .kpi-app .rg-sum-label { font-size: 8px; }
  .kpi-app .rg-sum-val { font-size: 13px; }
  .kpi-app .rg-ad-wrap { padding: 6px 0 8px; }
  .kpi-app .rg-ad-table { width: calc(100% - 24px); margin: 0 12px; font-size: 10px; }
  .kpi-app .rg-ad-table thead th,
  .kpi-app .rg-ad-table tbody td { padding: 5px 4px; font-size: 10px; }
}
@media (min-width: 1400px) {
  .kpi-app .nav-grid.dsk-nav { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .kpi-app .desktop-split { margin-top: 18px; }
  .kpi-app .split-right { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kpi-app .dept-section { height: 380px; min-height: 380px; }
}

/* ============= VINH DANH LƯỚI ĐỀU — BẠCH KIM 1 HÀNG, VÀNG 3 HÀNG ============= */
.kpi-app .banca-imgs-wall {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 24px;
  width: min(100% - 32px, 440px);
  min-height: auto !important;
  margin: 8px auto 0;
  padding: 8px 0 18px;
}
.kpi-app .honour-tier { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.kpi-app .honour-tier-title {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 28px; padding: 0 14px; border-radius: 999px;
  font-size: 10px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase;
}
.kpi-app .honour-tier.platinum .honour-tier-title {
  color: #eaf8ff; border: 1px solid rgba(213,239,255,.78);
  background: linear-gradient(135deg, rgba(225,245,255,.22), rgba(130,190,225,.12));
  box-shadow: 0 0 18px rgba(177,224,255,.24);
}
.kpi-app .honour-tier.gold .honour-tier-title {
  color: #ffd76b; border: 1px solid rgba(255,215,107,.68);
  background: linear-gradient(135deg, rgba(255,215,107,.18), rgba(184,152,56,.10));
  box-shadow: 0 0 18px rgba(255,215,107,.18);
}
.kpi-app .honour-image-grid {
  /* Mỗi hàng chứa tối đa 5 ảnh; ô, khe và lề ngoài luôn đối xứng. */
  display: grid; grid-template-columns: repeat(5, 55px); gap: 11px;
  justify-content: center; align-items: center; width: max-content; max-width: 100%;
  margin: 0 auto;
}
.kpi-app .banca-imgs-wall .banca-img-cell {
  position: relative !important; left: auto !important; top: auto !important;
  /* Nhỏ hơn 30% so với cỡ cũ 78px. */
  width: 55px !important; height: 55px !important; transform: none !important;
  flex: 0 0 55px; border-width: 2px; cursor: default;
}
.kpi-app .banca-imgs-wall .banca-img-cell:hover { transform: translateY(-3px) !important; }
.kpi-app .honour-tier.platinum .banca-img-cell {
  border-color: #d9f1ff; background: radial-gradient(circle at 30% 30%, #fff, #d7f0ff 58%, #719bb8 100%);
  box-shadow: 0 0 0 2px rgba(210,239,255,.20), 0 4px 16px rgba(136,204,242,.38), 0 0 26px rgba(194,232,255,.20);
}
.kpi-app .honour-tier.gold .banca-img-cell { border-color: #ffd76b; }
@media (max-width: 640px) {
  .kpi-app .banca-imgs-wall { width: min(100% - 20px, 360px); gap: 18px; }
  .kpi-app .honour-image-grid { grid-template-columns: repeat(5, 43px); gap: 8px; }
  .kpi-app .banca-imgs-wall .banca-img-cell { width: 43px !important; height: 43px !important; flex-basis: 43px; border-width: 2px; }
  .kpi-app .honour-tier-title { font-size: 8px; letter-spacing: .10em; }
}

/* ============= VINH DANH RỖNG — THU GỌN, KHÔNG CHỒNG NHÃN ============= */
.kpi-app .banca-imgs-wall::before,
.kpi-app .banca-imgs-wall::after { content: none !important; display: none !important; }
.kpi-app .banca-imgs-section.is-empty {
  min-height: 0 !important;
  padding-bottom: 14px;
}
.kpi-app .banca-imgs-section.is-empty .banca-imgs-wall,
.kpi-app .banca-imgs-section.is-empty .banca-imgs-bottom-empty { display: none; }
.kpi-app .banca-imgs-section.is-empty .banca-imgs-header { padding: 18px 20px 4px; }

/* ============= DESKTOP VINH DANH — KHỐI TRUNG TÂM ============= */
@media (min-width: 900px) {
  .kpi-app .desktop-honour-layout {
    grid-column: 1 / -1;
    width: 100%;
    display: block !important;
    margin: 34px 0 12px;
  }
  .kpi-app .desktop-honour-layout > div:first-child {
    width: min(100%, 1120px);
    margin: 0 auto;
    gap: 20px !important;
  }
  .kpi-app .desktop-honour-layout .banca-imgs-section {
    min-height: 590px;
    border: 1px solid rgba(255, 215, 107, .35);
    border-radius: 22px;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(213,239,255,.12), transparent 36%),
      radial-gradient(ellipse at 20% 85%, rgba(255,215,107,.08), transparent 34%),
      linear-gradient(160deg, #10182b 0%, #070c16 68%, #03060c 100%);
    box-shadow: 0 24px 64px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.11);
  }
  .kpi-app .desktop-honour-layout .banca-imgs-header {
    justify-content: center;
    padding: 24px 24px 10px;
  }
  .kpi-app .desktop-honour-layout .banca-imgs-title {
    font-size: 16px;
    letter-spacing: .22em;
  }
  .kpi-app .desktop-honour-layout .banca-imgs-wall {
    min-height: 400px;
    flex-basis: 68%;
    width: min(100% - 48px, 860px);
    margin: 0 auto;
  }
  .kpi-app .desktop-honour-layout .banca-imgs-bottom-empty {
    flex-basis: 32%;
  }
  .kpi-app .desktop-honour-layout .target-reg-section {
    width: min(100%, 520px);
    align-self: center;
    margin: 0 auto 8px;
    padding-top: 0;
    border-top: 0;
  }
  .kpi-app .desktop-honour-layout .target-reg-btn {
    min-height: 54px;
    border: 1px solid rgba(255,215,107,.55);
    border-radius: 14px;
    background: linear-gradient(135deg, #f0c75e 0%, #bd8520 48%, #85530f 100%);
    box-shadow: 0 12px 28px rgba(184,132,32,.30), inset 0 1px 0 rgba(255,255,255,.38);
  }
  .kpi-app .desktop-honour-layout .target-reg-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 34px rgba(184,132,32,.42), inset 0 1px 0 rgba(255,255,255,.42);
  }
}

/* ============= VINH DANH GỌN THEO NỘI DUNG ============= */
/* Không giữ khoảng trống cố định: viền dưới tự lên theo số ảnh đang có. */
.kpi-app .banca-imgs-section,
.kpi-app .desktop-honour-layout .banca-imgs-section {
  min-height: 0 !important;
  height: auto !important;
}
.kpi-app .banca-imgs-bottom-empty { display: none !important; }
.kpi-app .banca-imgs-wall,
.kpi-app .desktop-honour-layout .banca-imgs-wall {
  flex: 0 0 auto !important;
  min-height: 0 !important;
  padding: 4px 0 22px;
}
.kpi-app .honour-tier { gap: 8px; }
.kpi-app .honour-tier-title {
  width: min(100%, 520px);
  min-height: 18px;
  padding: 0;
  border: 0 !important;
  border-radius: 0;
  background: transparent !important;
  box-shadow: none !important;
  display: grid;
  grid-template-columns: minmax(18px, 1fr) auto minmax(18px, 1fr);
  align-items: center;
  gap: 10px;
  font-size: 9px;
  line-height: 1;
  letter-spacing: .12em;
}
.kpi-app .honour-tier-title::before,
.kpi-app .honour-tier-title::after {
  content: '';
  display: block;
  height: 1px;
}
.kpi-app .honour-tier.platinum .honour-tier-title::before {
  background: linear-gradient(90deg, transparent, rgba(218,242,255,.46));
}
.kpi-app .honour-tier.platinum .honour-tier-title::after {
  background: linear-gradient(90deg, rgba(218,242,255,.46), transparent);
}
.kpi-app .honour-tier.gold .honour-tier-title::before {
  background: linear-gradient(90deg, transparent, rgba(255,215,107,.46));
}
.kpi-app .honour-tier.gold .honour-tier-title::after {
  background: linear-gradient(90deg, rgba(255,215,107,.46), transparent);
}
@media (max-width: 640px) {
  .kpi-app .honour-tier-title { width: min(100%, 300px); font-size: 7.5px; gap: 8px; }
  .kpi-app .banca-imgs-wall { padding-bottom: 16px; }
}

/* ============= VINH DANH — PHÂN CÁCH + HỒ SƠ NGÔI SAO ============= */
.kpi-app .honour-divider {
  position: relative; width: min(calc(100% - 44px), 760px); height: 1px;
  margin: 22px auto; background: linear-gradient(90deg, transparent, rgba(255,215,107,.36) 22%, rgba(255,231,153,.68) 50%, rgba(255,215,107,.36) 78%, transparent);
  box-shadow: 0 1px 10px rgba(255,215,107,.16);
}
.kpi-app .honour-divider::after {
  content: ''; position: absolute; left: 50%; top: 50%; width: 54px; height: 12px;
  transform: translate(-50%, -50%); border-radius: 999px;
  background: radial-gradient(ellipse, rgba(255,239,177,.92) 0%, rgba(255,215,107,.38) 32%, transparent 72%);
  filter: blur(1px); pointer-events: none;
}
.kpi-app .honour-profile-modal {
  position: fixed; inset: 0; z-index: 320;
  display: flex; align-items: center; justify-content: center; padding: 16px;
  background: rgba(3,8,16,.76); backdrop-filter: blur(5px);
}
.kpi-app .honour-profile-card {
  position: relative; display: grid; grid-template-columns: 144px minmax(0, 1fr); align-items: center; gap: 20px;
  width: min(100%, 540px); min-height: 178px; padding: 18px 44px 18px 18px;
  border: 1px solid rgba(255,215,107,.34); border-radius: 16px;
  background: linear-gradient(135deg, #1b2a43 0%, #10192b 52%, #080e1a 100%);
  box-shadow: 0 24px 70px rgba(0,0,0,.56), inset 0 1px 0 rgba(255,255,255,.07);
}
.kpi-app .honour-profile-card::before {
  /* Vạch ngăn rõ ràng giữa ảnh bên trái và thông tin bên phải. */
  content: ''; position: absolute; left: 172px; top: 22px; bottom: 22px; width: 1px;
  background: linear-gradient(transparent, rgba(255,215,107,.62), transparent);
}
.kpi-app .honour-profile-card > img {
  width: 144px; height: 144px; object-fit: cover; border-radius: 50%;
  border: 3px solid #ffd76b; box-shadow: 0 0 0 3px rgba(255,215,107,.15), 0 10px 26px rgba(0,0,0,.34);
}
.kpi-app .honour-profile-close {
  position: absolute; top: 8px; right: 10px; width: 28px; height: 28px;
  color: #dce8f4; font-size: 20px; line-height: 1; border-radius: 50%;
  background: rgba(255,255,255,.08);
}
.kpi-app .honour-profile-info { align-self: center; min-width: 0; }
.kpi-app .honour-profile-kicker { color: #ffd76b; font-size: 9px; font-weight: 900; letter-spacing: .14em; }
.kpi-app .honour-profile-info h3 { margin: 5px 0 4px; color: #fff; font-size: 20px; line-height: 1.18; }
.kpi-app .honour-profile-title { margin: 0; color: #a9d9ff; font-weight: 700; font-size: 13px; }
.kpi-app .honour-profile-note { margin: 9px 0 0; color: #b9c7d8; font-size: 12px; line-height: 1.55; white-space: pre-wrap; }
.kpi-app .banca-profile-editor {
  margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255,215,107,.20);
}
.kpi-app .banca-profile-editor-head { display: flex; align-items: center; justify-content: space-between; color: #ffd76b; font-size: 12px; font-weight: 800; }
.kpi-app .banca-profile-editor-head button { font-size: 20px; color: #dce8f4; }
.kpi-app .banca-profile-editor-grid { display: grid; grid-template-columns: 96px minmax(0,1fr); gap: 14px; margin-top: 12px; }
.kpi-app .banca-profile-preview { width: 96px; height: 96px; border: 2px solid rgba(255,215,107,.5); border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; color: #8ab8e0; font-size: 10px; text-align: center; }
.kpi-app .banca-profile-preview img { width: 100%; height: 100%; object-fit: cover; }
.kpi-app .banca-profile-fields { display: flex; flex-direction: column; gap: 7px; }
.kpi-app .banca-profile-fields input, .kpi-app .banca-profile-fields textarea { width: 100%; border: 1px solid rgba(255,255,255,.14); border-radius: 7px; background: rgba(255,255,255,.06); color: #fff; padding: 8px 9px; font: inherit; font-size: 12px; resize: vertical; }
.kpi-app .banca-profile-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.kpi-app .banca-profile-action { min-height: 30px; padding: 0 9px; border-radius: 7px; background: rgba(255,255,255,.10); color: #e5eef8; font-size: 10px; font-weight: 800; }
.kpi-app .banca-profile-action.save { background: #5cae7e; color: #062a14; }
.kpi-app .banca-profile-action.danger { background: rgba(239,68,68,.17); color: #ff9f9f; }
@media (max-width: 560px) {
  /* Giữ dạng danh thiếp ngang cả trên điện thoại: ảnh trái, thông tin phải. */
  .kpi-app .honour-profile-card { grid-template-columns: 96px minmax(0,1fr); gap: 14px; min-height: 132px; padding: 16px 36px 16px 16px; text-align: left; }
  .kpi-app .honour-profile-card::before { left: 124px; top: 16px; bottom: 16px; }
  .kpi-app .honour-profile-card > img { margin: 0; width: 96px; height: 96px; }
  .kpi-app .honour-profile-kicker { font-size: 8px; letter-spacing: .10em; }
  .kpi-app .honour-profile-info h3 { margin-top: 4px; font-size: 16px; }
  .kpi-app .honour-profile-title { font-size: 11px; }
  .kpi-app .honour-profile-note { margin-top: 6px; font-size: 10px; line-height: 1.45; }
  .kpi-app .banca-profile-editor-grid { grid-template-columns: 72px minmax(0,1fr); }
  .kpi-app .banca-profile-preview { width: 72px; height: 72px; }
}

/* ============= SCROLLING NOTIFICATION BANNER ============= */
/* Banner full viewport width — vượt ra khỏi .app-wrap (max-width 860/1100px) */
.kpi-app .kpi-notice-banner {
  position: relative;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  margin-top: 0;
  margin-bottom: 8px;
  border-radius: 0;
  overflow: hidden;
  background: linear-gradient(90deg, #fff3c0 0%, #ffd966 25%, #ffc34d 50%, #ffd966 75%, #fff3c0 100%);
  background-size: 200% 100%;
  animation: kpiNoticeShine 6s linear infinite;
  border-top: 1.5px solid #d4a017;
  border-bottom: 1.5px solid #d4a017;
  box-shadow: 0 2px 10px rgba(212, 160, 23, 0.35), inset 0 1px 0 rgba(255,255,255,0.5);
  height: 36px;
  display: flex;
  align-items: center;
}
@keyframes kpiNoticeShine {
  0%   { background-position: 0% 0%; }
  100% { background-position: 200% 0%; }
}
.kpi-app .kpi-notice-banner::before {
  content: '📢';
  position: absolute;
  left: 12px; top: 50%; transform: translateY(-50%);
  font-size: 16px;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
  z-index: 2;
}
.kpi-app .kpi-notice-marquee {
  display: inline-block;
  white-space: nowrap;
  padding-left: 36px;
  font-weight: 800;
  font-size: 14px;
  color: #0b5d1f;
  text-shadow: 0 1px 0 rgba(255,255,255,0.4);
  /* Animation: chạy ngay khi load. Bắt đầu ở translateX(0%) (tức ngay cạnh 📢),
     trượt sang trái -100% (hết chữ), rồi lặp lại.
     Duration 18s cho ~1 vòng. */
  animation: kpiNoticeScroll 18s linear infinite;
  letter-spacing: 0.02em;
  will-change: transform;
}
@keyframes kpiNoticeScroll {
  0%   { transform: translateX(0%); }
  100% { transform: translateX(-100%); }
}
.kpi-app .kpi-notice-banner:hover .kpi-notice-marquee {
  animation-play-state: paused;
}
@media (max-width: 720px) {
  .kpi-app .kpi-notice-banner { height: 30px; }
  .kpi-app .kpi-notice-marquee { font-size: 12px; padding-left: 30px; }
}

/* ===== Popup Loading =====
   Popup nhỏ ở giữa màn hình khi vừa mở trang KPI.
   Tự động biến mất (fade + scale out) khi app đã load xong dữ liệu. */
.kpi-splash {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(4, 18, 32, .62);
  backdrop-filter: blur(8px) saturate(110%);
  -webkit-backdrop-filter: blur(8px) saturate(110%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  opacity: 1;
  transition: opacity .4s cubic-bezier(.22,1,.36,1);
}
.kpi-splash.exiting {
  opacity: 0;
  pointer-events: none;
}
.kpi-splash.exiting .kpi-splash-card {
  transform: translateY(8px) scale(.96);
  opacity: 0;
}
.kpi-splash-card {
  position: relative;
  width: min(340px, 88vw);
  padding: 28px 24px 22px;
  border-radius: 20px;
  background: linear-gradient(160deg, rgba(20, 40, 64, .96) 0%, rgba(10, 28, 48, .96) 100%);
  border: 1px solid rgba(255, 255, 255, .08);
  box-shadow:
    0 20px 60px rgba(0, 0, 0, .55),
    0 0 0 1px rgba(94, 232, 156, .08),
    inset 0 1px 0 rgba(255, 255, 255, .06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
  opacity: 1;
  transform: translateY(0) scale(1);
  transition: transform .45s cubic-bezier(.22,1,.36,1), opacity .45s cubic-bezier(.22,1,.36,1);
  overflow: hidden;
}
.kpi-splash-card::before {
  content: '';
  position: absolute;
  top: -40%; left: 50%;
  transform: translateX(-50%);
  width: 280px; height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(94, 232, 156, .14) 0%, transparent 60%);
  pointer-events: none;
}
.kpi-splash-logo {
  position: relative;
  z-index: 1;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ffd66a 0%, #f2b24d 55%, #b07820 100%);
  box-shadow: 0 6px 20px rgba(242, 178, 77, .35), inset 0 2px 4px rgba(255, 255, 255, .4);
  animation: splashPulse 1.6s ease-in-out infinite;
}
.kpi-splash-logo svg {
  color: #fff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .35));
}
@keyframes splashPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.07); }
}
.kpi-splash-text { position: relative; z-index: 1; }
.kpi-splash-title {
  font-size: 15px;
  font-weight: 800;
  line-height: 1.2;
  color: #f0f4f8;
  letter-spacing: .01em;
}
.kpi-splash-sub {
  font-size: 10px;
  font-weight: 700;
  color: #e0c060;
  text-transform: uppercase;
  letter-spacing: .18em;
  margin-top: 4px;
}
.kpi-splash-spinner {
  position: relative;
  z-index: 1;
  width: 28px;
  height: 28px;
  margin-top: 2px;
}
.kpi-splash-spinner::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2.5px solid rgba(94, 232, 156, .18);
  border-top-color: #5ee89c;
  animation: splashSpin .85s linear infinite;
}
@keyframes splashSpin {
  to { transform: rotate(360deg); }
}
.kpi-splash-hint {
  position: relative;
  z-index: 1;
  font-size: 11px;
  color: #8a9ab0;
  font-style: italic;
}

/* ================= KPI EMBED OVERLAY =================
   Overlay full-screen hiển thị iframe /quan-ly?sheet=xxx&from=kpi
   khi user bấm 1 trong 3 nút (Thi đua / Chính sách / CLB).
   - Header cố định trên top có nút Back + title + nút mở tab mới
   - Body chứa iframe full-width, full-height (calc 100vh - header height)
   - Z-index cao hơn splash để đè lên dashboard. */
.kpi-embed-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #0a1424;
  display: flex;
  flex-direction: column;
  animation: kpiEmbedIn .22s ease-out;
}
@keyframes kpiEmbedIn { from { opacity: 0; } to { opacity: 1; } }
.kpi-embed-header {
  flex-shrink: 0;
  height: 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  background: linear-gradient(135deg, #0f2040, #15264a);
  border-bottom: 1px solid #2a5a8a;
  box-shadow: 0 2px 8px rgba(0,0,0,.4);
}
.kpi-embed-back {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 34px;
  padding: 0 12px 0 8px;
  border-radius: 8px;
  border: 1px solid #2a5a8a;
  background: rgba(108,199,138,.08);
  color: #6cc78a;
  font-family: inherit;
  font-weight: 800;
  font-size: 12px;
  cursor: pointer;
  transition: all .15s;
}
.kpi-embed-back:hover {
  background: rgba(108,199,138,.18);
  border-color: #6cc78a;
  color: #8ee0a8;
}
.kpi-embed-back:active { transform: scale(.96); }
.kpi-embed-title {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 900;
  color: #e0f4ff;
  text-transform: uppercase;
  letter-spacing: .04em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kpi-embed-title svg { color: #ffd76b; flex-shrink: 0; }
.kpi-embed-open {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #2a5a8a;
  background: rgba(108,168,232,.08);
  color: #6ca8e8;
  cursor: pointer;
  transition: all .15s;
}
.kpi-embed-open:hover {
  background: rgba(108,168,232,.18);
  border-color: #6ca8e8;
  color: #8ec0f0;
}
.kpi-embed-open:active { transform: scale(.96); }
.kpi-embed-body {
  flex: 1;
  min-height: 0;
  position: relative;
  background: #0a1424;
}
.kpi-embed-iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #0a1424;
}
@media (max-width: 480px) {
  .kpi-embed-header { height: 44px; padding: 0 8px; gap: 6px; }
  .kpi-embed-back { height: 30px; padding: 0 10px 0 6px; font-size: 11px; }
  .kpi-embed-back span { display: none; }
  .kpi-embed-back::after { content: 'Quay lại'; font-size: 11px; font-weight: 800; }
  .kpi-embed-title { font-size: 12px; gap: 4px; }
  .kpi-embed-open { width: 30px; height: 30px; }
}


/* ============= TIÊU ĐỀ VINH DANH TRÊN VIỀN KHUNG ============= */
.kpi-app .banca-imgs-section,
.kpi-app .desktop-honour-layout .banca-imgs-section {
  position: relative;
  overflow: visible !important;
  margin-top: 34px;
}
.kpi-app .banca-imgs-header,
.kpi-app .desktop-honour-layout .banca-imgs-header {
  position: absolute !important;
  inset: 0 0 auto !important;
  z-index: 8;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  min-height: 0;
  padding: 0 !important;
  pointer-events: none;
  transform: translateY(-50%);
}
.kpi-app .banca-imgs-title {
  display: inline-flex;
  position: relative;
  z-index: 1;
  padding: 0 14px;
  background: #090d17;
  white-space: nowrap;
  pointer-events: auto;
}
.kpi-app .banca-imgs-header > button {
  position: absolute;
  right: 14px;
  pointer-events: auto;
}
.kpi-app .banca-imgs-wall,
.kpi-app .desktop-honour-layout .banca-imgs-wall {
  margin-top: 14px;
}
.kpi-app .banca-imgs-section.is-empty .banca-imgs-header {
  padding: 0 !important;
}
@media (max-width: 640px) {
  .kpi-app .banca-imgs-section,
  .kpi-app .desktop-honour-layout .banca-imgs-section { margin-top: 28px; }
  .kpi-app .banca-imgs-title { padding: 0 9px; font-size: 10px; letter-spacing: .11em; }
  .kpi-app .banca-imgs-header > button { right: 8px; }
}


/* ============= KPI MOBILE + DESKTOP: VINH DANH VÀ BIỂU ĐỒ ============= */
/* Mobile: năm ô luôn chiếm vừa bề ngang, ảnh co giãn cùng kích thước. */
@media (max-width: 640px) {
  .kpi-app .banca-imgs-wall {
    width: calc(100% - 20px) !important;
    max-width: 440px;
    margin-left: auto;
    margin-right: auto;
  }
  .kpi-app .honour-image-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    width: 100% !important;
    max-width: none !important;
    gap: clamp(5px, 2vw, 8px) !important;
  }
  .kpi-app .banca-imgs-wall .banca-img-cell {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1 / 1;
    min-width: 0;
    flex: 0 0 auto !important;
  }
}
/* Desktop: biểu đồ và vinh danh là hai nửa cân bằng, cùng hàng. */
@media (min-width: 900px) {
  .kpi-app .split-center {
    display: grid !important;
    grid-template-columns: minmax(0, 1.06fr) minmax(0, .94fr);
    align-items: start;
    column-gap: 20px;
    row-gap: 16px;
  }
  .kpi-app .split-center > .nav-grid,
  .kpi-app .split-center > .dsk-company {
    grid-column: 1 / -1;
  }
  .kpi-app .split-center > .afyp-chart-wrap {
    grid-column: 1;
    margin: 0 !important;
    min-height: 100%;
  }
  .kpi-app .split-center > .desktop-honour-layout {
    grid-column: 2;
    width: 100% !important;
    display: block !important;
    margin: 0 !important;
  }
  .kpi-app .split-center > .desktop-honour-layout > div:first-child {
    width: 100% !important;
    margin: 0 !important;
    gap: 12px !important;
  }
  .kpi-app .split-center .desktop-honour-layout .banca-imgs-section {
    min-height: 0 !important;
    border-radius: 18px;
  }
  .kpi-app .split-center .desktop-honour-layout .banca-imgs-wall {
    width: min(100% - 26px, 390px);
    min-height: 0 !important;
    padding-bottom: 16px;
  }
  .kpi-app .split-center .desktop-honour-layout .honour-image-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    width: 100%;
    gap: 8px;
  }
  .kpi-app .split-center .desktop-honour-layout .banca-img-cell {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 1 / 1;
    flex-basis: auto;
  }
  .kpi-app .split-center .desktop-honour-layout .target-reg-section {
    width: 100%;
    margin: 0;
  }
  .kpi-app .afyp-chart-wrap { border-radius: 18px; padding: 16px; }
  .kpi-app .afyp-chart { height: 270px; }
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

// Helper: kiểm tra position có phải TB/TN (Trưởng Ban / Trưởng Nhóm) — loại TTN
// Dùng cho DS TB/TN (leaders table) — KHÔNG fallback, không lấy từ DS TVV
function isTBorTNPosition(position: string | null | undefined): boolean {
  const p = (position || '').toLowerCase().trim();
  if (!p) return false;
  if (p.includes('tiền trưởng nhóm') || p.includes('trưởng tổ nhóm') || p === 'ttn' || p.includes('ttn ') || p.includes(' ttn')) return false;
  if (p.includes('trưởng ban') || p.includes('trưởng nhóm')) return true;
  const tokens = p.split(/[\s,;/|\\-]+/).filter(Boolean);
  return tokens.includes('tb') || tokens.includes('tn');
}

interface ADData { ten: string; managerKey: string; afyp: number; kh: number; lhd: number; td: number; hdChuan: number; tyTrong: number; }
interface PhongData { ten: string; afyp: number; kh: number; lhd: number; td: number; hdChuan: number; tyTrong: number; ads: ADData[]; noAds: boolean; tvvCount?: number; }
interface TotalData { afyp: number; kh: number; lhd: number; td: number; hdChuan: number; tyTrong: number; totalIP: number; slHD: number; nangSuat: number; doLonHD: number; }
interface GroupDetail { name: string; maBanNhom: string; tenAD: string; maAD: string; tenPhong: string; maPhong: string; afyp: number; kh: number; pct: number; tnName: string; }

/* ================= CONSTANTS ================= */
const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const WEEKDAY_NAMES = ['CN','T2','T3','T4','T5','T6','T7'];

/* ================= CUSTOM DATE PICKER (light theme, matches cal-field-input) ================= */
/* Dùng thay cho <input type="date"> native vì native picker trên iOS Safari / một số Android
 * có bug: khi chọn ngày từ picker, value truyền về bị parse sai → auto nhảy về tháng 01.
 * Custom picker này kiểm soát hoàn toàn giá trị YYYY-MM-DD, không phụ thuộc trình duyệt. */
const CAL_PICKER_WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const CAL_PICKER_MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function CalDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);
  // View state: năm/tháng đang xem trong popup (không phụ thuộc value)
  const [viewYear, setViewYear] = useState(() => {
    if (value) { const d = new Date(value); if (!isNaN(d.getTime())) return d.getFullYear(); }
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) { const d = new Date(value); if (!isNaN(d.getTime())) return d.getMonth(); }
    return new Date().getMonth();
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Khi value thay đổi (form mở mới / sửa entry khác) và popup đang đóng → sync view về tháng của value
  useEffect(() => {
    if (!open && value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value, open]);

  // Đóng popup khi click ngoài
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest('[data-cal-picker-popup]')
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleOpen = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const showAbove = spaceBelow < 320 && r.top > spaceBelow;
      setPopupPos({
        left: r.left,
        width: r.width,
        top: showAbove ? r.top - 310 : r.bottom + 4,
      });
    }
    setOpen(o => !o);
  };

  const handleDaySelect = (day: number, yOverride?: number, mOverride?: number) => {
    const yy = yOverride ?? viewYear;
    const mm = mOverride ?? viewMonth;
    const ds = `${yy}-${String(mm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(ds);
    setOpen(false);
  };

  // Display: DD/MM/YYYY (vi-VN) nếu có value, ngược lại placeholder
  const displayValue = (() => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  })();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={containerRef} className="relative" style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="cal-field-input"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          textAlign: 'left', cursor: 'pointer', background: '#fff',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ color: value ? '#1a2e1a' : '#94a3b8', fontSize: 12 }}>
          {displayValue || 'Chọn ngày...'}
        </span>
        <CalendarDays size={14} style={{ color: '#008080' }} />
      </button>
      {open && popupPos && createPortal(
        <div
          data-cal-picker-popup
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: Math.max(8, popupPos.left - 20),
              top: popupPos.top,
              width: Math.max(popupPos.width + 40, 280),
              maxWidth: 'calc(100vw - 16px)',
              background: '#fff',
              border: '1.5px solid #008080',
              borderRadius: 10,
              boxShadow: '0 12px 40px rgba(0,0,0,0.25), 0 0 16px rgba(0,128,128,0.12)',
              padding: 12,
            }}
          >
            {/* Header: prev / month-year / next */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <button type="button" onClick={prevMonth} style={pickerNavBtnStyle}>‹</button>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#0d4d4d' }}>
                {CAL_PICKER_MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button type="button" onClick={nextMonth} style={pickerNavBtnStyle}>›</button>
            </div>
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #00808080, transparent)', marginBottom: 8 }} />
            {/* Weekday header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {CAL_PICKER_WEEKDAYS.map((w, i) => (
                <div key={i} style={{
                  textAlign: 'center', fontSize: 10, fontWeight: 800,
                  color: i === 0 ? '#dc2626' : '#475569', padding: '2px 0',
                }}>{w}</div>
              ))}
            </div>
            {/* Day grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {cells.map((day, i) => {
                if (day === null) return <div key={`e-${i}`} style={{ aspectRatio: '1.1' }} />;
                const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = ds === todayStr;
                const isSelected = ds === value;
                const dow = (firstDay + day - 1) % 7;
                const isSunday = dow === 0;
                return (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => handleDaySelect(day)}
                    style={{
                      aspectRatio: '1.1', borderRadius: 6, border: isSelected ? '2px solid #008080' : '1px solid #c8d8ea',
                      background: isSelected ? '#008080' : isToday ? '#00808015' : '#fff',
                      color: isSelected ? '#fff' : isSunday ? '#dc2626' : '#1a2e1a',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0,
                      boxShadow: isSelected ? '0 0 8px #00808040' : 'none',
                    }}
                  >{day}</button>
                );
              })}
            </div>
            {/* Quick actions */}
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" onClick={() => {
                setViewYear(today.getFullYear()); setViewMonth(today.getMonth());
                handleDaySelect(today.getDate(), today.getFullYear(), today.getMonth());
              }} style={{
                fontSize: 10, fontWeight: 700, color: '#fff', background: '#008080',
                border: 'none', borderRadius: 5, padding: '5px 8px', cursor: 'pointer',
              }}>Hôm nay</button>
              {value && (
                <button type="button" onClick={() => { onChange(''); setOpen(false); }} style={{
                  fontSize: 10, fontWeight: 700, color: '#dc2626', background: 'transparent',
                  border: '1px solid #dc262640', borderRadius: 5, padding: '5px 8px', cursor: 'pointer',
                }}>Xóa ngày</button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
const pickerNavBtnStyle: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 5, border: '1px solid #c8d8ea',
  background: '#f0fdfa', color: '#0d4d4d', fontSize: 16, fontWeight: 800,
  cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};

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

/* ================= MAIN COMPONENT =================
   `standalone` = true  → KPI tách (route /kpi-standalone): dành cho END-USER
     - Không có nút back về main app
     - Không có admin features (sync button, admin auth)
     - Iframe overlay không có "Mở tab mới" (user không được mở /quan-ly trực tiếp)
   `standalone` = false (default) → KPI0 (route /kpi): dành cho ADMIN
     - Có nút back về main app (`/`) LUÔN hiển thị
     - Có admin features khi đã login
     - Iframe overlay có "Mở tab mới"
*/

// 15 vị trí ngẫu nhiên-but-stable cho banca-imgs-wall (wall of fame style)
// Mỗi entry: { left%, top%, size px, zIndex }
// Bố trí so le, to nhỏ ngẫu hứng, không trùng lặp quá nhiều.
const BANCA_IMG_POSITIONS: Array<{ left: number; top: number; size: number; z: number }> = [
  // Ngôi sao Bạch Kim — hạng cao nhất
  { left: 7, top: 20, size: 66, z: 3 }, { left: 22, top: 31, size: 54, z: 2 }, { left: 38, top: 18, size: 74, z: 4 }, { left: 55, top: 32, size: 58, z: 3 }, { left: 72, top: 19, size: 50, z: 2 }, { left: 88, top: 31, size: 62, z: 3 }, { left: 14, top: 45, size: 56, z: 3 }, { left: 46, top: 46, size: 66, z: 4 },
  // Ngôi sao Vàng — hạng kế tiếp
  { left: 67, top: 66, size: 52, z: 2 }, { left: 84, top: 74, size: 64, z: 3 }, { left: 7, top: 72, size: 54, z: 2 }, { left: 24, top: 84, size: 60, z: 3 }, { left: 43, top: 70, size: 54, z: 2 }, { left: 58, top: 84, size: 64, z: 4 }, { left: 88, top: 88, size: 54, z: 3 },
];

export function KPIDashboard({ standalone = false }: { standalone?: boolean } = {}) {
  const router = useRouter();
  const [rawData, setRawData] = useState<{
    contracts: Contract[]; staff: Staff[]; revenue: Revenue[];
    leaders: LeaderInfo[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  // Splash screen overlay — chỉ hiện lần đầu khi app vừa mở, tự fade-out khi data sẵn sàng.
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashExiting, setSplashExiting] = useState(false);
  const [error, setError] = useState(false);
  const [view, setView] = useState<'main' | 'detail' | 'calendar' | 'target-reg-list'>('main');
  // ===== KPI EMBEDDED SHEET =====
  // Khi user bấm 1 trong 3 nút (Thi đua / Chính sách / CLB Sao Việt) — nội dung
  // sẽ được mở NGAY TRONG KPI app bằng iframe overlay đến /quan-ly?sheet=xxx&from=kpi.
  // /quan-ly đã có logic ẩn sidebar + nút Cài đặt khi from=kpi → user chỉ xem đúng sheet đó.
  // State default 'home' để tránh hydration mismatch (SSR cũng render 'home').
  const [kpiSheet, setKpiSheet] = useState<'home' | 'saoviet' | 'report' | 'clb-saoviet'>('home');
  // Cache-buster timestamp — mỗi lần mở sheet sẽ sinh timestamp mới để iframe
  // luôn fetch HTML mới nhất, tránh bị SW cache hoặc HTTP cache serving stale content.
  const [kpiSheetT, setKpiSheetT] = useState<number>(0);
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

  // ===== ADMIN AUTH =====
  // Admin login/logout NẰM Ở giao diện chính ứng dụng (/src/app/page.tsx).
  // Trang /kpi KHÔNG có nút admin riêng — user phải đăng nhập Admin ở trang chính.
  // Trạng thái đăng nhập chia sẻ qua sessionStorage('kpi_admin_authed').
  const [adminAuthed, setAdminAuthed] = useState(false);

  // On mount: check sessionStorage for existing admin auth
  // Đồng thời clear flag `kpi_embed` — cờ này chỉ được set khi user bấm link
  // từ KPI sang /quan-ly. Khi user đang ở KPI → không còn trong chế độ embed.
  // Nếu standalone=true (KPI tách) → set flag `kpi_standalone` để /quan-ly biết
  // mà quay về /kpi-standalone thay vì /kpi khi bấm nút "Trở về".
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('kpi_embed');
        if (standalone) {
          sessionStorage.setItem('kpi_standalone', '1');
        } else {
          sessionStorage.removeItem('kpi_standalone');
        }
        if (sessionStorage.getItem('kpi_admin_authed') === '1') {
          setAdminAuthed(true);
        }
      }
    } catch {}
  }, [standalone]);

  // Lắng nghe thay đổi sessionStorage từ trang khác (khi user đăng nhập/đăng xuất ở /)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'kpi_admin_authed') {
        setAdminAuthed(e.newValue === '1');
      }
    };
    window.addEventListener('storage', onStorage);
    // Poll mỗi 800ms — sessionStorage không trigger storage event trong cùng tab
    const poll = setInterval(() => {
      try {
        const v = sessionStorage.getItem('kpi_admin_authed') === '1';
        setAdminAuthed(prev => prev !== v ? v : prev);
      } catch {}
    }, 800);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(poll); };
  }, []);

  const [calPwdError, setCalPwdError] = useState(false);
  const [calEditOpen, setCalEditOpen] = useState(false);
  const [calEditForm, setCalEditForm] = useState<{ id: number | null; date: string; title: string; owners: string[]; ownerCustom: string }>({ id: null, date: '', title: '', owners: [], ownerCustom: '' });
  const [calEditSaving, setCalEditSaving] = useState(false);

  // ===== TIẾN ĐỘ KHU VỰC COLLAPSE =====
  // User request: cho phép thu gọn toàn bộ region từ "TIẾN ĐỘ KHU VỰC" đến hết card BANCA.
  // Click vào chữ "TIẾN ĐỘ KHU VỰC" để toggle.
  // Mặc định ẨN khi mở app (user request 2026-07-20).
  const [khuVucCollapsed, setKhuVucCollapsed] = useState(true);

  // ===== BANCA GOLD CIRCLES (15 ô tròn để admin upload ảnh) =====
  // User request: dưới card BANCA, thêm 1 khoảng trống (cao cỡ 50% viewport) chứa 15 hình tròn nhỏ
  // (gold border) bố trí đều. Chỉ ADMIN mới thấy & upload. Non-admin không thấy gì (không hiển thị khung trống).
  // 15 ảnh lưu trong PosterImage với key `kpi-banca-img-01` ... `kpi-banca-img-15`.
  const BANCA_IMG_COUNT = 15;
  const [bancaImages, setBancaImages] = useState<Record<string, string>>({}); // key -> cacheable image URL
  const [bancaImgUploading, setBancaImgUploading] = useState<string | null>(null);
  const [bancaImgAdminOpen, setBancaImgAdminOpen] = useState(false);
  const [bancaAdminSelectedKey, setBancaAdminSelectedKey] = useState<string | null>(null);
  const [bancaProfileOpenKey, setBancaProfileOpenKey] = useState<string | null>(null);
  const [bancaProfileSaving, setBancaProfileSaving] = useState(false);
  const [bancaProfiles, setBancaProfiles] = useState<Record<string, { name: string; title: string; note: string }>>({});
  const [honourLoading, setHonourLoading] = useState(true);

  // A single lightweight manifest guarantees that viewers receive every honour image
  // without downloading each binary once for checking and once again for display.
  useEffect(() => {
    let cancelled = false;
    const loadBancaImages = async () => {
      try {
        const res = await fetch('/api/poster-image?prefix=kpi-banca-img-', { cache: 'no-store' });
        const data = res.ok ? await res.json() : { items: [] };
        const imgs: Record<string, string> = {};
        for (const item of data.items || []) {
          if (item?.key) imgs[item.key] = `/api/poster-image/${encodeURIComponent(item.key)}?v=${item.updatedAt || 0}`;
        }
        if (!cancelled) setBancaImages(imgs);
      } catch {
        if (!cancelled) setBancaImages({});
      } finally {
        if (!cancelled) setHonourLoading(false);
      }
    };
    loadBancaImages();
    return () => { cancelled = true; };
  }, []);

  const uploadBancaImage = async (key: string, file: File) => {
    setBancaImgUploading(key);
    try {
      // Convert file → base64
      const dataBase64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/poster-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, dataBase64 }),
      });
      if (res.ok) {
        const data = await res.json();
        setBancaImages((prev) => ({ ...prev, [key]: `/api/poster-image/${encodeURIComponent(key)}?t=${Date.now()}` }));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Lỗi upload: ${err.error || res.status}`);
      }
    } catch (e: any) {
      alert(`Lỗi: ${e?.message || e}`);
    } finally {
      setBancaImgUploading(null);
    }
  };

  const deleteBancaImage = async (key: string) => {
    if (!confirm('Xóa ảnh này?')) return;
    try {
      await fetch(`/api/poster-image?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
      setBancaImages((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } catch (e: any) {
      alert(`Lỗi xóa: ${e?.message || e}`);
    }
  };

  // ===== KPI TARGET REGISTRATION (Đăng ký mục tiêu tháng) =====
  // User request: button "ĐĂNG KÝ MỤC TIÊU THÁNG (hiện tại)" → popup 2 lựa chọn:
  //   1. Trưởng nhóm → popup form: chọn nhóm + auto-fill tên TN + AFYP triệu + Lượt HĐ + confirm
  //   2. Tiền trưởng nhóm → popup form: nhập tay tên + mã + AFYP triệu + Lượt HĐ + confirm
  // Sau khi đăng ký → hiển thị trong trang "Danh sách đăng ký mục tiêu tháng" (1 nút mới trong 5 nút nav).
  const [targetRegOpen, setTargetRegOpen] = useState(false); // popup level 1: chọn TN / TTN
  const [targetRegRole, setTargetRegRole] = useState<'tn' | 'ttn' | null>(null); // level 2
  // Level 2 form state
  const [targetRegForm, setTargetRegForm] = useState<{
    nhom: string; maNhom: string; agentCode: string; agentName: string; position: string;
    afypTrieu: string; luotHD: string; note: string;
  }>({ nhom: '', maNhom: '', agentCode: '', agentName: '', position: '', afypTrieu: '', luotHD: '', note: '' });
  const [targetRegSaving, setTargetRegSaving] = useState(false);

  const closeTargetReg = () => {
    setTargetRegOpen(false);
    setTargetRegRole(null);
    setTargetRegForm({ nhom: '', maNhom: '', agentCode: '', agentName: '', position: '', afypTrieu: '', luotHD: '', note: '' });
  };

  // When user picks "Trưởng nhóm" → reset form để nhập
  // When user picks nhóm trong dropdown → auto-fill TN info từ leadersList
  const selectTargetRegNhom = (maNhom: string) => {
    const leader = (rawData?.leaders || []).find((l: LeaderInfo) => l.maNhom === maNhom);
    setTargetRegForm((prev) => ({
      ...prev,
      nhom: leader?.nhom || '',
      maNhom,
      agentCode: leader?.agentCode || '',
      agentName: leader?.agentName || '',
      position: leader?.position || 'Trưởng nhóm',
    }));
  };

  const submitTargetReg = async () => {
    if (!targetRegRole) return;
    const afypTrieu = targetRegForm.afypTrieu.trim() ? parseFloat(targetRegForm.afypTrieu) : 0;
    const luotHD = targetRegForm.luotHD.trim() ? parseFloat(targetRegForm.luotHD) : 0;
    if (isNaN(afypTrieu) || afypTrieu < 0 || isNaN(luotHD) || luotHD < 0) {
      alert('Mục tiêu cần là số không âm.');
      return;
    }
    if (afypTrieu <= 0 && luotHD <= 0) {
      alert('Vui lòng đăng ký ít nhất một mục tiêu: AFYP hoặc Lượt HĐ.');
      return;
    }
    if (targetRegRole === 'tn' && !targetRegForm.maNhom) {
      alert('Vui lòng chọn nhóm');
      return;
    }
    if (targetRegRole === 'ttn' && (!targetRegForm.agentName || !targetRegForm.agentCode)) {
      alert('Vui lòng nhập họ tên và mã số');
      return;
    }
    setTargetRegSaving(true);
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await fetch('/api/kpi-target-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          role: targetRegRole,
          nhom: targetRegForm.nhom,
          maNhom: targetRegForm.maNhom,
          agentCode: targetRegForm.agentCode,
          agentName: targetRegForm.agentName,
          position: targetRegRole === 'tn' ? 'Trưởng nhóm' : 'Tiền trưởng nhóm',
          afypTarget: afypTrieu * 1_000_000, // triệu → VND
          luotHDTarget: luotHD,
          note: targetRegForm.note,
        }),
      });
      if (res.ok) {
        closeTargetReg();
        // Reload list view nếu đang mở
        setTargetRegListT(Date.now());
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Lỗi lưu: ${err.error || res.status}`);
      }
    } catch (e: any) {
      alert(`Lỗi: ${e?.message || e}`);
    } finally {
      setTargetRegSaving(false);
    }
  };

  // ===== TARGET REGISTRATION LIST VIEW =====
  // User request: thêm 1 nút nav (sau 5 nút) → trang "Danh sách đăng ký mục tiêu tháng"
  // Hiển thị bảng: STT | Nhóm | Mã số | Họ tên | CV | AFYP | Lượt | Ghi chú
  // Chỉ admin được chỉnh sửa (delete); non-admin chỉ xem.
  const [targetRegListT, setTargetRegListT] = useState(0);
  const [targetRegList, setTargetRegList] = useState<any[]>([]);
  const [targetRegLoading, setTargetRegLoading] = useState(false);
  // Edit state (admin)
  const [targetRegEditId, setTargetRegEditId] = useState<string | null>(null);
  const [targetRegEditForm, setTargetRegEditForm] = useState<any>(null);

  const loadTargetRegList = useCallback(async () => {
    setTargetRegLoading(true);
    try {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const res = await fetch(`/api/kpi-target-registrations?month=${month}&_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTargetRegList(data);
      } else {
        setTargetRegList([]);
      }
    } catch {
      setTargetRegList([]);
    } finally {
      setTargetRegLoading(false);
    }
  }, []);

  // Load list when entering view
  useEffect(() => {
    if (view === 'target-reg-list') {
      loadTargetRegList();
    }
  }, [view, targetRegListT, loadTargetRegList]);

  const deleteTargetReg = async (id: string) => {
    if (!confirm('Xóa đăng ký này?')) return;
    try {
      await fetch(`/api/kpi-target-registrations/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setTargetRegListT(Date.now());
    } catch (e: any) {
      alert(`Lỗi xóa: ${e?.message || e}`);
    }
  };

  const saveTargetRegEdit = async () => {
    if (!targetRegEditId || !targetRegEditForm) return;
    setTargetRegSaving(true);
    try {
      const afypTrieu = parseFloat(targetRegEditForm.afypTrieu);
      const luotHD = parseFloat(targetRegEditForm.luotHD);
      if (isNaN(afypTrieu) || isNaN(luotHD)) {
        alert('AFYP và Lượt phải là số');
        return;
      }
      const res = await fetch(`/api/kpi-target-registrations/${encodeURIComponent(targetRegEditId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nhom: targetRegEditForm.nhom || '',
          agentCode: targetRegEditForm.agentCode || '',
          agentName: targetRegEditForm.agentName || '',
          position: targetRegEditForm.position || '',
          afypTarget: afypTrieu * 1_000_000,
          luotHDTarget: luotHD,
          note: targetRegEditForm.note || '',
        }),
      });
      if (res.ok) {
        setTargetRegEditId(null);
        setTargetRegEditForm(null);
        setTargetRegListT(Date.now());
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Lỗi lưu: ${err.error || res.status}`);
      }
    } catch (e: any) {
      alert(`Lỗi: ${e?.message || e}`);
    } finally {
      setTargetRegSaving(false);
    }
  };

  // ===== EXPORT TARGET REGISTRATIONS TO EXCEL (admin only) =====
  // User request: button trên target-reg-list view, chỉ admin thấy.
  // Export danh sách đăng ký tháng hiện tại ra file .xlsx với format:
  // STT | NHÓM | MÃ SỐ | HỌ TÊN | CV | AFYP (triệu) | LƯỢT | GHI CHÚ
  const exportTargetRegExcel = async () => {
    if (targetRegList.length === 0) {
      alert('Không có dữ liệu để export');
      return;
    }
    try {
      const XLSXModule = await import('xlsx-js-style');
      const XLSX = XLSXModule.default || XLSXModule;
      const now = new Date();
      const monthLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;

      // Build sheet data
      const header = [
        ['DANH SÁCH ĐĂNG KÝ MỤC TIÊU', '', '', '', '', '', '', ''],
        [monthLabel, '', '', '', '', '', '', ''],
        [`Tổng số: ${targetRegList.length} đăng ký`, '', '', '', '', '', '', ''],
        [],
        ['STT', 'NHÓM', 'MÃ SỐ', 'HỌ TÊN', 'CV', 'AFYP (triệu)', 'LƯỢT', 'GHI CHÚ'],
      ];
      const rows = targetRegList.map((reg, idx) => [
        idx + 1,
        reg.nhom || '',
        reg.agentCode || '',
        reg.agentName || '',
        reg.position || '',
        (reg.afypTarget || 0) / 1_000_000,
        reg.luotHDTarget || 0,
        reg.note || '',
      ]);
      const totals = [
        [],
        ['', '', '', '', 'TỔNG', targetRegList.reduce((s, r) => s + (r.afypTarget || 0) / 1_000_000, 0), targetRegList.reduce((s, r) => s + (r.luotHDTarget || 0), 0), ''],
      ];
      const aoa = [...header, ...rows, ...totals];
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Column widths
      ws['!cols'] = [
        { wch: 5 },   // STT
        { wch: 22 },  // NHÓM
        { wch: 12 },  // MÃ SỐ
        { wch: 22 },  // HỌ TÊN
        { wch: 18 },  // CV
        { wch: 14 },  // AFYP
        { wch: 8 },   // LƯỢT
        { wch: 28 },  // GHI CHÚ
      ];

      // Style: title rows (1-3) bold + merged
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
      ];
      const titleStyle = { font: { bold: true, sz: 14, color: { rgb: 'FFD700' } }, alignment: { horizontal: 'center', vertical: 'center' } };
      const monthStyle = { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: '1E3A8A' } } };
      const sumStyle = { font: { italic: true, sz: 10 }, alignment: { horizontal: 'center' } };
      const headerStyle = { font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'center', vertical: 'center' }, fill: { fgColor: { rgb: '065F46' } }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } };
      const cellStyle = { font: { sz: 10 }, alignment: { vertical: 'center' }, border: { top: { style: 'thin', color: { rgb: 'CCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'CCCCCC' } }, left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } } } };
      const numStyle = { ...cellStyle, alignment: { horizontal: 'right', vertical: 'center' } };

      // Apply styles
      for (let r = 0; r < aoa.length; r++) {
        for (let c = 0; c < aoa[r].length; c++) {
          const cellRef = XLSX.utils.encode_cell({ r, c });
          if (!ws[cellRef]) continue;
          if (r === 0) ws[cellRef].s = titleStyle;
          else if (r === 1) ws[cellRef].s = monthStyle;
          else if (r === 2) ws[cellRef].s = sumStyle;
          else if (r === 4) ws[cellRef].s = headerStyle;
          else if (r >= 5) {
            // Data rows: AFYP (c=5) và LƯỢT (c=6) → right-aligned number
            ws[cellRef].s = (c === 5 || c === 6) ? numStyle : cellStyle;
          }
        }
      }

      // Build workbook + download
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'DangKyMucTieu');
      const filename = `DangKyMucTieu_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (e: any) {
      alert(`Lỗi export Excel: ${e?.message || e}`);
      console.error('Export target reg Excel error:', e);
    }
  };

  const [calEditError, setCalEditError] = useState<string | null>(null);
  // Remember which existing event the user wanted to edit, so after password
  // auth we can open the edit form for THAT event (not a blank new-entry form).
  const [calPendingEdit, setCalPendingEdit] = useState<CalendarEvent | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [overviewPeriod, setOverviewPeriod] = useState<string>(`month-${new Date().getMonth() + 1}`);
  const [onlineSettings, setOnlineSettings] = useState<Record<string, string>>({});
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [adStructList, setAdStructList] = useState<ADStructure[]>([]);
  const [phongStructList, setPhongStructList] = useState<PhongStructure[]>([]);
  const [banNhomStructList, setBanNhomStructList] = useState<BanNhomStructure[]>([]);
  const [tvvStructList, setTvvStructList] = useState<TVVStructItem[]>([]);

  /* AD detail popup state */
  const [adPopup, setAdPopup] = useState<{ maAD: string; tenAD: string; originX: number; originY: number } | null>(null);
  const [adPopupNhom, setAdPopupNhom] = useState<string | null>(null);

  /* Banca-PA detail popup state — chỉ hiện bảng chi tiết (không có tổng hợp) */
  const [bancaPopupOpen, setBancaPopupOpen] = useState(false);

  /* KPI notification banner — đọc từ settings (do admin nhập ở trang chính) */
  const noticeContent = (onlineSettings['kpi-notice-content'] || '').trim();
  const noticeEnabled = onlineSettings['kpi-notice-enabled'] !== '0'; // default true

  const NOW = useMemo(() => new Date(), []);
  const CUR_YEAR = NOW.getFullYear();
  const CUR_MONTH = String(NOW.getMonth() + 1).padStart(2, '0');

  /* Fetch data — dùng dữ liệu đã preload từ AppDataContext (load 1 lần khi app mở).
     Trang KPI chỉ đọc context, không tự fetch lại khi mount. */
  const { data: appData, dataVersion, reload: reloadAppData, isReloading: appDataReloading, isLoading: appDataLoading, loadError, reload } = useAppData();

  // Sync rawData từ context (quanLyAll ưu tiên, fallback về các mảng riêng)
  useEffect(() => {
    if (appData.quanLyAll) {
      setRawData({
        contracts: appData.quanLyAll.contracts || appData.contracts || [],
        staff: appData.quanLyAll.staff || appData.staff || [],
        revenue: appData.quanLyAll.revenue || appData.revenue || [],
        leaders: appData.quanLyAll.leaders || appData.leaders || [],
      });
      setError(false);
    } else if (appData.contracts.length || appData.staff.length || appData.revenue.length || appData.leaders.length) {
      setRawData({
        contracts: appData.contracts,
        staff: appData.staff,
        revenue: appData.revenue,
        leaders: appData.leaders,
      });
      setError(false);
    }
    // Giữ splash cho tới khi AppDataProvider hoàn tất toàn bộ lần preload đầu tiên.
    if (!appDataLoading) setLoading(false);
    setSyncing(appDataReloading);
  }, [appData.quanLyAll, appData.contracts, appData.staff, appData.revenue, appData.leaders, appDataReloading, dataVersion]);

  // Hàm sync thủ công — gọi reloadAppData (đồng bộ toàn app)
  const fetchData = useCallback(async () => {
    setSyncing(true);
    try {
      await reloadAppData();
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [reloadAppData]);

  /* Online settings (KPI targets) — đọc từ context */
  useEffect(() => {
    if (appData.settings) setOnlineSettings(appData.settings);
  }, [appData.settings, dataVersion]);

  // Metadata is stored as compact Settings values: the image binary stays out of Settings.
  useEffect(() => {
    const profiles: Record<string, { name: string; title: string; note: string }> = {};
    for (let i = 1; i <= BANCA_IMG_COUNT; i++) {
      const key = `kpi-banca-img-${String(i).padStart(2, '0')}`;
      try {
        const saved = onlineSettings[`kpi-banca-profile-${String(i).padStart(2, '0')}`];
        if (saved) {
          const parsed = JSON.parse(saved);
          profiles[key] = {
            name: String(parsed?.name || ''),
            title: String(parsed?.title || ''),
            note: String(parsed?.note || ''),
          };
        }
      } catch {
        // Ignore one malformed legacy profile instead of blocking the honour board.
      }
    }
    setBancaProfiles(profiles);
  }, [onlineSettings]);

  const updateBancaProfile = (key: string, patch: Partial<{ name: string; title: string; note: string }>) => {
    setBancaProfiles(prev => ({
      ...prev,
      [key]: { name: prev[key]?.name || '', title: prev[key]?.title || '', note: prev[key]?.note || '', ...patch },
    }));
  };

  const saveBancaProfile = async (key: string) => {
    const idx = key.replace('kpi-banca-img-', '');
    const profile = bancaProfiles[key] || { name: '', title: '', note: '' };
    setBancaProfileSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`kpi-banca-profile-${idx}`]: JSON.stringify(profile) }),
      });
      if (!res.ok) throw new Error('save failed');
      setOnlineSettings(prev => ({ ...prev, [`kpi-banca-profile-${idx}`]: JSON.stringify(profile) }));
    } catch {
      alert('Không thể lưu thông tin ảnh. Vui lòng thử lại.');
    } finally {
      setBancaProfileSaving(false);
    }
  };

  /* Structure AD/Phong/BanNhom/TVV — đọc từ context */
  useEffect(() => {
    setAdStructList(appData.structureAd || []);
    setPhongStructList(appData.structurePhong || []);
    setBanNhomStructList(appData.structureBanNhom || []);
    setTvvStructList(appData.structureTvv || []);
  }, [appData.structureAd, appData.structurePhong, appData.structureBanNhom, appData.structureTvv, dataVersion]);

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
    setCalPendingEdit(null);
    setCalPwdOpen(true); setCalPwdInput(''); setCalPwdError(false);
  };

  // Parse owner string from DB into array — supports multi-select format "Công ty, HTKD"
  // và giữ lại custom text không thuộc CAL_OWNERS.
  const parseOwners = (owner: string | undefined | null): string[] => {
    if (!owner) return [];
    return owner.split(',').map(s => s.trim()).filter(Boolean);
  };

  const submitCalPwd = () => {
    if (calPwdInput === '123456') {
      setCalAuthed(true); setCalPwdOpen(false); setCalPwdInput(''); setCalPwdError(false);
      // If user clicked an existing entry to edit, open edit form for THAT event.
      // Otherwise, open blank new-entry form.
      if (calPendingEdit) {
        const ev = calPendingEdit;
        const owners = parseOwners(ev.owner);
        setCalEditForm({
          id: ev.id,
          date: ev.date,
          title: ev.title,
          owners,
          ownerCustom: '',
        });
        setCalPendingEdit(null);
      } else {
        setCalEditForm({ id: null, date: `${CUR_YEAR}-${calMonth}-01`, title: '', owners: [], ownerCustom: '' });
      }
      setCalEditError(null);
      setCalEditOpen(true);
    } else {
      setCalPwdError(true);
    }
  };

  const openCalEditFor = (ev: CalendarEvent) => {
    if (calAuthed) {
      const owners = parseOwners(ev.owner);
      setCalEditForm({
        id: ev.id,
        date: ev.date,
        title: ev.title,
        owners,
        ownerCustom: '',
      });
      setCalEditError(null);
      setCalEditOpen(true);
    } else {
      // Not authed yet — remember this event and prompt for password.
      // After successful auth, submitCalPwd will open the edit form for it.
      setCalPendingEdit(ev);
      setCalPwdOpen(true);
      setCalPwdInput('');
      setCalPwdError(false);
    }
  };

  const openCalEditForNew = () => {
    setCalEditForm({ id: null, date: `${CUR_YEAR}-${calMonth}-01`, title: '', owners: [], ownerCustom: '' });
    setCalEditError(null);
    setCalEditOpen(true);
  };

  const saveCalEdit = async () => {
    if (!calEditForm.date || !calEditForm.title.trim()) {
      setCalEditError('Vui lòng nhập ngày và nội dung.');
      return;
    }
    // Gộp owners chọn sẵn + custom text (nếu có nhập)
    const finalOwners = [...calEditForm.owners];
    const customText = calEditForm.ownerCustom.trim();
    if (customText && !finalOwners.includes(customText)) {
      finalOwners.push(customText);
    }
    // Join bằng ", " để hiển thị dạng "Công ty, HTKD"
    const owner = finalOwners.join(', ');
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

    const currentYear = CUR_YEAR;
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
    // AD plan = Σ 12 monthly values (keys: nmc-kh-ad-${maAD}-t01..t12)
    const readAdMonthlyPlan = (maAD: string, month: number): number => {
      const mm = String(month).padStart(2, '0');
      return parseFloat(onlineSettings[`nmc-kh-ad-${maAD}-t${mm}`] || '0') || 0;
    };
    const readAdAnnualPlan = (maAD: string): number => {
      let sum = 0;
      for (let m = 1; m <= 12; m++) sum += readAdMonthlyPlan(maAD, m);
      return sum;
    };

    const adPlans = new Map<string, number>();
    adStructList.forEach(ad => {
      adPlans.set(ad.maAD, readAdAnnualPlan(ad.maAD));
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

    // ========== Count TVV in PA + Banca (for Banca-PA card display) ==========
    // User requirement: count TOTAL TVV currently in PHÒNG PA / NHÓM PA / PHÒNG BANCA.
    // Source: DS TVV of structure (/api/structure/tvv).
    // Match by maBanNhom directly (NOT via bnToAdMap — because ban-nhom "U104101014"
    // has empty maAD in DB, so bnToAdMap doesn't have entry → TVV not counted).
    // PA group codes: PA, U104101014  (Nhóm PA có 1062 TVV)
    // Banca group codes: BANCA, A473DSO000, DSO  (Banca có 1 TVV)
    const PA_BANNHOM_CODES = new Set(['PA', 'U104101014']);
    const BANCA_BANNHOM_CODES = new Set(['BANCA', 'A473DSO000', 'DSO']);
    let paTvvCount = 0;
    let bancaTvvCount = 0;
    tvvStructList.forEach(t => {
      const code = String(t.maBanNhom || '').trim().toUpperCase();
      if (PA_BANNHOM_CODES.has(code)) paTvvCount++;
      else if (BANCA_BANNHOM_CODES.has(code)) bancaTvvCount++;
    });
    // Total TVV in Banca-PA card = PA + Banca
    const bancaPaTvvTotal = paTvvCount + bancaTvvCount;

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
          bancaPaPhong = { ten: 'Banca - PA', afyp: 0, kh: 0, lhd: 0, td: 0, hdChuan: 0, tyTrong: 0, ads: [], noAds: true, tvvCount: bancaPaTvvTotal };
        }
        // Match contracts by nhom / ban / maNhom / ad containing PA / Banca / DSO / PGB
        // NOTE: normKey() lowercases + strips accents/punctuation, so the substring
        // checks below MUST use lowercase literals ('banca', 'dso', 'pgb', 'bancapa').
        // Earlier code used UPPERCASE literals which never matched → Banca-PA contracts
        // were dropped from the KPI total, making it ~151M VND lower than quan-ly.
        const paContracts = periodContracts.filter(c => {
          if (isPaOrBanca(c.nhom || '') || isPaOrBanca(c.ban || '') || isPaOrBanca(c.maNhom || '')) return true;
          // Match contracts with ad = 'Banca - PA' or contains 'Banca'
          const adNorm = normKey(c.ad || '');
          if (adNorm.includes('bancapa') || adNorm.includes('banca')) return true;
          // Match contracts with ban field containing PGB (PGB = Phát hành Banca)
          const banNorm = normKey(c.ban || '');
          if (banNorm.includes('pgb')) return true;
          const nhomNorm = normKey(c.nhom || '');
          if (nhomNorm.includes('banca') || nhomNorm.includes('dso')) return true;
          const maNhomNorm = normKey(c.maNhom || '');
          if (maNhomNorm.includes('banca') || maNhomNorm.includes('dso')) return true;
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
          // Nguồn chuẩn là Mã Ban/Nhóm → AD. Dữ liệu import có thể có AD = '#N/A',
          // nhưng maNhom vẫn hợp lệ; nếu chỉ so tên AD, các hợp đồng này bị rơi khỏi KPI.
          const groupCode = String(c.maBanNhom || c.maNhom || '').trim();
          if (groupCode && bnToAdMap.get(groupCode)?.maAD === adStruct.maAD) return true;

          // Fallback cho dữ liệu cũ không có mã nhóm.
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

        // Period KH for AD = Σ of AD's monthly values for months in selected period
        // (AD now uses 12 monthly inputs directly; ratio only applies to Nhóm)
        const adPeriodKh = periodMonths.reduce((s, m) => s + readAdMonthlyPlan(adStruct.maAD, m), 0);

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
      doLonHD: slHD > 0 ? totalAFYP / slHD : 0,
    };

    return { total, phongs, periodContracts };
  }, [rawData, overviewPeriod, onlineSettings, adStructList, phongStructList, banNhomStructList, tvvStructList]);

  /* Splash exit — khi data đã load xong (loading=false) VÀ dashboard đã sẵn sàng,
     đợi 1 nhịp rồi fade-out splash (~550ms) rồi unmount. */
  useEffect(() => {
    if (!splashVisible) return;
    if (loading || honourLoading || !dashboard) return;
    const t1 = setTimeout(() => setSplashExiting(true), 250);
    const t2 = setTimeout(() => {
      setSplashVisible(false);
      setSplashExiting(false);
    }, 250 + 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [loading, dashboard, splashVisible]);

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
          // Match contracts cho BanNhom bằng maBanNhom hoặc maNhom (strict, không fallback name).
          // Nếu contract không có maBanNhom/maNhom khớp → không cộng HĐ đó (để trống).
          const bnContracts = periodContracts.filter(c => {
            const cMaBN = c.maBanNhom || c.maNhom || '';
            return cMaBN === bn.maBanNhom;
          });

          const afyp = bnContracts.reduce((s, c) => s + num(c.afyp), 0);
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
          // Tỷ lệ hoàn thành: dùng số AFYP và KH nguyên thủy (đ), KHÔNG dùng số đã làm tròn sang triệu đồng
          // để tránh sai lệch % khi AFYP/KH nhỏ (vd 10.5M / 8.3M = 126.5% thay vì 11/8 = 137.5%).
          const pct = periodKh > 0 ? (afyp / periodKh * 100) : 0;

          // Get TN (Trưởng Nhóm/Ban) từ DS TB/TN (leaders table) — KHÔNG dùng DS TVV
          // Match theo maNhom === bn.maBanNhom (cùng pattern với trang Quản lý)
          // KHÔNG fallback — nếu không có TN trong DS TB/TN thì để trống
          const tnLeader = rawData.leaders.find(l =>
            l.maNhom === bn.maBanNhom && isTBorTNPosition(l.position)
          );
          const tnName = tnLeader?.agentName || '';

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
  }, [rawData, detailMonth, CUR_YEAR, banNhomStructList, adStructList, phongStructList, onlineSettings]);

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

    // Contracts của nhóm đang chọn — match bằng maBanNhom || maNhom (đồng bộ với dashboard).
    // Dữ liệu hợp đồng đôi khi thiếu maBanNhom (trống) nhưng vẫn có maNhom → vẫn match được.
    const finalContracts = popupYearContracts.filter(c => {
      const cMaBN = c.maBanNhom || c.maNhom || '';
      return cMaBN === selectedBN.maBanNhom;
    });

    // Group metrics
    const afyp = finalContracts.reduce((s, c) => s + num(c.afyp), 0);
    const ip = finalContracts.reduce((s, c) => s + num(c.pdt10DT), 0);
    const lhd = finalContracts.filter(c => num(c.tinhLuot3tr) >= 3000000).length;
    const hdChuan = finalContracts.filter(c => num(c.tinhLuot3tr) >= 12000000).length;
    const slHD = finalContracts.length;
    const tyTrongIP = afyp > 0 ? (ip / afyp * 100) : 0;
    const nangSuat = lhd > 0 ? slHD / lhd : 0;
    const doLonHD = slHD > 0 ? afyp / slHD : 0;

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

    // IP per month per TVV (months 3-9) — tính trực tiếp từ TẤT CẢ hợp đồng trong năm
    // theo agentCode, KHÔNG lọc qua finalContracts. Lý do: dữ liệu hợp đồng đôi khi
    // thiếu maBanNhom (trống) → nếu lọc qua finalContracts thì IP của TVV sẽ bị thiếu.
    // IP = sum của contract.pdt10DT theo tháng doanh số (issueDate, fallback effectiveDate).
    // Nếu pdt10DT = 0 → để 0 (không fallback sang fyp hay số khác).
    const months37 = [3, 4, 5, 6, 7, 8, 9];
    const tvvTable = sortedTvv.map((t, idx) => {
      const ipByMonth: Record<number, number> = {};
      months37.forEach(m => {
        ipByMonth[m] = popupYearContracts
          .filter(c => c.agentCode === t.agentCode)
          .filter(c => {
            const d = getDoanhSoMonth(c);
            return !isNaN(d.getTime()) && (d.getMonth() + 1) === m;
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


  /* ============= BANCA-PA detail popup data ============= */
  /* Popup cho phòng Banca - PA: KHÔNG có phần tổng hợp ở trên, chỉ có bảng chi tiết.
     Bao gồm TVV thuộc phòng Banca + phòng PA (hoặc nhóm PA).

     Filter (per user spec — đối chiếu trang Cấu trúc):
     - maBanNhom = U104101014  → Nhóm PA (user-confirmed: đây là mã nhóm PA)
     - maBanNhom = PA          → Phòng PA (bannhom "PA" → AD "PA" → Phòng PA)
     - maBanNhom = Banca       → Phòng Banca (bannhom "Banca" → AD "Banca" → Phòng Banca)
     - maBanNhom = A473DSO000  → Banca/DSO (Nguyễn Yến Linh)
     - maBanNhom = DSO         → Banca/DSO (variation) */
  const bancaPopupData = useMemo(() => {
    if (!dashboard || !rawData) return null;

    // Per user: U104101014 = mã nhóm PA. Plus Banca codes.
    const TARGET_BANNHOM_CODES = new Set(['U104101014', 'PA', 'BANCA', 'A473DSO000', 'DSO']);

    // Filter TVV by maBanNhom (case-insensitive, trim whitespace)
    const bancaTvvList: TVVStructItem[] = tvvStructList.filter(t => {
      const code = String(t.maBanNhom || '').trim().toUpperCase();
      return TARGET_BANNHOM_CODES.has(code);
    });

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

    const sortedTvv = [...bancaTvvList].sort((a, b) => {
      const ordA = getOrder(a.chucVu);
      const ordB = getOrder(b.chucVu);
      if (ordA !== ordB) return ordA - ordB;
      return a.agentName.localeCompare(b.agentName, 'vi');
    });

    // Use ALL year contracts (months 3-9) — same approach as AD popup
    const popupYearContracts = rawData.contracts.filter(c => {
      const d = getDoanhSoMonth(c);
      return !isNaN(d.getTime()) && d.getFullYear() === CUR_YEAR;
    });

    const months37 = [3, 4, 5, 6, 7, 8, 9];
    const tvvTable = sortedTvv.map((t, idx) => {
      const ipByMonth: Record<number, number> = {};
      months37.forEach(m => {
        ipByMonth[m] = popupYearContracts
          .filter(c => c.agentCode === t.agentCode)
          .filter(c => {
            const d = getDoanhSoMonth(c);
            return !isNaN(d.getTime()) && (d.getMonth() + 1) === m;
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
      tvvTable,
      months37,
      totalTvv: sortedTvv.length,
    };
  }, [dashboard, rawData, tvvStructList, CUR_YEAR]);


  /* Monthly AFYP chart data */
  const chartData = useMemo(() => {
    if (!rawData) return [];
    const months: { month: number; label: string; afyp: number; kh: number }[] = [];
    const currentYear = new Date().getFullYear();

    // Use adStructList for KH calculation (same as quan-ly)
    // AD plan = Σ 12 monthly values (keys: nmc-kh-ad-${maAD}-t01..t12)
    const chartReadAdMonthlyPlan = (maAD: string, month: number): number => {
      const mm = String(month).padStart(2, '0');
      return parseFloat(onlineSettings[`nmc-kh-ad-${maAD}-t${mm}`] || '0') || 0;
    };
    const chartReadAdAnnualPlan = (maAD: string): number => {
      let sum = 0;
      for (let m = 1; m <= 12; m++) sum += chartReadAdMonthlyPlan(maAD, m);
      return sum;
    };
    const chartAdPlans = new Map<string, number>();
    adStructList.forEach(ad => {
      chartAdPlans.set(ad.maAD, chartReadAdAnnualPlan(ad.maAD));
    });
    const chartTargetTong = adStructList.reduce((s, ad) => s + (chartAdPlans.get(ad.maAD) || 0), 0);

    for (let m = 1; m <= 12; m++) {
      const mContracts = rawData.contracts.filter(c => {
        const d = getDoanhSoMonth(c);
        return !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() + 1 === m;
      });

      // Chart afyp = Σ afyp of ALL contracts in this month (same as quan-ly chart, line 4036)
      // Do NOT iterate adKeys and sum per-AD — that approach double-counts "Banca - PA"
      // contracts (matched by both "Banca" and "PA" adKeys via normKey().includes()).
      // Use the simple sum to match quan-ly exactly.
      const afyp = mContracts.reduce((s, c) => s + num(c.afyp), 0);

      // KH for this month = Σ all ADs' monthly value for this month (AD uses 12 monthly inputs directly)
      const kh = adStructList.reduce((s, ad) => s + chartReadAdMonthlyPlan(ad.maAD, m), 0);

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
      {/* Bg-scene đã bỏ — dùng chung SpaceBackground (xám + vân tổ ong) từ layout.tsx */}

      {/* ===== APP LOADER GATE =====
          Fullscreen splash gate — chờ tải xong toàn bộ dữ liệu (AppDataProvider)
          mới cho vào UI chính. Nếu load lỗi, hiện nút 'Thử lại'.
          Áp dụng cho cả main app (/kpi, /kpi-standalone) và kpi-app standalone (angiang2026-nhom.vercel.app). */}
      <AppLoader show={appDataLoading} error={loadError} onRetry={reload} />

      {/* ===== POPUP LOADING =====
          Popup nhỏ ở giữa màn hình khi vừa mở trang KPI (đang preload data).
          Tự động fade-out mượt mà khi dashboard sẵn sàng — xem useEffect [loading, dashboard, splashVisible] ở trên. */}
      {splashVisible && (
        <div className={`kpi-splash${splashExiting ? ' exiting' : ''}`} aria-hidden={splashExiting}>
          <div className="kpi-splash-card">
            <div className="kpi-splash-logo" aria-hidden="true">
              <Trophy size={32} />
            </div>
            <div className="kpi-splash-text">
              <div className="kpi-splash-title">Tiến Độ Kinh Doanh</div>
              <div className="kpi-splash-sub">Bảo Việt Nhân Thọ An Giang</div>
            </div>
            <div className="kpi-splash-spinner" aria-hidden="true" />
            <div className="kpi-splash-hint">Đang tải dữ liệu…</div>
          </div>
        </div>
      )}

      {/* ===== KPI EMBEDDED SHEET OVERLAY =====
          Khi user bấm 1 trong 3 nút (Thi đua / Chính sách / CLB Sao Việt),
          nội dung sẽ được mở NGAY TRONG KPI app bằng iframe đến /quan-ly?sheet=xxx&from=kpi.
          - /quan-ly đã có logic ẩn sidebar + Cài đặt khi from=kpi → user chỉ xem đúng sheet đó.
          - Nếu đang ở standalone domain (không phải /kpi path), fallback mở tab mới.
          - Có nút Back để quay về dashboard KPI. */}
      {kpiSheet !== 'home' && (
        <div className="kpi-embed-overlay" role="dialog" aria-modal="true">
          <div className="kpi-embed-header">
            <button
              type="button"
              className="kpi-embed-back"
              onClick={() => { setKpiSheet('home'); window.scrollTo({ top: 0, behavior: 'auto' }); }}
              aria-label="Quay lại KPI"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              <span>Quay lại</span>
            </button>
            <div className="kpi-embed-title">
              {kpiSheet === 'saoviet' && (<><Flag size={16} /> <span>Thi Đua Sao Việt</span></>)}
              {kpiSheet === 'report' && (<><BookOpen size={16} /> <span>Chính Sách 2026</span></>)}
              {kpiSheet === 'clb-saoviet' && (<><Star size={16} /> <span>CLB Sao Việt</span></>)}
            </div>
            {/* Nút "Mở trong tab mới": chỉ hiện ở KPI0 (admin).
                KPI tách (standalone) ẩn vì user không được mở /quan-ly trực tiếp. */}
            {!standalone && (
              <button
                type="button"
                className="kpi-embed-open"
                onClick={() => {
                  const url = `/quan-ly?sheet=${kpiSheet}&admin=1`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                aria-label="Mở trong tab mới"
                title="Mở trong tab mới"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              </button>
            )}
          </div>
          <div className="kpi-embed-body">
            <iframe
              key={`${kpiSheet}-${kpiSheetT}`}
              src={standalone
                ? `${buildMainUrl('/quan-ly?sheet=' + kpiSheet + '&from=kpi&_t=' + kpiSheetT)}`
                : `/quan-ly?sheet=${kpiSheet}&admin=1&_t=${kpiSheetT}`}
              title={kpiSheet === 'saoviet' ? 'Thi Đua Sao Việt' : kpiSheet === 'report' ? 'Chính Sách 2026' : 'CLB Sao Việt'}
              className="kpi-embed-iframe"
              loading="eager"
              allow="fullscreen"
            />
          </div>
        </div>
      )}

      <div className="app-wrap">
        {/* ===== MAIN VIEW ===== */}
        <section className={`view ${view === 'main' ? 'active' : ''}`} id="view-main" role="main">
          {/* ===== NOTIFICATION BANNER (yellow-gold gradient, green text, scrolls continuously; auto-hidden when empty) ===== */}
          {noticeEnabled && noticeContent && (
            <div className="kpi-notice-banner" role="marquee" aria-live="polite">
              <span
                className="kpi-notice-marquee"
                dangerouslySetInnerHTML={{ __html: noticeContent }}
              />
            </div>
          )}
          <header>
            <div className="main-header">
              {/* Nút back:
                  - KPI0 (standalone=false): LUÔN hiển thị, bấm về `/` (main app)
                    (trước đây chỉ hiện khi adminAuthed → sai, vì admin vào từ main app
                     nhưng chưa login admin trên /kpi sẽ mất nút back)
                  - KPI tách (standalone=true): KHÔNG hiển thị (user không được về main app) */}
              {!standalone && (
                <button
                  type="button"
                  className="btn-back-u"
                  onClick={() => {
                    router.push('/');
                  }}
                  title="Trở về trang chính"
                  aria-label="Trở về trang chính"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <div>
                <h1 className="hero-title">Tiến Độ Kinh Doanh</h1>
                <p className="hero-sub">Bảo Việt Nhân Thọ An Giang</p>
              </div>
            </div>
            <div className="ctrl-bar">
              <span className="ctrl-hint">Chọn thời gian xem</span>
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
              {!standalone && adminAuthed ? (
                <button className={`sync-status ${syncing ? 'syncing' : ''}`} onClick={fetchData} title="Đồng bộ" aria-label="Đồng bộ dữ liệu">
                  <span className="sync-check"><Check size={16} /></span>
                  <span className="sync-spinner"><RotateCw size={14} /></span>
                </button>
              ) : <div style={{ width: 36, height: 36, flexShrink: 0 }} />}
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
              {/* Company Card (Mobile) — chỉ hiển thị mobile, ẩn desktop để tránh trùng với .dsk-company */}
              <div id="kpi-company" className="mobile-only">
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

                {/* Desktop Company Strip đã được chuyển vào trong .split-center (cột trái của desktop-split) */}
              </div>

              {/* Navigation Grid — mobile: 2 rows × 3 cols = 6 buttons */}
              <nav className="nav-grid mobile-only" aria-label="Điều hướng">
                <button className="nav-btn nav-detail" onClick={() => { setDetailAdFilter('all'); setDetailAdDropdownOpen(false); setView('detail'); window.scrollTo({ top: 0, behavior: 'auto' }); }}>
                  <span className="nav-icon"><BarChart3 size={14} /></span> <span className="nav-label">Chi tiết nhóm</span>
                </button>
                <button className="nav-btn nav-plan" onClick={() => { setView('calendar'); window.scrollTo({ top: 0, behavior: 'auto' }); }}>
                  <span className="nav-icon"><CalendarDays size={14} /></span> <span className="nav-label">Kế hoạch khung</span>
                </button>
                <button type="button" className="nav-btn nav-race" onClick={() => { setKpiSheetT(Date.now()); setKpiSheet('saoviet'); window.scrollTo({ top: 0, behavior: 'auto' }); }}>
                  <span className="nav-icon"><Flag size={14} /></span> <span className="nav-label">Thi đua</span>
                </button>
                <button type="button" className="nav-btn nav-policy" onClick={() => { setKpiSheetT(Date.now()); setKpiSheet('report'); window.scrollTo({ top: 0, behavior: 'auto' }); }}>
                  <span className="nav-icon"><BookOpen size={14} /></span> <span className="nav-label">Chính sách 2026</span>
                </button>
                <button type="button" className="nav-btn nav-clb" onClick={() => { setKpiSheetT(Date.now()); setKpiSheet('clb-saoviet'); window.scrollTo({ top: 0, behavior: 'auto' }); }}>
                  <span className="nav-icon"><Star size={14} /></span> <span className="nav-label">CLB Sao Việt</span>
                </button>
                <button type="button" className="nav-btn nav-target-reg" onClick={() => { setView('target-reg-list'); window.scrollTo({ top: 0, behavior: 'auto' }); }}>
                  <span className="nav-icon"><Trophy size={14} /></span> <span className="nav-label">DS Đăng Ký Mục Tiêu</span>
                </button>
              </nav>

              {/* Region Divider - Mobile (clickable to collapse) */}
              <div
                className={`region-divider mobile-only is-collapse-btn${khuVucCollapsed ? ' collapsed' : ''}`}
                onClick={() => setKhuVucCollapsed((v) => !v)}
                role="button"
                aria-expanded={!khuVucCollapsed}
              >
                <span className="region-divider-title">
                  <span className="collapse-icon" />
                  Tiến Độ Khu Vực
                </span>
              </div>

              {/* Mobile Region - Redesign as table-style cards (collapsible)
                  User fix: chỉ thu gọn cards (incl. Banca card), KHÔNG ẩn banca-imgs-section
                  và target-reg-section ở dưới. */}
              <div className={`khuvuc-region mobile-only${khuVucCollapsed ? ' collapsed' : ''}`}>
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
                  const isBanca = !!phong.noAds;
                  return (
                    <Fragment key={pi}>
                      {isBanca && <div className="banca-separator" aria-hidden="true" />}
                      <div
                        className={`rg-card ${pCls} anim-in${glowClsStr}${isBanca ? ' is-clickable' : ''}`}
                        style={{ animationDelay: `${pi * 60}ms` }}
                        onClick={isBanca ? () => setBancaPopupOpen(true) : undefined}
                      >
                      {/* Header: tên phòng + %KH trên góc phải (như cũ) */}
                      <div className="rg-head">
                        <div className="rg-head-left">
                          <Clipboard size={14} style={{ color: '#fff', flexShrink: 0 }} />
                          <span className="rg-head-name">{phong.ten}</span>
                        </div>
                        {!phong.noAds && phong.kh > 0 && <span className="rg-head-pct"><AnimPct value={pPct} /></span>}
                        {isBanca && <span className="rg-head-hint">Xem chi tiết TVV →</span>}
                      </div>
                      {/* AFYP row: AFYP + KH inline (1 bên, như cũ) — đơn vị đ */}
                      {(phong.afyp > 0 || phong.noAds) && (
                        <div className="rg-afyp-row">
                          <span className="rg-afyp"><AnimNum value={phong.afyp} /><span className="rg-afyp-unit">đ</span></span>
                          {phong.noAds ? (
                            <span className="rg-banca-tvv-count">SL TVV: {phong.tvvCount ?? 0}</span>
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
                                const openAdPopup = (e: React.MouseEvent) => {
                                  if (!adStructForPopup) return;
                                  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
                                  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
                                  setAdPopupNhom(null);
                                  setAdPopup({
                                    maAD: adStructForPopup.maAD,
                                    tenAD: ad.ten,
                                    originX: e.clientX - vw / 2,
                                    originY: e.clientY - vh / 2,
                                  });
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
                    </Fragment>
                  );
                })}
              </div>
              </div>{/* end khuvuc-region mobile — chỉ chứa cards (incl banca) */}

              {/* === BANCA IMAGES (15 gold circles) — ADMIN ONLY ===
                  User request: sau card BANCA, thêm 1 khoảng trống cỡ 50% màn hình
                  chứa 15 hình tròn nhỏ (gold border). Chỉ admin thấy & upload.
                  Non-admin không thấy gì (không hiển thị khung trống).
                  User fix (v2): bố trí so le, to nhỏ ngẫu hứng như bức tường vinh danh.
                  50% ô trống phía trên chứa ảnh, 50% phía dưới để trống. */}
              {(
                <div className={`banca-imgs-section mobile-only${Object.keys(bancaImages).length === 0 ? ' is-empty' : ''}`}>
                  <div className="banca-imgs-header">
                    <div className="banca-imgs-title">✦ Vinh Danh Ngôi Sao</div>
                    <button
                      onClick={() => setBancaImgAdminOpen(true)}
                      style={{
                        display: adminAuthed ? undefined : 'none', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,215,107,.30)',
                        background: 'rgba(255,215,107,.10)', color: '#ffd76b', fontSize: 10, fontWeight: 700,
                        cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.05em',
                      }}
                    >
                      ⚙ Cài đặt ảnh
                    </button>
                  </div>
                  {/* Wall of fame: 50% top — 15 ảnh tròn so le, to nhỏ ngẫu hứng */}
                  <div className="banca-imgs-wall">
                    {[
  { id: 'platinum', label: '✦ Ngôi Sao Bạch Kim ✦', start: 0, count: 5 },
  { id: 'gold', label: '✦ Ngôi Sao Vàng ✦', start: 5, count: BANCA_IMG_COUNT - 5 },
].map(({ id, label, start, count }) => {
  const indices = Array.from({ length: count }, (_, offset) => start + offset)
    .filter((imageIndex) => adminAuthed || Boolean(bancaImages[`kpi-banca-img-${String(imageIndex + 1).padStart(2, '0')}`]));
  if (indices.length === 0) return null;
  return (
    <section className={`honour-tier ${id}`} key={id}>
      <div className="honour-tier-title">{label}</div>
      <div className="honour-image-grid">
        {indices.map((i) => {
          const idx = String(i + 1).padStart(2, '0');
          const key = `kpi-banca-img-${idx}`;
          const url = bancaImages[key];
          const isUploading = bancaImgUploading === key;
          return (
            <div
              key={key}
              className={`banca-img-cell${isUploading ? ' is-uploading' : ''}`}
              onClick={() => {
                if (url && !isUploading) setBancaProfileOpenKey(key);
              }}
              title={url ? 'Xem thông tin vinh danh' : undefined}
            >
              {url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${id === 'platinum' ? 'Bạch Kim' : 'Vàng'} ${idx}`} />
                  {adminAuthed && <button className="banca-img-del" onClick={(e) => { e.stopPropagation(); deleteBancaImage(key); }} title="Xóa ảnh">×</button>}
                </>
              ) : (
                <span className="banca-img-placeholder">+{idx}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
})}
                  </div>
                  {adminAuthed && Object.keys(bancaImages).length === 0 && (
                    <div className="banca-img-empty-hint">Chưa có ảnh nào. Bấm vào ô tròn hoặc nút "Cài đặt ảnh" để upload.</div>
                  )}
                  {/* 50% bottom — empty space theo yêu cầu user */}
                  <div className="banca-imgs-bottom-empty" />
                </div>
              )}

              {/* === ĐĂNG KÝ MỤC TIÊU THÁNG (button) ===
                  User request: button bấm → popup chọn TN/TTN → form đăng ký. */}
              <div className="target-reg-section mobile-only">
                <button className="target-reg-btn" onClick={() => setTargetRegOpen(true)}>
                  ★ Đăng Ký Mục Tiêu Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
                </button>
              </div>

              {/* Desktop Split Layout: 2 cột — TRÁI (3fr): 5 nút nav + công ty + biểu đồ | PHẢI (1fr): 4 phòng dọc (bằng nhau, fill height) */}
              <div className="desktop-split">
                <div className="split-left" id="split-company" />
                <div className="split-center" id="split-chart">
                  {/* Navigation Grid — 6 nút đều nhau trên desktop */}
                  <nav className="nav-grid dsk-nav" aria-label="Điều hướng">
                    <button className="nav-btn nav-detail" onClick={() => { setDetailAdFilter('all'); setDetailAdDropdownOpen(false); setView('detail'); window.scrollTo({ top: 0, behavior: 'auto' }); }}>
                      <span className="nav-icon"><BarChart3 size={14} /></span> Chi tiết nhóm
                    </button>
                    <button className="nav-btn nav-plan" onClick={() => { setView('calendar'); window.scrollTo({ top: 0, behavior: 'auto' }); }}>
                      <span className="nav-icon"><CalendarDays size={14} /></span> Kế hoạch khung
                    </button>
                    <button type="button" className="nav-btn nav-race" onClick={() => { setKpiSheetT(Date.now()); setKpiSheet('saoviet'); window.scrollTo({ top: 0, behavior: 'auto' }); }}>
                      <span className="nav-icon"><Flag size={14} /></span> Thi đua
                    </button>
                    <button type="button" className="nav-btn nav-policy" onClick={() => { setKpiSheetT(Date.now()); setKpiSheet('report'); window.scrollTo({ top: 0, behavior: 'auto' }); }}>
                      <span className="nav-icon"><BookOpen size={14} /></span> Chính sách 2026
                    </button>
                    <button type="button" className="nav-btn nav-clb" onClick={() => { setKpiSheetT(Date.now()); setKpiSheet('clb-saoviet'); window.scrollTo({ top: 0, behavior: 'auto' }); }}>
                      <span className="nav-icon"><Star size={14} /></span> CLB Sao Việt
                    </button>
                    <button type="button" className="nav-btn nav-target-reg" onClick={() => { setView('target-reg-list'); window.scrollTo({ top: 0, behavior: 'auto' }); }} style={{ background: 'linear-gradient(135deg,#c89828,#a87818)', color: '#fff' }}>
                      <span className="nav-icon"><Trophy size={14} /></span> DS Đăng Ký Mục Tiêu
                    </button>
                  </nav>
                  {/* Company strip (đã bỏ nền tổng, các ô tách biệt) */}
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
                  </div>

                  {/* Biểu đồ AFYP — nằm dưới company strip ở cột trái */}
                  <div className="afyp-chart-wrap">
                    <div className="afyp-chart-title"><BarChart3 size={14} style={{ color: '#38bdf8' }} /> Biến động AFYP theo tháng</div>
                    <div className="afyp-chart-summary">
                      <div className="sum-item"><div className="sum-label">Tổng AFYP (T1-T{CUR_MONTH})</div><div className="sum-val">{fmtBig(chartData.slice(0, parseInt(CUR_MONTH)).reduce((s,d) => s+d.afyp, 0))}</div></div>
                      <div className="sum-item"><div className="sum-label">Tháng cao nhất</div><div className="sum-val">{fmtBig(Math.max(...chartData.map(d => d.afyp)))}</div></div>
                      <div className="sum-item"><div className="sum-label">TB/tháng</div><div className="sum-val">{fmtBig(chartData.slice(0, Math.min(12, parseInt(CUR_MONTH, 10) || 1)).reduce((s,d) => s+d.afyp, 0) / Math.min(12, parseInt(CUR_MONTH, 10) || 1))}</div></div>
                    </div>
                    <div className="afyp-chart" dangerouslySetInnerHTML={{ __html: renderChart() || '' }} />
                    <div className="chart-legend">
                      <div className="legend-item"><div className="legend-dot" style={{ background: 'linear-gradient(180deg,#38bdf8,#0284c7)' }} />AFYP Thực hiện</div>
                      <div className="legend-item"><div className="legend-dot" style={{ background: 'linear-gradient(180deg,#4ade80,#16a34a)' }} />Đạt KH</div>
                      <div className="legend-item"><div className="legend-dot" style={{ background: '#f59e0b', borderRadius: '50%' }} />Kế hoạch</div>
                      <div className="legend-item"><div className="legend-dot" style={{ background: '#38bdf8', borderRadius: '50%' }} />Xu hướng</div>
                    </div>
                  </div>
                {/* Desktop: biểu đồ và vinh danh hiển thị song song */}
                <div className="desktop-honour-layout">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Banca images section (admin only) — desktop */}
                    {(
                      <div className={`banca-imgs-section${Object.keys(bancaImages).length === 0 ? ' is-empty' : ''}`}>
                        <div className="banca-imgs-header">
                          <div className="banca-imgs-title">✦ Vinh Danh Ngôi Sao</div>
                          <button
                            onClick={() => setBancaImgAdminOpen(true)}
                            style={{
                              display: adminAuthed ? undefined : 'none', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(255,215,107,.30)',
                              background: 'rgba(255,215,107,.10)', color: '#ffd76b', fontSize: 10, fontWeight: 700,
                              cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.05em',
                            }}
                          >
                            ⚙ Cài đặt ảnh
                          </button>
                        </div>
                        <div className="banca-imgs-wall">
                          {[
  { id: 'platinum', label: '✦ Ngôi Sao Bạch Kim ✦', start: 0, count: 5 },
  { id: 'gold', label: '✦ Ngôi Sao Vàng ✦', start: 5, count: BANCA_IMG_COUNT - 5 },
].map(({ id, label, start, count }) => {
  const indices = Array.from({ length: count }, (_, offset) => start + offset)
    .filter((imageIndex) => adminAuthed || Boolean(bancaImages[`kpi-banca-img-${String(imageIndex + 1).padStart(2, '0')}`]));
  if (indices.length === 0) return null;
  return (
    <section className={`honour-tier ${id}`} key={id}>
      <div className="honour-tier-title">{label}</div>
      <div className="honour-image-grid">
        {indices.map((i) => {
          const idx = String(i + 1).padStart(2, '0');
          const key = `kpi-banca-img-${idx}`;
          const url = bancaImages[key];
          const isUploading = bancaImgUploading === key;
          return (
            <div
              key={key}
              className={`banca-img-cell${isUploading ? ' is-uploading' : ''}`}
              onClick={() => {
                if (!adminAuthed || isUploading) return;
                if (url && !confirm('Thay ảnh này?')) return;
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e: any) => {
                  const file = e.target.files?.[0];
                  if (file) uploadBancaImage(key, file);
                };
                input.click();
              }}
              title={adminAuthed ? (url ? 'Click để thay ảnh' : 'Click để upload ảnh') : undefined}
            >
              {url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${id === 'platinum' ? 'Bạch Kim' : 'Vàng'} ${idx}`} />
                  {adminAuthed && <button className="banca-img-del" onClick={(e) => { e.stopPropagation(); deleteBancaImage(key); }} title="Xóa ảnh">×</button>}
                </>
              ) : (
                <span className="banca-img-placeholder">+{idx}</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
})}
                        </div>
                        {adminAuthed && Object.keys(bancaImages).length === 0 && (
                          <div className="banca-img-empty-hint">Chưa có ảnh nào. Bấm vào ô tròn hoặc nút "Cài đặt ảnh" để upload.</div>
                        )}
                        <div className="honour-divider" aria-hidden="true" />
                      </div>
                    )}
                    {/* Target registration button */}
                    <div className="target-reg-section">
                      <button className="target-reg-btn" onClick={() => setTargetRegOpen(true)}>
                        ★ Đăng Ký Mục Tiêu Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
                      </button>
                    </div>
                  </div>
                </div>
                </div>
                {/* Desktop Region Divider (clickable to collapse) — only hides cards in split-right,
                    banca images + target reg button stay visible below. */}
                <div
                  className={`region-divider is-collapse-btn${khuVucCollapsed ? ' collapsed' : ''}`}
                  style={{ gridColumn: '1 / -1', marginTop: 24, marginBottom: 4 }}
                  onClick={() => setKhuVucCollapsed((v) => !v)}
                  role="button"
                  aria-expanded={!khuVucCollapsed}
                >
                  <span className="region-divider-title">
                    <span className="collapse-icon" />
                    Tiến Độ Khu Vực
                  </span>
                </div>
                {/* Desktop: only split-right (cards) is collapsible.
                    Banca images + target reg button stay visible below. */}
                <div className={`khuvuc-region${khuVucCollapsed ? ' collapsed' : ''}`} style={{ gridColumn: '2 / 3' }}>
                <div className="split-right" id="split-depts">
                    {dashboard.phongs.map((phong, pi) => {
                      const pPct = phong.kh ? (phong.afyp / phong.kh * 100) : 0;
                      const pCp = Math.min(pPct, 100);
                      const progStart = progressColor(Math.max(pPct - 24, 0));
                      const progEnd = progressColor(pPct);
                      const afypTrd = Math.round(phong.afyp / 1000000);
                      const khTrd = Math.round(phong.kh / 1000000);
                      const isBanca = !!phong.noAds;

                      return (
                        <div className="dept-section" key={pi}>
                          {isBanca && <div className="banca-separator" aria-hidden="true" />}
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
                          <div
                            className={`rg-card ${phong.noAds ? 'is-banca ' : ''}anim-in${glowCls(pPct)}${isBanca ? ' is-clickable' : ''}`}
                            style={{ animationDelay: `${pi * 60}ms` }}
                            onClick={isBanca ? () => setBancaPopupOpen(true) : undefined}
                          >
                            {/* Header: tên phòng + %KH trên góc phải (như cũ) */}
                            <div className="rg-head">
                              <div className="rg-head-left">
                                <Clipboard size={15} style={{ color: '#fff', flexShrink: 0 }} />
                                <span className="rg-head-name">{phong.ten}</span>
                              </div>
                              {!phong.noAds && phong.kh > 0 && <span className="rg-head-pct"><AnimPct value={pPct} /></span>}
                              {isBanca && <span className="rg-head-hint">Xem chi tiết TVV →</span>}
                            </div>
                            {/* AFYP row: AFYP + KH inline (1 bên, như cũ) — đơn vị đ */}
                            {(phong.afyp > 0 || phong.noAds) && (
                              <div className="rg-afyp-row">
                                <span className="rg-afyp"><AnimNum value={phong.afyp} /><span className="rg-afyp-unit">đ</span></span>
                                {phong.noAds ? (
                                  <span className="rg-banca-tvv-count">SL TVV: {phong.tvvCount ?? 0}</span>
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
                                      const openAdPopup = (e: React.MouseEvent) => {
                                        if (!adStructForPopup) return;
                                        const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
                                        const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
                                        setAdPopupNhom(null);
                                        setAdPopup({
                                          maAD: adStructForPopup.maAD,
                                          tenAD: ad.ten,
                                          originX: e.clientX - vw / 2,
                                          originY: e.clientY - vh / 2,
                                        });
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
                </div>{/* end split-right */}
                </div>{/* end khuvuc-region desktop — only split-right cards */}


              </div>{/* end desktop-split */}
            </>
          )}
        </section>

        {/* ===== DETAIL VIEW ===== */}
        <section className={`view ${view === 'detail' ? 'active' : ''}`} id="view-detail" role="region">
          <div className="detail-shell">
            <div className="sub-header">
              <BackButton onClick={() => setView('main')} size={20} title="Quay lại" />
              <span className="sub-title">Chi Tiết Ban Nhóm</span>
              <div style={{ width: 32 }} />
            </div>
            <div className="sub-line-wrap"><div className="sub-line" /></div>
            <div className="detail-hero" style={{ textAlign: 'center', marginTop: 6 }}>
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
            {/* Nút "Nhập kế hoạch khung" — luôn hiện, có label rõ ràng.
                - Chưa calAuthed → mở popup calPwd (mật khẩu lịch)
                - Đã calAuthed → mở form tạo kế hoạch mới */}
            <button
              type="button"
              onClick={() => {
                if (calAuthed) {
                  openCalEditForNew();
                } else {
                  openCalPwd();
                }
              }}
              title="Nhập kế hoạch khung mới"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 10px', borderRadius: 8,
                background: calAuthed ? '#0d4d4d' : '#3a3f48',
                color: calAuthed ? '#f3ffff' : '#c0c8d0',
                border: `1px solid ${calAuthed ? '#008080' : '#5a6068'}`,
                fontSize: 11, fontWeight: 800, cursor: 'pointer',
                transition: 'all .2s',
              }}
            >
              <Settings size={14} />
              <span>Nhập kế hoạch</span>
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
                            className={`cal-line editable${calAuthed ? ' authed' : ' locked'}`}
                            key={ei}
                            onClick={() => openCalEditFor(e)}
                            title={calAuthed ? 'Bấm để sửa' : 'Bấm để mở khóa (cần mật khẩu)'}
                          >
                            {e.title}
                          </span>
                        ))
                        : <span className="cal-empty" />}
                    </div>
                    <div className="cal-owner">
                      {row.events.map((e, ei) => {
                        // Multi-select: split owner string by ", " → render each as separate tag on its own line
                        const ownerList = (e.owner || '').split(',').map(s => s.trim()).filter(Boolean);
                        if (ownerList.length === 0) {
                          return (
                            <span
                              className="cal-owner-tag"
                              key={ei}
                              style={{ color: '#fff', background: '#94a3b8' }}
                              title=""
                            >
                              —
                            </span>
                          );
                        }
                        return ownerList.map((o, oi) => (
                          <span
                            className="cal-owner-tag"
                            key={`${ei}-${oi}`}
                            style={{ color: '#fff', background: getOwnerColor(o) }}
                            title={o}
                          >
                            {o}
                          </span>
                        ));
                      })}
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
                  <CalDatePicker
                    value={calEditForm.date}
                    onChange={(v) => setCalEditForm(s => ({ ...s, date: v }))}
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
                  <span className="cal-field-label">Phụ trách (có thể chọn nhiều)</span>
                  <div className="cal-owner-grid">
                    {CAL_OWNERS.map(o => {
                      const selected = calEditForm.owners.includes(o);
                      return (
                        <button
                          key={o}
                          type="button"
                          className={`cal-owner-opt${selected ? ' on' : ''}`}
                          style={selected ? { background: getOwnerColor(o), borderColor: getOwnerColor(o) } : {}}
                          // Multi-select toggle: click to add, click again to remove
                          onClick={() => setCalEditForm(s => ({
                            ...s,
                            owners: selected
                              ? s.owners.filter(x => x !== o)
                              : [...s.owners, o],
                          }))}
                        >
                          {o}
                        </button>
                      );
                    })}
                  </div>
                  {/* Custom "Khác" input — type text and press Enter to add as new owner tag */}
                  <input
                    type="text"
                    className="cal-field-input cal-owner-custom"
                    placeholder="Nhập đối tượng khác rồi nhấn Enter để thêm..."
                    value={calEditForm.ownerCustom}
                    onChange={e => setCalEditForm(s => ({ ...s, ownerCustom: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const v = calEditForm.ownerCustom.trim();
                        if (v && !calEditForm.owners.includes(v)) {
                          setCalEditForm(s => ({ ...s, owners: [...s.owners, v], ownerCustom: '' }));
                        }
                      }
                    }}
                  />
                  {/* Show selected owners as removable chips */}
                  {calEditForm.owners.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {calEditForm.owners.map(o => (
                        <span
                          key={o}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 6px', borderRadius: 4,
                            background: getOwnerColor(o), color: '#fff',
                            fontSize: 10, fontWeight: 800, lineHeight: 1.2,
                          }}
                        >
                          {o}
                          <button
                            type="button"
                            onClick={() => setCalEditForm(s => ({ ...s, owners: s.owners.filter(x => x !== o) }))}
                            style={{
                              background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff',
                              cursor: 'pointer', padding: '0 4px', borderRadius: 3,
                              fontSize: 11, lineHeight: 1, fontWeight: 900,
                            }}
                            title="Xóa"
                          >×</button>
                        </span>
                      ))}
                    </div>
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
          <div
            className="adp-modal"
            onClick={e => e.stopPropagation()}
          >
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
                        <span className="adp-info-key" title="Kế hoạch AFYP">KH AFYP</span>
                        <span className="adp-info-val">{(adPopupData.groupInfo.annualKh / 1000000).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</span>
                      </div>
                      <div className="adp-info-row">
                        <span className="adp-info-key" title="Thực hiện">THỰC HIỆN</span>
                        <span className="adp-info-val">{(adPopupData.groupInfo.afyp / 1000000).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</span>
                      </div>
                      <div className="adp-info-row">
                        <span className="adp-info-key" title="% hoàn thành">%HT</span>
                        <span className="adp-info-val">{adPopupData.groupInfo.tyTrongIP.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span>
                      </div>
                      <div className="adp-info-row">
                        <span className="adp-info-key" title="Lượt hợp đồng">LƯỢT HĐ</span>
                        <span className="adp-info-val">{adPopupData.groupInfo.lhd}</span>
                      </div>
                      <div className="adp-info-row">
                        <span className="adp-info-key" title="Lượt hợp đồng chuẩn">LƯỢT HĐC</span>
                        <span className="adp-info-val">{adPopupData.groupInfo.hdChuan}</span>
                      </div>
                      <div className="adp-info-row">
                        <span className="adp-info-key" title="Tuyển dụng">TD</span>
                        <span className="adp-info-val">{adPopupData.groupInfo.td}</span>
                      </div>
                      <div className="adp-info-row">
                        <span className="adp-info-key" title="Năng suất">NS</span>
                        <span className="adp-info-val">{adPopupData.groupInfo.nangSuat.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="adp-info-row">
                        <span className="adp-info-key" title="Độ lớn hợp đồng">ĐLHĐ</span>
                        <span className="adp-info-val">{(adPopupData.groupInfo.doLonHD / 1000000).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</span>
                      </div>
                      <div className="adp-info-row adp-info-row-tvv">
                        <span className="adp-info-key">TỔNG SỐ TVV</span>
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

      {/* ===== TARGET REGISTRATION LIST VIEW ===== */}
      <section className={`view ${view === 'target-reg-list' ? 'active' : ''}`} id="view-target-reg-list" role="region">
        <div className="tgr-list-shell">
          <div className="sub-header">
            <BackButton onClick={() => setView('main')} size={20} title="Quay lại" />
            <span className="sub-title">Danh Sách Đăng Ký Mục Tiêu</span>
            {/* Export Excel button — admin only */}
            {adminAuthed && targetRegList.length > 0 && (
              <button
                onClick={exportTargetRegExcel}
                style={{
                  height: 32, padding: '0 12px', borderRadius: 6, border: '1px solid rgba(108,199,138,.30)',
                  background: 'rgba(108,199,138,.10)', color: '#6cc78a', fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                  textTransform: 'uppercase', letterSpacing: '.04em',
                }}
                title="Tải file Excel danh sách đăng ký"
              >
                ⬇ Excel
              </button>
            )}
            {!adminAuthed && <div style={{ width: 32 }} />}
          </div>
          <div className="sub-line-wrap"><div className="sub-line" /></div>
          <div className="tgr-list-table-wrap">
            <div className="tgr-list-table-meta">
              <span>Tổng số đăng ký: {targetRegList.length}{adminAuthed && ' — admin có quyền chỉnh sửa'}</span>
              <em>Đơn vị tính: AFYP - triệu đồng và Lượt - TVV</em>
            </div>
            {targetRegLoading ? (
              <div className="tgr-list-empty">Đang tải...</div>
            ) : targetRegList.length === 0 ? (
              <div className="tgr-list-empty">Chưa có đăng ký nào trong tháng này.</div>
            ) : (
              <table className="tgr-list-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>NHÓM</th>
                    <th>HỌ TÊN</th>
                    <th>CV</th>
                    <th style={{ textAlign: 'right' }}>AFYP (triệu)</th>
                    <th style={{ textAlign: 'right' }}>LƯỢT</th>
                    <th>GHI CHÚ</th>
                    {adminAuthed && <th style={{ textAlign: 'right' }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {targetRegList.map((reg, idx) => {
                    const isEditing = targetRegEditId === reg.id;
                    if (isEditing && targetRegEditForm) {
                      return (
                        <tr key={reg.id}>
                          <td>{idx + 1}</td>
                          <td>
                            <input
                              className="tgr-field-input"
                              style={{ height: 30, padding: '0 8px', fontSize: 11 }}
                              value={targetRegEditForm.nhom || ''}
                              onChange={(e) => setTargetRegEditForm((p: any) => ({ ...p, nhom: e.target.value }))}
                            />
                          </td>
                          <td>
                            <input
                              className="tgr-field-input"
                              style={{ height: 30, padding: '0 8px', fontSize: 11 }}
                              value={targetRegEditForm.agentName || ''}
                              onChange={(e) => setTargetRegEditForm((p: any) => ({ ...p, agentName: e.target.value }))}
                            />
                          </td>
                          <td>
                            <input
                              className="tgr-field-input"
                              style={{ height: 30, padding: '0 8px', fontSize: 11 }}
                              value={targetRegEditForm.position || ''}
                              onChange={(e) => setTargetRegEditForm((p: any) => ({ ...p, position: e.target.value }))}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              className="tgr-field-input"
                              style={{ height: 30, padding: '0 8px', fontSize: 11, width: 80, textAlign: 'right' }}
                              value={targetRegEditForm.afypTrieu || ''}
                              onChange={(e) => setTargetRegEditForm((p: any) => ({ ...p, afypTrieu: e.target.value }))}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              className="tgr-field-input"
                              style={{ height: 30, padding: '0 8px', fontSize: 11, width: 60, textAlign: 'right' }}
                              value={targetRegEditForm.luotHD || ''}
                              onChange={(e) => setTargetRegEditForm((p: any) => ({ ...p, luotHD: e.target.value }))}
                            />
                          </td>
                          <td>
                            <input
                              className="tgr-field-input"
                              style={{ height: 30, padding: '0 8px', fontSize: 11 }}
                              value={targetRegEditForm.note || ''}
                              onChange={(e) => setTargetRegEditForm((p: any) => ({ ...p, note: e.target.value }))}
                            />
                          </td>
                          <td>
                            <div className="tgr-list-actions">
                              <button className="tgr-list-action-btn edit" onClick={saveTargetRegEdit} disabled={targetRegSaving}>
                                {targetRegSaving ? '...' : 'Lưu'}
                              </button>
                              <button className="tgr-list-action-btn del" onClick={() => { setTargetRegEditId(null); setTargetRegEditForm(null); }}>
                                Hủy
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={reg.id}>
                        <td>{idx + 1}</td>
                        <td>{reg.nhom || '—'}</td>
                        <td>{reg.agentName || '—'}</td>
                        <td>{reg.position || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#ffd76b' }}>
                          {(reg.afypTarget / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{reg.luotHDTarget || 0}</td>
                        <td style={{ fontSize: 10, color: '#8ab8e0' }}>{reg.note || ''}</td>
                        {adminAuthed && (
                          <td>
                            <div className="tgr-list-actions">
                              <button
                                className="tgr-list-action-btn edit"
                                onClick={() => {
                                  setTargetRegEditId(reg.id);
                                  setTargetRegEditForm({
                                    nhom: reg.nhom || '',
                                    agentCode: reg.agentCode || '',
                                    agentName: reg.agentName || '',
                                    position: reg.position || '',
                                    afypTrieu: String(reg.afypTarget / 1_000_000),
                                    luotHD: String(reg.luotHDTarget || 0),
                                    note: reg.note || '',
                                  });
                                }}
                              >
                                Sửa
                              </button>
                              <button className="tgr-list-action-btn del" onClick={() => deleteTargetReg(reg.id)}>
                                Xóa
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* ===== TARGET REGISTRATION POPUP (Đăng ký mục tiêu tháng) ===== */}
      {targetRegOpen && (
        <div className="tgr-modal" onClick={closeTargetReg}>
          <div className="tgr-modal-inner" onClick={(e) => e.stopPropagation()}>
            {!targetRegRole ? (
              <>
                <div className="tgr-modal-title">Đăng Ký Mục Tiêu Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</div>
                <div className="tgr-choice-grid">
                  <button
                    className="tgr-choice-btn"
                    onClick={() => {
                      setTargetRegRole('tn');
                      setTargetRegForm({ nhom: '', maNhom: '', agentCode: '', agentName: '', position: 'Trưởng nhóm', afypTrieu: '', luotHD: '', note: '' });
                    }}
                  >
                    <span className="tgr-choice-icon">👨‍💼</span>
                    <span>Trưởng Nhóm</span>
                    <span className="tgr-choice-sub">Chọn từ DS nhóm có sẵn</span>
                  </button>
                  <button
                    className="tgr-choice-btn"
                    onClick={() => {
                      setTargetRegRole('ttn');
                      setTargetRegForm({ nhom: '', maNhom: '', agentCode: '', agentName: '', position: 'Tiền trưởng nhóm', afypTrieu: '', luotHD: '', note: '' });
                    }}
                  >
                    <span className="tgr-choice-icon">📋</span>
                    <span>Tiền Trưởng Nhóm</span>
                    <span className="tgr-choice-sub">Nhập tay thông tin</span>
                  </button>
                </div>
                <div className="tgr-actions" style={{ marginTop: 16 }}>
                  <button className="tgr-btn tgr-btn-cancel" onClick={closeTargetReg}>Hủy</button>
                </div>
              </>
            ) : (
              <>
                <div className="tgr-modal-title">
                  {targetRegRole === 'tn' ? 'Đăng Ký — Trưởng Nhóm' : 'Đăng Ký — Tiền Trưởng Nhóm'}
                </div>
                <div className="tgr-form">
                  {targetRegRole === 'tn' ? (
                    <>
                      <div className="tgr-field">
                        <label className="tgr-field-label">Nhóm</label>
                        <select
                          className="tgr-field-select"
                          value={targetRegForm.maNhom}
                          onChange={(e) => selectTargetRegNhom(e.target.value)}
                        >
                          <option value="">— Chọn nhóm —</option>
                          {(rawData?.leaders || [])
                            .filter((l: LeaderInfo) => {
                              // Lọc TB/TN (Trưởng nhóm / Trưởng ban) — bỏ TTN
                              const pos = (l.position || '').toLowerCase().trim();
                              if (pos.includes('tiền trưởng') || pos.includes('trưởng tổ') || pos === 'ttn') return false;
                              return pos.includes('trưởng nhóm') || pos.includes('trưởng ban');
                            })
                            .map((l: LeaderInfo) => (
                              <option key={l.id} value={l.maNhom}>
                                {l.nhom} ({l.maNhom})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="tgr-field">
                        <label className="tgr-field-label">Họ tên Trưởng nhóm</label>
                        <input
                          className="tgr-field-input"
                          readOnly
                          value={targetRegForm.agentName || '(tự động khi chọn nhóm)'}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="tgr-field">
                        <label className="tgr-field-label">Họ tên</label>
                        <input
                          className="tgr-field-input"
                          value={targetRegForm.agentName}
                          onChange={(e) => setTargetRegForm((p) => ({ ...p, agentName: e.target.value }))}
                          placeholder="Nhập họ tên Tiền trưởng nhóm"
                        />
                      </div>
                      <div className="tgr-field">
                        <label className="tgr-field-label">Mã số</label>
                        <input
                          className="tgr-field-input"
                          value={targetRegForm.agentCode}
                          onChange={(e) => setTargetRegForm((p) => ({ ...p, agentCode: e.target.value }))}
                          placeholder="Nhập mã số đại lý"
                        />
                      </div>
                    </>
                  )}
                  <div className="tgr-field">
                    <label className="tgr-field-label">Mục tiêu đăng ký: AFYP <span>(tùy chọn)</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        className="tgr-field-input"
                        type="number"
                        inputMode="decimal"
                        value={targetRegForm.afypTrieu}
                        onChange={(e) => setTargetRegForm((p) => ({ ...p, afypTrieu: e.target.value }))}
                        placeholder="VD: 50"
                        style={{ flex: 1 }}
                      />
                      <span className="tgr-field-suffix">triệu đồng</span>
                    </div>
                  </div>
                  <div className="tgr-field">
                    <label className="tgr-field-label">Lượt HĐ <span>(tùy chọn)</span></label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        className="tgr-field-input"
                        type="number"
                        inputMode="decimal"
                        value={targetRegForm.luotHD}
                        onChange={(e) => setTargetRegForm((p) => ({ ...p, luotHD: e.target.value }))}
                        placeholder="VD: 10"
                        style={{ flex: 1 }}
                      />
                      <span className="tgr-field-suffix">lượt</span>
                    </div>
                  </div>
                  <div className="tgr-field">
                    <label className="tgr-field-label">Ghi chú (tùy chọn)</label>
                    <input
                      className="tgr-field-input"
                      value={targetRegForm.note}
                      onChange={(e) => setTargetRegForm((p) => ({ ...p, note: e.target.value }))}
                      placeholder=""
                    />
                  </div>
                  <div className="tgr-actions">
                    <button className="tgr-btn tgr-btn-cancel" onClick={() => setTargetRegRole(null)}>← Quay lại</button>
                    <button className="tgr-btn tgr-btn-confirm" onClick={submitTargetReg} disabled={targetRegSaving}>
                      {targetRegSaving ? 'Đang lưu...' : '✓ Xác nhận đăng ký'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== BANCA ADMIN MODAL (upload 15 ảnh) ===== */}
      {bancaImgAdminOpen && (
        <div className="banca-admin-modal" onClick={() => setBancaImgAdminOpen(false)}>
          <div className="banca-admin-modal-inner" onClick={(e) => e.stopPropagation()}>
            <div className="banca-admin-modal-title">
              <span>★ Cài đặt 15 ảnh đặc biệt</span>
              <button
                onClick={() => setBancaImgAdminOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18 }}
              >×</button>
            </div>
            <div style={{ fontSize: 11, color: '#8ab8e0', marginBottom: 12 }}>
              Bấm vào ô tròn để upload ảnh. Bấm dấu × trên ảnh để xóa. Ảnh được lưu trên server.
            </div>
            <div className="banca-imgs-grid" style={{ minHeight: 200 }}>
              {Array.from({ length: BANCA_IMG_COUNT }, (_, i) => {
                const idx = String(i + 1).padStart(2, '0');
                const key = `kpi-banca-img-${idx}`;
                const url = bancaImages[key];
                const isUploading = bancaImgUploading === key;
                return (
                  <div
                    key={key}
                    className={`banca-img-cell${isUploading ? ' is-uploading' : ''}`}
                    style={{ maxWidth: 90 }}
                    onClick={() => {
                      if (!isUploading) setBancaAdminSelectedKey(key);
                    }}
                    title={url ? 'Chọn để chỉnh thông tin / thay ảnh' : 'Chọn để upload ảnh'}
                  >
                    {url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Banca ${idx}`} />
                        <button
                          className="banca-img-del"
                          onClick={(e) => { e.stopPropagation(); if (!adminAuthed) return; deleteBancaImage(key); }}
                          title="Xóa ảnh"
                        >×</button>
                      </>
                    ) : (
                      <span className="banca-img-placeholder">+{idx}</span>
                    )}
                  </div>
                );
              })}
            </div>
            {bancaAdminSelectedKey && (() => {
              const selectedUrl = bancaImages[bancaAdminSelectedKey];
              const selectedIdx = bancaAdminSelectedKey.replace('kpi-banca-img-', '');
              const profile = bancaProfiles[bancaAdminSelectedKey] || { name: '', title: '', note: '' };
              const chooseImage = () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e: any) => {
                  const file = e.target.files?.[0];
                  if (file) uploadBancaImage(bancaAdminSelectedKey, file);
                };
                input.click();
              };
              return (
                <div className="banca-profile-editor">
                  <div className="banca-profile-editor-head">
                    <span>{Number(selectedIdx) <= 5 ? 'Bạch Kim' : 'Vàng'} · vị trí #{selectedIdx} — thông tin hiển thị cho người xem</span>
                    <button onClick={() => setBancaAdminSelectedKey(null)} aria-label="Đóng">×</button>
                  </div>
                  <div className="banca-profile-editor-grid">
                    <div className="banca-profile-preview">
                      {selectedUrl ? <img src={selectedUrl} alt={profile.name || `Vinh danh ${selectedIdx}`} /> : <span>Chưa có ảnh</span>}
                    </div>
                    <div className="banca-profile-fields">
                      <input value={profile.name} onChange={(e) => updateBancaProfile(bancaAdminSelectedKey, { name: e.target.value })} placeholder="Họ và tên" />
                      <input value={profile.title} onChange={(e) => updateBancaProfile(bancaAdminSelectedKey, { title: e.target.value })} placeholder="Danh hiệu / chức danh" />
                      <textarea value={profile.note} onChange={(e) => updateBancaProfile(bancaAdminSelectedKey, { note: e.target.value })} placeholder="Thông tin thêm (tùy chọn)" rows={3} />
                      <div className="banca-profile-actions">
                        <button className="banca-profile-action save" onClick={() => saveBancaProfile(bancaAdminSelectedKey)} disabled={bancaProfileSaving}>{bancaProfileSaving ? 'Đang lưu...' : 'Lưu thông tin'}</button>
                        <button className="banca-profile-action" onClick={chooseImage}>{selectedUrl ? 'Thay ảnh' : 'Tải ảnh lên'}</button>
                        {selectedUrl && <button className="banca-profile-action danger" onClick={() => deleteBancaImage(bancaAdminSelectedKey)}>Xóa ảnh</button>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {bancaProfileOpenKey && bancaImages[bancaProfileOpenKey] && (() => {
        const profile = bancaProfiles[bancaProfileOpenKey] || { name: '', title: '', note: '' };
        return (
          <div className="honour-profile-modal" onClick={() => setBancaProfileOpenKey(null)}>
            <div className="honour-profile-card" onClick={(e) => e.stopPropagation()}>
              <button className="honour-profile-close" onClick={() => setBancaProfileOpenKey(null)} aria-label="Đóng">×</button>
              <img src={bancaImages[bancaProfileOpenKey]} alt={profile.name || 'Ngôi sao vinh danh'} />
              <div className="honour-profile-info">
                <div className="honour-profile-kicker">VINH DANH NGÔI SAO</div>
                <h3>{profile.name || 'Ngôi sao vinh danh'}</h3>
                {profile.title && <p className="honour-profile-title">{profile.title}</p>}
                {profile.note && <p className="honour-profile-note">{profile.note}</p>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== BANCA-PA DETAIL POPUP (no summary, only detail table) ===== */}
      {bancaPopupOpen && bancaPopupData && (
        <div className="adp-overlay" onClick={() => setBancaPopupOpen(false)}>
          <div
            className="adp-modal is-banca-modal"
            onClick={e => e.stopPropagation()}
          >
            {/* Slim header: title + close */}
            <div className="adp-header">
              <span className="adp-header-name">BANCA - PA — Chi tiết TVV (Tổng: {bancaPopupData.totalTvv})</span>
              <button className="adp-close" onClick={() => setBancaPopupOpen(false)} aria-label="Đóng">
                <X size={16} />
              </button>
            </div>

            <div className="adp-body">
              {/* Bảng chi tiết TVV — giống của AD nhưng không có phần tổng hợp ở trên */}
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
                        <th colSpan={bancaPopupData.months37.length} className="adp-th-ip">
                          <span className="adp-th-ip-label">IP</span>
                          <span className="adp-th-ip-unit">(Triệu đồng)</span>
                        </th>
                      </tr>
                      <tr>
                        {bancaPopupData.months37.map(m => (
                          <th key={m} className="adp-th-month">{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bancaPopupData.tvvTable.length === 0 && (
                        <tr><td colSpan={4 + bancaPopupData.months37.length} className="adp-empty">Chưa có TVV trong phòng Banca - PA</td></tr>
                      )}
                      {bancaPopupData.tvvTable.map(row => (
                        <tr key={row.agentCode}>
                          <td className="adp-td-stt">{row.stt}</td>
                          <td className="adp-td-code">{row.agentCode}</td>
                          <td className="adp-td-name">{row.agentName}</td>
                          <td className="adp-td-pos">{row.chucVu}</td>
                          {bancaPopupData.months37.map(m => {
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

      {/* ===== ADMIN LOGIN POPUP — đã chuyển sang giao diện chính ứng dụng (/src/app/page.tsx) ===== */}
    </div>
  );
}

/* ================= ROUTE /kpi (KPI0 — admin version) =================
   Đây là default export cho route /kpi. KPI0 dành cho admin, có đầy đủ
   nút back về main app và admin features. */
export default function KPIPage() {
  return <KPIDashboard standalone />;
}
