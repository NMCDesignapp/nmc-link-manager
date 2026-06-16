'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Trophy, RotateCw, CalendarDays, BarChart3, Flag, BookOpen, Star,
  ArrowLeft, ChevronDown, Clipboard, Award, Crown, Medal
} from 'lucide-react';

/* ================= CSS ================= */
const CSS = `
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css');
:root {
  --bg: #021616; --bg2: #032c2c; --bg-card: #171f2b; --fg: #f3efe7;
  --muted: #9a9184; --accent: #6cc78a; --accent-strong: #ffc505;
  --accent-glow: #b1a85552; --green: #659c6c; --red: #9f5f52;
  --blue: #7d8ca3; --border: #ffffff1a; --gold: #c6a56a;
  --track: #201a14; --track-fill: #d8bb86; --track-soft: #6f5740;
  --notice-h: 44px;
}
*, *::before, *::after { box-sizing: border-box; }
button { border: none; background: none; padding: 0; margin: 0; font: inherit; color: inherit; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; }
.kpi-app { background: var(--bg); font-family: Tahoma, Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: var(--fg); overflow-x: hidden; -webkit-font-smoothing: antialiased; min-height: 100vh; }
.kpi-app .bg-scene { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; background: radial-gradient(ellipse at 30% 20%, #0e2240 0%, var(--bg) 70%); }
.kpi-app .bg-orb { position: absolute; border-radius: 50%; filter: blur(100px); opacity: .18; animation: orbFloat 18s ease-in-out infinite alternate; will-change: transform; }
.kpi-app .bg-orb-1 { width: 500px; height: 500px; background: #091c36; top: -15%; left: -10%; }
.kpi-app .bg-orb-2 { width: 400px; height: 400px; background: #0b1530; bottom: -10%; right: -10%; animation-delay: -6s; }
.kpi-app .bg-orb-3 { width: 300px; height: 300px; background: #0d2040; top: 50%; left: 60%; animation-delay: -12s; }
@keyframes orbFloat { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-40px) scale(1.08); } 100% { transform: translate(-15px,15px) scale(.95); } }

.kpi-app .app-wrap { position: relative; z-index: 1; max-width: 860px; margin: 0 auto; padding: 24px 16px 24px; }
@media (min-width: 900px) { .kpi-app .app-wrap { max-width: none; padding: 24px 0; } }

.kpi-app .view { display: none; animation: viewIn .4s ease-out; }
.kpi-app .view.active { display: block; }
@keyframes viewIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes cardSlideIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

/* Hero */
.kpi-app .hero-title { font-family: Tahoma, Arial, Helvetica, sans-serif; font-size: clamp(2rem, 7vw, 3rem); font-weight: 900; font-style: italic; text-transform: uppercase; letter-spacing: 0; line-height: 1.1; background: linear-gradient(135deg, #ffffff 0%, #dff4ff 28%, #8fd0ff 54%, #6cc78a 82%, #d7fff0 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.kpi-app .hero-sub { font-size: 11px; font-weight: 800; color: #d9b65a; text-transform: uppercase; letter-spacing: .18em; margin-top: 4px; }

/* Controls */
.kpi-app .ctrl-bar { display: flex; gap: 8px; margin-top: 20px; flex-wrap: nowrap; align-items: stretch; }
.kpi-app .ctrl-select-wrap { position: relative; flex: 1 1 0; min-width: 0; }
.kpi-app .ctrl-select { width: 100%; height: 48px; padding: 0; border-radius: 12px; background: rgba(212,168,67,.08); backdrop-filter: blur(8px); border: 1px solid #d4a84373; color: #f2d38d; font-weight: 800; font-size: 13px; outline: none; font-family: inherit; cursor: pointer; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.kpi-app .ctrl-select-popup { position: absolute; top: calc(100% + 8px); left: 0; width: 280px; max-width: calc(100vw - 32px); background: #12223bcc; border: 1px solid #ffffff14; border-radius: 12px; box-shadow: 0 18px 36px #00000055; backdrop-filter: blur(12px); padding: 8px; display: none; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 6px; z-index: 30; max-height: 238px; overflow-y: auto; }
.kpi-app .ctrl-select-wrap.open .ctrl-select-popup { display: grid; }
.kpi-app .ctrl-select-opt { min-height: 34px; border-radius: 9px; border: 1px solid #ffffff10; background: #ffffff08; color: #dbe7f5; font-family: inherit; font-size: 11px; font-weight: 800; cursor: pointer; transition: all .2s; }
.kpi-app .ctrl-select-opt:hover { background: #ffffff14; color: #fff; }
.kpi-app .ctrl-select-opt.on { background: linear-gradient(135deg, var(--accent), #f59e0b); color: #000; border-color: #f4c261; box-shadow: 0 6px 18px #c6a56a45; }
.kpi-app .btn-sync { flex: 1 1 0; height: 48px; padding: 0 8px; border-radius: 12px; border: 1px solid #d4a84373; background: rgba(212,168,67,.08); backdrop-filter: blur(8px); color: #f2d38d; font-weight: 900; font-size: 13px; font-family: inherit; display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: transform .15s, background .2s; }
.kpi-app .btn-sync:hover { background: rgba(212,168,67,.14); transform: translateY(-1px); }
.kpi-app .btn-sync:active { transform: scale(.96); }
.kpi-app .btn-sync.loading { pointer-events: none; opacity: .7; }

/* Company Card */
.kpi-app #kpi-company { margin-top: 32px; }
.kpi-app .kpi-cty { background: linear-gradient(180deg, #1b2f49, #172a43); border: 1.5px solid #d6a34866; border-top: 4px solid #f2b24d; box-shadow: 0 20px 50px #0000005c, inset 0 1px 0 #ffffff14; padding: 18px 20px 22px; margin-bottom: 10px; border-radius: 14px; position: relative; overflow: hidden; }
.kpi-app .kpi-cty.glow-full { border-color: #f2d38d; box-shadow: 0 0 0 2px #f2d38d6b, 0 24px 54px #00000066, 0 0 34px #f2d38d38; }
.kpi-app .kpi-cty.glow-full::before, .kpi-app .kpi-ad.glow-full::before { content: 'HTKH'; position: absolute; top: 10px; left: 10px; z-index: 4; padding: 4px 8px; border-radius: 999px; background: linear-gradient(135deg, #a8ffa8, #6fff6f); color: #2d5c26; font-size: 10px; font-weight: 900; letter-spacing: .05em; box-shadow: 0 8px 18px #73f26e35; }
.kpi-app .cty-inner { position: relative; z-index: 1; }
.kpi-app .cty-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.kpi-app .cty-name { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 900; text-transform: uppercase; color: #ff9f2f; }
.kpi-app .cty-pct-num { font-size: clamp(2rem, 6vw, 2.5rem); font-weight: 900; line-height: 1; color: #e0c48c; }
.kpi-app .cty-body { display: grid; grid-template-columns: minmax(0,1fr) minmax(180px, 340px); gap: 18px; align-items: center; }
.kpi-app .afyp-kh-row { display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
.kpi-app .afyp-big { font-weight: 900; line-height: 1.1; color: #fff; }
.kpi-app .kh-small { font-weight: 400; color: #b7aa982e; font-size: .8em; }
.kpi-app .cty .afyp-big { font-size: clamp(2rem, 6vw, 2.7rem); }
.kpi-app .cty .kh-small { font-size: clamp(.8rem, 2vw, 1rem); color: #5a83b8; font-weight: 700; }
.kpi-app .cty-progress { width: 100%; height: 22px; border-radius: 999px; background: #9cc6f04d; overflow: hidden; box-shadow: inset 0 1px 2px #00000033; }
.kpi-app .cty-progress-fill { height: 100%; width: 0; border-radius: inherit; transition: width 1s cubic-bezier(.22,1,.36,1); background: linear-gradient(90deg, #11b76f, #16cb74); will-change: width; }
.kpi-app .cty-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-top: 14px; }
.kpi-app .cty-stat { border-radius: 10px; padding: 8px 6px 7px; text-align: center; border: 1px solid #ffffff0d; }
.kpi-app .cty-stat-label { font-size: 8px; font-weight: 800; text-transform: uppercase; margin-bottom: 5px; color: #9db3d2; letter-spacing: .03em; }
.kpi-app .cty-stat-val { font-size: 18px; font-weight: 900; line-height: 1; }
.kpi-app .cty-stat.hd { background: #233f64; } .kpi-app .cty-stat.hd .cty-stat-val { color: #7fc2ff; }
.kpi-app .cty-stat.td { background: #3a345f; } .kpi-app .cty-stat.td .cty-stat-val { color: #d8b7ff; }
.kpi-app .cty-stat.chuan { background: #0e4453; } .kpi-app .cty-stat.chuan .cty-stat-val { color: #16e0d3; }
.kpi-app .cty-stat.ip { background: #4b3825; } .kpi-app .cty-stat.ip .cty-stat-val { color: #ffd789; }
.kpi-app .cty-stat.ns { background: #1a4a2e; } .kpi-app .cty-stat.ns .cty-stat-val { color: #6be89a; }
.kpi-app .cty-stat.dl { background: #3a3525; } .kpi-app .cty-stat.dl .cty-stat-val { color: #e0c080; }
.kpi-app .cty-stat.sl { background: #2a3a50; } .kpi-app .cty-stat.sl .cty-stat-val { color: #a8c8e8; }

/* Phong Card */
.kpi-app .kpi-phong { background: linear-gradient(180deg, #20457a, #1b3d70); border: 1px solid #5ca2ec55; margin-top: 20px; box-shadow: 0 12px 26px #00000030, inset 0 1px 0 #ffffff10; padding: 16px 18px 18px; border-radius: 18px; position: relative; overflow: hidden; }
.kpi-app .kpi-phong.glow-full { border-color: #ffd58c; box-shadow: 0 0 0 2px #ffd58c55, 0 18px 34px #00000042, 0 0 28px #ffd58c2c; }
.kpi-app .phong-inner { position: relative; z-index: 1; }
.kpi-app .phong-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.kpi-app .phong-name { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 900; text-transform: uppercase; color: #d9ebff; }
.kpi-app .phong-pct { font-size: 19px; font-weight: 900; color: #e0c48c; white-space: nowrap; }
.kpi-app .phong-body { display: grid; grid-template-columns: minmax(0,1fr) minmax(160px, 280px); gap: 16px; align-items: center; }
.kpi-app .phong .afyp-big { font-size: clamp(1.9rem, 5vw, 2.4rem); color: #fff; }
.kpi-app .phong .kh-small { font-size: clamp(.8rem, 2vw, .95rem); color: #7da6d9; font-weight: 700; }
.kpi-app .phong-progress { width: 100%; height: 22px; border-radius: 999px; overflow: hidden; background: #f3dcc04d; box-shadow: inset 0 1px 2px #00000033; }
.kpi-app .phong-progress-fill { width: 0; height: 100%; border-radius: inherit; transition: width 1s cubic-bezier(.22,1,.36,1); background: linear-gradient(90deg, #ff941f, #ff9f2b); will-change: width; }
.kpi-app .phong-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-top: 15px; }
.kpi-app .phong-stat { border-radius: 16px; padding: 11px 8px 10px; text-align: center; border: 1px solid #ffffff0d; }
.kpi-app .phong-stat-label { font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; color: #9fc0e2; }
.kpi-app .phong-stat-val { font-size: 25px; font-weight: 900; line-height: 1; }
.kpi-app .phong-stat.hd { background: #264f87; } .kpi-app .phong-stat.hd .phong-stat-val { color: #9bd0ff; }
.kpi-app .phong-stat.td { background: #3f4389; } .kpi-app .phong-stat.td .phong-stat-val { color: #f0b8ff; }
.kpi-app .phong-stat.chuan { background: #0d5b72; } .kpi-app .phong-stat.chuan .phong-stat-val { color: #18e0e7; }
.kpi-app .phong-stat.ip { background: #635136; } .kpi-app .phong-stat.ip .phong-stat-val { color: #ffd07f; }

/* Mobile Phong Section */
.kpi-app .mobile-phong-section { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.kpi-app .mobile-phong-main-card { border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px #00000050; }
.kpi-app .mobile-phong-main-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 12px; background: linear-gradient(135deg, #e8a838, #d49428); }
.kpi-app .mobile-phong-main-name { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 900; text-transform: uppercase; color: #fff; letter-spacing: .06em; }
.kpi-app .mobile-phong-main-pct { font-size: 17px; font-weight: 900; color: #fff; text-shadow: 0 0 12px #ffffff44; white-space: nowrap; }
.kpi-app .mobile-phong-main-body { padding: 10px 14px 12px; background: #0e2240; }
.kpi-app .mobile-phong-main-afyp { font-size: 1.5rem; font-weight: 900; color: #ffe0a0; line-height: 1.1; text-shadow: 0 0 16px #f2b24d33; }
.kpi-app .mobile-phong-main-kh { font-size: 10px; font-weight: 700; color: #6a9ac8; margin-top: 2px; }
.kpi-app .mobile-phong-main-prog { height: 6px; border-radius: 99px; background: #1a2a44; margin-top: 6px; overflow: hidden; }
.kpi-app .mobile-phong-main-prog-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #e0a030, #f2c860); transition: width 1s cubic-bezier(.22,1,.36,1); }
.kpi-app .mobile-phong-sub-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
.kpi-app .mobile-phong-sub { border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 2px 8px #00000060, 0 0 12px #00000030; }
.kpi-app .mobile-phong-sub-head { padding: 4px 4px 3px; text-align: center; }
.kpi-app .mobile-phong-sub-val { font-size: 14px; font-weight: 900; line-height: 1.1; white-space: nowrap; text-shadow: 0 0 10px currentColor; }
.kpi-app .mobile-phong-sub-label { font-size: 6.5px; font-weight: 900; text-transform: uppercase; color: #fff; text-shadow: 0 1px 3px #00000066; }
.kpi-app .mobile-phong-sub-body { width: 100%; background: #0c1e38; padding: 8px 3px; text-align: center; box-shadow: inset 0 2px 6px #00000044; }
.kpi-app .mobile-phong-sub.hd .mobile-phong-sub-head { background: #2a6cb8; box-shadow: inset 0 -2px 4px #1a4c8866; } .kpi-app .mobile-phong-sub.hd .mobile-phong-sub-val { color: #6cb8f8; }
.kpi-app .mobile-phong-sub.td .mobile-phong-sub-head { background: #7a68b0; box-shadow: inset 0 -2px 4px #5a489066; } .kpi-app .mobile-phong-sub.td .mobile-phong-sub-val { color: #c0a8f0; }
.kpi-app .mobile-phong-sub.chuan .mobile-phong-sub-head { background: #208a9a; box-shadow: inset 0 -2px 4px #106a7a66; } .kpi-app .mobile-phong-sub.chuan .mobile-phong-sub-val { color: #58d8e8; }
.kpi-app .mobile-phong-sub.ip .mobile-phong-sub-head { background: #b89838; box-shadow: inset 0 -2px 4px #98782866; } .kpi-app .mobile-phong-sub.ip .mobile-phong-sub-val { color: #f0d060; }

/* Hide mobile phong section on desktop */
@media (min-width: 900px) {
  .kpi-app .mobile-phong-section { display: none; }
}

/* AD Card */
.kpi-app .ad-grid { display: grid; grid-template-columns: 1fr; gap: 10px; margin-top: 10px; margin-bottom: 8px; }
.kpi-app .kpi-ad { background: linear-gradient(180deg, #f0f2f5, #e4e8ec); border: 1px solid #c8cdd4; box-shadow: 0 4px 12px #00000018, inset 0 1px 0 #ffffff; border-radius: 8px; padding: 7px 10px 6px; cursor: pointer; transition: box-shadow .22s, transform .22s; position: relative; overflow: hidden; }
.kpi-app .kpi-ad:hover { transform: translateY(-1px); }
.kpi-app .kpi-ad.glow-full { border-color: #f2c46e; background: linear-gradient(180deg, #fff8e8, #f5ecd0); box-shadow: 0 0 0 2px #f2c46e55, 0 0 14px #f2c46e30; }
.kpi-app .ad-inner { position: relative; z-index: 1; }
.kpi-app .ad-top { display: grid; grid-template-columns: minmax(90px, 1fr) minmax(0, 2.4fr); gap: 8px; align-items: center; }
.kpi-app .ad-left { min-width: 0; text-align: center; display: flex; flex-direction: column; justify-content: center; }
.kpi-app .ad-name-row { display: flex; align-items: center; justify-content: center; gap: 5px; }
.kpi-app .ad-name { font-size: 13px; font-weight: 900; color: #1a2a3a; }
.kpi-app .ad-pct { font-size: 14px; font-weight: 900; line-height: 1; color: #2a6a9a; white-space: nowrap; }
.kpi-app .ad-kh { margin-top: 2px; display: block; font-size: 8px; color: #6a7a8a; font-weight: 700; }
.kpi-app .ad-stats { display: grid; grid-template-columns: 1.2fr repeat(4, minmax(0,.9fr)); gap: 3px; }
.kpi-app .ad-stat { min-width: 0; border-radius: 6px; padding: 5px 3px 4px; text-align: center; border: 1px solid #d0d4da; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.kpi-app .ad-stat-label { display: block; font-size: 7px; font-weight: 900; text-transform: uppercase; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kpi-app .ad-stat-val { font-size: 12px; font-weight: 900; white-space: nowrap; line-height: 1; }
.kpi-app .ad-stat.afyp { background: #dce8f4; } .kpi-app .ad-stat.afyp .ad-stat-val { color: #1a3a5a; }
.kpi-app .ad-stat.lhd { background: #d4ecf4; } .kpi-app .ad-stat.lhd .ad-stat-val { color: #1a4a6a; }
.kpi-app .ad-stat.td { background: #e4d8f0; } .kpi-app .ad-stat.td .ad-stat-val { color: #4a3080; }
.kpi-app .ad-stat.chuan { background: #d0f0e8; } .kpi-app .ad-stat.chuan .ad-stat-val { color: #106050; }
.kpi-app .ad-stat.ip { background: #e8f0d8; } .kpi-app .ad-stat.ip .ad-stat-val { color: #3a5a10; }
.kpi-app .ad-progress { margin-top: 4px; height: 4px; border-radius: 999px; overflow: hidden; background: #c8ccd2; }
.kpi-app .ad-progress-fill { height: 100%; width: 0; border-radius: inherit; transition: width .9s cubic-bezier(.22,1,.36,1); background: linear-gradient(90deg, #d84b42, #4caf50); will-change: width; }
.kpi-app .ad-stat-unit { font-size: .58em; font-weight: 800; margin-left: 2px; opacity: .85; }

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
.kpi-app .nav-policy { background: linear-gradient(135deg, #6d28d9, #4c1d95); box-shadow: 0 6px 18px #6d28d966; border: 1.5px solid #a78bfa40; }
.kpi-app .nav-clb { background: linear-gradient(135deg, #b45309, #92400e); box-shadow: 0 6px 18px #b4530966; border: 1.5px solid #fbbf2440; }

/* Section Divider */
.kpi-app .section-divider { text-align: center; margin: 20px 0 10px; font-size: 10px; font-weight: 900; color: var(--accent); text-transform: uppercase; letter-spacing: .3em; position: relative; }

/* KPI Stack */
.kpi-app .kpi-stack { display: flex; flex-direction: column; gap: 8px; margin-top: 24px; }
.kpi-app .dept-section { display: flex; flex-direction: column; gap: 0; }

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
.kpi-app .detail-shell { margin-top: 10px; margin-left: auto; margin-right: auto; max-width: 100%; }
.kpi-app .detail-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; position: sticky; top: 0; z-index: 50; padding: 4px 0; }
.kpi-app .btn-back-u { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 9px; border: none; background: transparent; color: var(--muted); cursor: pointer; transition: all .2s; flex-shrink: 0; }
.kpi-app .btn-back-u:hover { color: var(--accent); background: #fbbf240f; }
.kpi-app .detail-hero { text-align: center; padding: 4px 0 2px; }
.kpi-app .detail-title { font-size: clamp(1.45rem, 5vw, 2rem); font-weight: 900; text-transform: uppercase; color: #ffb12b; letter-spacing: -.03em; line-height: 1.05; }
.kpi-app .detail-meta { margin-top: 6px; font-size: 12px; color: #7da0cb; font-weight: 500; }
.kpi-app .month-grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; margin-top: 14px; }
.kpi-app .month-cell { padding: 6px 2px 5px; border-radius: 8px; border: 1px solid #008080; background: #0a3434; color: #b9ffff; cursor: pointer; font-family: inherit; text-align: center; transition: all .2s; display: flex; align-items: center; justify-content: center; }
.kpi-app .month-cell:hover { background: #0d4b4b; color: #f3ffff; }
.kpi-app .month-cell.on { background: #008080; color: #003b3b; box-shadow: 0 6px 16px #00808033; }
.kpi-app .month-cell .mc-label { font-size: 9px; font-weight: 800; }
.kpi-app .detail-list-wrap { margin-top: 14px; display: flex; flex-direction: column; gap: 5px; }
.kpi-app .grp-item { position: relative; display: flex; flex-direction: column; gap: 3px; padding: 6px 10px 5px; border-radius: 10px; background: #1e2f46; border: 1px solid #008080; overflow: hidden; animation: cardSlideIn .4s ease-out both; transition: transform .2s, border-color .2s; }
.kpi-app .grp-item:hover { border-color: #008080; transform: translateY(-1px); }
.kpi-app .grp-fill { position: absolute; inset: 0 auto 0 0; width: 0; background: linear-gradient(90deg, #2b4a6a, #365d84); opacity: .55; transition: width .9s cubic-bezier(.22,1,.36,1); }
.kpi-app .grp-item.is-top .grp-fill { background: linear-gradient(90deg, #1a5c54, #22796e); opacity: .6; }
.kpi-app .grp-item > * { position: relative; z-index: 1; }
.kpi-app .grp-top-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.kpi-app .grp-name { font-weight: 800; font-size: 12px; color: #e8f0f8; line-height: 1.2; flex: 1; }
.kpi-app .grp-pct { font-size: 12px; font-weight: 900; white-space: nowrap; flex-shrink: 0; }
.kpi-app .grp-bot-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.kpi-app .grp-stats-inline { display: inline-flex; align-items: baseline; gap: 3px; white-space: nowrap; }
.kpi-app .grp-stat-main { font-size: 10px; font-weight: 700; color: #b8d0ea; white-space: nowrap; }
.kpi-app .grp-stat-kh { font-size: 10px; font-weight: 600; color: #5a7da0; white-space: nowrap; }
.kpi-app .grp-prog-row { margin-top: 2px; }
.kpi-app .grp-prog { height: 4px; border-radius: 999px; overflow: hidden; background: #ffffff14; width: 100%; }
.kpi-app .grp-prog-fill { height: 100%; width: 0; border-radius: inherit; background: linear-gradient(90deg, #4a9fd4, #7dc8f0); transition: width .9s cubic-bezier(.22,1,.36,1); will-change: width; }
.kpi-app .grp-item.is-top .grp-prog-fill { background: linear-gradient(90deg, #2fbfa8, #4ee8cc); }

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
.kpi-app .cal-text { border-left: 1px solid #00808055; padding: 9px 10px; font-weight: 600; font-size: 13px; line-height: 1.3; color: #1a2e1a; display: flex; align-items: center; background: #f7ffff; }
.kpi-app .cal-owner { min-width: 64px; border-left: 1px solid #00808055; padding: 6px 4px; font-size: 10px; color: #2a3a2a; display: flex; align-items: center; justify-content: center; text-align: center; background: #f7ffff; word-break: break-word; }
.kpi-app .cal-empty { color: #94a3b8; font-style: italic; }
.kpi-app .cal-line { display: block; }

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
  .kpi-app .afyp-chart-wrap { display: block; }
  .kpi-app .app-wrap { max-width: none; }
  .kpi-app #view-main { display: flex; flex-direction: column; gap: 0; padding: 16px 24px 24px; max-width: none; margin: 0 auto; }
  .kpi-app #view-main header { max-width: 1800px; width: 100%; display: flex; align-items: center; justify-content: space-between; margin-bottom: 0; }
  .kpi-app .hero-title { font-size: 1.1rem !important; margin: 0 !important; }
  .kpi-app .hero-sub { display: none; }
  .kpi-app .ctrl-bar { margin-top: 0 !important; }
  .kpi-app .nav-grid { max-width: 1800px; width: 100%; display: flex; gap: 6px; margin: 12px 0 0; flex-wrap: nowrap; }
  .kpi-app .nav-row-3 { display: contents; }
  .kpi-app .nav-btn { flex: 1; padding: 8px 10px; font-size: 10px; border-radius: 8px; white-space: nowrap; }
  .kpi-app .kpi-cty { display: none !important; }
  .kpi-app .dsk-company { display: flex; align-items: stretch; gap: 0; background: linear-gradient(135deg, #0f1f38, #162d50, #0f1f38); border: 1px solid #2a4a72; border-radius: 14px; overflow: hidden; margin-top: 16px; box-shadow: 0 8px 32px #0008; }
  .kpi-app .dsk-cty-left { display: flex; flex-direction: column; justify-content: center; padding: 20px 28px; background: linear-gradient(135deg, #f2b24d18, #d4a84308); border-right: 2px solid #f2b24d44; min-width: 220px; }
  .kpi-app .dsk-cty-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; color: #d4a843; margin-bottom: 6px; }
  .kpi-app .dsk-cty-pct { font-size: 2.4rem; font-weight: 900; line-height: 1; color: #f2d38d; }
  .kpi-app .dsk-cty-prog-wrap { margin-top: 10px; }
  .kpi-app .dsk-cty-prog { width: 100%; height: 8px; border-radius: 99px; background: #1a2a44; overflow: hidden; }
  .kpi-app .dsk-cty-prog-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #e0a030, #f2c860); transition: width 1s cubic-bezier(.22,1,.36,1); }
  .kpi-app .dsk-cty-afyp { margin-top: 8px; font-size: 1.1rem; font-weight: 900; color: #fff; }
  .kpi-app .dsk-cty-kh { font-size: .7rem; font-weight: 600; color: #5a8aba; }
  .kpi-app .dsk-cty-right { display: flex; flex: 1; gap: 0; align-items: stretch; }
  .kpi-app .dsk-cty-tile { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18px 12px; border-right: 1px solid #1a3050; position: relative; }
  .kpi-app .dsk-cty-tile:last-child { border-right: none; }
  .kpi-app .dsk-cty-tile-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #7a9aba; margin-bottom: 6px; }
  .kpi-app .dsk-cty-tile-val { font-size: 1.6rem; font-weight: 900; line-height: 1; }
  .kpi-app .dsk-cty-tile.hd .dsk-cty-tile-val { color: #7fc2ff; }
  .kpi-app .dsk-cty-tile.td .dsk-cty-tile-val { color: #d8b7ff; }
  .kpi-app .dsk-cty-tile.chuan .dsk-cty-tile-val { color: #16e0d3; }
  .kpi-app .dsk-cty-tile.ip .dsk-cty-tile-val { color: #ffd789; }
  .kpi-app .dsk-cty-tile.ns .dsk-cty-tile-val { color: #6be89a; }
  .kpi-app .dsk-cty-tile.dl .dsk-cty-tile-val { color: #e0c080; }
  .kpi-app .dsk-cty-tile.sl .dsk-cty-tile-val { color: #a8c8e8; }
  .kpi-app .desktop-split { display: grid; grid-template-columns: 38% 62%; gap: 20px; width: 100%; max-width: 1800px; align-self: center; align-items: start; margin-top: 20px; }
  .kpi-app .split-left { display: none; }
  .kpi-app .split-center { display: flex; flex-direction: column; gap: 0; position: sticky; top: 16px; align-self: start; }
  .kpi-app .split-right { display: flex; flex-direction: column; gap: 0; }
  .kpi-app .afyp-chart { min-height: 320px; }
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
  .kpi-app #view-detail .detail-list-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-width: 1200px; width: 100%; margin: 0 auto; }
  /* Desktop calendar */
  .kpi-app #view-calendar .cal-wrap { max-width: 920px; margin-left: auto; margin-right: auto; }
}
/* Responsive mobile */
@media (max-width: 640px) {
  .kpi-app .ctrl-bar { gap: 6px; margin-top: 14px; }
  .kpi-app .ctrl-select { width: 100%; height: 44px; border-radius: 10px; font-size: 11px; }
  .kpi-app .btn-sync { height: 44px; font-size: 11px; border-radius: 10px; }
  .kpi-app .cty-body { grid-template-columns: 1fr; gap: 10px; }
  .kpi-app .cty-stats { grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 12px; }
  .kpi-app .cty-stat { border-radius: 8px; padding: 7px 4px 6px; }
  .kpi-app .cty-stat-label { font-size: 7px; margin-bottom: 4px; }
  .kpi-app .cty-stat-val { font-size: 15px; }
  .kpi-app .cty-progress { height: 16px; }
  .kpi-app .phong-body { grid-template-columns: 1fr; gap: 10px; }
  .kpi-app .phong-progress { height: 12px; }
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
  .kpi-app .mobile-phong-sub-grid { grid-template-columns: repeat(4, 1fr); gap: 4px; }
  .kpi-app .mobile-phong-sub-val { font-size: 12px; }
  .kpi-app .mobile-phong-sub-label { font-size: 5.5px; }
  .kpi-app .mobile-phong-sub-body { padding: 6px 2px; }
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
interface CalendarEvent { id: number; title: string; date: string; color: string; }

interface PhongStructure { id: string; maPhong: string; tenPhong: string; note: string; }
interface ADStructure { id: string; maAD: string; tenAD: string; maPhong: string; note: string; }
interface BanNhomStructure { id: string; maBanNhom: string; tenBanNhom: string; maAD: string; ngayBatDau: string; note: string; }
interface TVVStructItem { id: string; agentCode: string; agentName: string; maBanNhom: string; chucVu: string; ngayBatDau: string | null; note: string; }

interface ADData { ten: string; managerKey: string; afyp: number; kh: number; lhd: number; td: number; hdChuan: number; tyTrong: number; }
interface PhongData { ten: string; afyp: number; kh: number; lhd: number; td: number; hdChuan: number; tyTrong: number; ads: ADData[]; noAds: boolean; }
interface TotalData { afyp: number; kh: number; lhd: number; td: number; hdChuan: number; tyTrong: number; totalIP: number; slHD: number; nangSuat: number; doLonHD: number; }
interface GroupDetail { name: string; maBanNhom: string; tenAD: string; maAD: string; tenPhong: string; maPhong: string; afyp: number; kh: number; pct: number; tnName: string; }

/* ================= CONSTANTS ================= */
const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const WEEKDAY_NAMES = ['CN','T2','T3','T4','T5','T6','T7'];

/* ================= UTILITIES ================= */
function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const s = String(v).trim().replace(/\s/g, '').replace(/%/g, '');
  if (!s) return 0;
  const n = Number(s.replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : 0;
}
function fmt(n: number): string { return new Intl.NumberFormat('vi-VN').format(n); }
function fmtBig(v: number): string {
  if (v >= 1e9) return (v/1e9).toFixed(2) + ' tỷ';
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
  if (v >= 1e9) return (v/1e9).toFixed(1) + ' tỷ';
  if (v >= 1e6) return (v/1e6).toFixed(0) + ' tr';
  if (v >= 1e3) return (v/1e3).toFixed(0) + 'k';
  return v.toFixed(0);
}
function progressColor(pct: number): string {
  const p = Math.max(0, Math.min(100, pct || 0));
  const hue = 0 + (120 * (p / 100));
  return `hsl(${hue}, 68%, 52%)`;
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
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(3).replace('.', ',')} tỷ`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(3).replace('.', ',')} trđ`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(3).replace('.', ',')} ngàn`;
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
  const [calMonth, setCalMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [overviewPeriod, setOverviewPeriod] = useState<string>(`month-${new Date().getMonth() + 1}`);
  const [onlineSettings, setOnlineSettings] = useState<Record<string, string>>({});
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [adStructList, setAdStructList] = useState<ADStructure[]>([]);
  const [phongStructList, setPhongStructList] = useState<PhongStructure[]>([]);
  const [banNhomStructList, setBanNhomStructList] = useState<BanNhomStructure[]>([]);
  const [tvvStructList, setTvvStructList] = useState<TVVStructItem[]>([]);

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
  useEffect(() => {
    if (view !== 'calendar') return;
    const year = CUR_YEAR;
    const month = `${year}-${calMonth}`;
    fetch(`/api/calendar?month=${month}`).then(r => r.ok ? r.json() : []).then(setCalendarEvents).catch(() => setCalendarEvents([]));
  }, [view, calMonth, CUR_YEAR]);

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

    // ========== Company-level KPIs ==========
    const totalAFYP = periodContracts.reduce((s, c) => s + num(c.afyp), 0);
    const totalIP = periodContracts.reduce((s, c) => s + num(c.pdt10DT), 0);
    const slHD = periodContracts.length;
    const luotHoatDong = periodContracts.filter(c => num(c.tinhLuot3tr) >= 3000000).length;
    const luotHDChuan = periodContracts.filter(c => num(c.tinhLuot3tr) >= 12000000).length;
    const ipAfypRatio = totalAFYP > 0 ? (totalIP / totalAFYP) * 100 : 0;

    // SL Tuyển dụng: count staff with startDate in selected period months
    const slTuyenDung = staff.filter(s => {
      if (!s.startDate) return false;
      const d = new Date(s.startDate);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === currentYear && periodMonths.includes(d.getMonth() + 1);
    }).length;

    // ========== KH (Kế hoạch) AFYP — from online settings, same keys as quan-ly ==========
    // Read AD annual plans using maAD from structure (same as quan-ly page)
    const adPlans = new Map<string, number>();
    adStructList.forEach(ad => {
      const val = parseFloat(onlineSettings[`nmc-kh-ad-${ad.maAD}`] || '0') || 0;
      adPlans.set(ad.maAD, val);
    });

    // Company total = sum of all AD plans (same as quan-ly)
    const targetTongAFYP = adStructList.reduce((s, ad) => s + (adPlans.get(ad.maAD) || 0), 0);

    // Monthly KH ratio — sum for selected period (same formula as quan-ly)
    let khAFYP = 0;
    if (targetTongAFYP > 0) {
      periodMonths.forEach(m => {
        const mm = String(m).padStart(2, '0');
        const ratio = parseFloat(onlineSettings[`nmc-kh-ratio-${mm}`] || '0') || 0;
        if (ratio > 0) khAFYP += targetTongAFYP * ratio / 100;
      });
    }

    const total: TotalData = {
      afyp: totalAFYP,
      kh: khAFYP,
      lhd: luotHoatDong,
      td: slTuyenDung,
      hdChuan: luotHDChuan,
      tyTrong: ipAfypRatio,
      totalIP,
      slHD,
      nangSuat: luotHoatDong > 0 ? slHD / luotHoatDong : 0,
      doLonHD: luotHoatDong > 0 ? totalAFYP / luotHoatDong : 0,
    };

    // ========== Per-Phong and per-AD data ==========
    const phongs: PhongData[] = [];
    let tyTrongWeighted = 0, tyTrongCount = 0;

    // Use DB structure (same as quan-ly) instead of hardcoded CO_CAU
    const structurePhongs = phongStructList.length > 0 ? phongStructList : [];
    
    for (const phongStruct of structurePhongs) {
      const pName = phongStruct.tenPhong;
      const isBanca = normKey(pName).includes('BANCA');
      const p: PhongData = { ten: pName, afyp: 0, kh: 0, lhd: 0, td: 0, hdChuan: 0, tyTrong: 0, ads: [], noAds: isBanca };

      // Find all ADs belonging to this phong via maPhong
      const phongADs = adStructList.filter(a => a.maPhong === phongStruct.maPhong);
      
      phongADs.forEach(adStruct => {
        const adKey = adStruct.tenAD; // Use AD name as matching key
        
        // Find AD manager name from leaders
        const leader = rawData.leaders.find(l => normKey(l.agentName).includes(normKey(adKey)) || normKey(adKey).includes(normKey(l.agentName)));
        const managerName = leader?.agentName || adKey;

        // Find contracts for this AD using name matching
        const adContracts = periodContracts.filter(c => {
          const adNorm = normKey(c.ad || '');
          return adNorm && (adNorm === normKey(adKey) || adNorm.includes(normKey(adKey)) || normKey(adKey).includes(adNorm));
        });

        const afyp = adContracts.reduce((s, c) => s + num(c.afyp), 0);
        const ip = adContracts.reduce((s, c) => s + num(c.pdt10DT), 0);
        const lhd = adContracts.filter(c => num(c.tinhLuot3tr) >= 3000000).length;
        const td = staff.filter(s => {
          const adNorm = normKey(s.nhom || '');
          return adNorm && (adNorm === normKey(adKey) || adNorm.includes(normKey(adKey)));
        }).length;
        const hdChuan = adContracts.filter(c => num(c.tinhLuot3tr) >= 12000000).length;
        const tyTrong = afyp > 0 ? (ip / afyp * 100) : 0;

        // KH for this AD from settings — directly use maAD from structure
        const maADKey = adStruct.maAD;
        const adKh = adPlans.get(maADKey) || 0;
        // Calculate AD KH for selected period using monthly ratios
        let adPeriodKh = 0;
        if (adKh > 0) {
          periodMonths.forEach(m => {
            const mm = String(m).padStart(2, '0');
            const ratio = parseFloat(onlineSettings[`nmc-kh-ratio-${mm}`] || '0') || 0;
            if (ratio > 0) adPeriodKh += adKh * ratio / 100;
          });
        }

        const d: ADData = { ten: managerName, managerKey: adKey, afyp, kh: adPeriodKh, lhd, td, hdChuan, tyTrong };
        p.ads.push(d);
        p.afyp += afyp; p.kh += adPeriodKh; p.lhd += lhd; p.td += td; p.hdChuan += hdChuan;
        if (!isBanca) { tyTrongWeighted += (afyp > 0 ? afyp : 1) * tyTrong; tyTrongCount += (afyp > 0 ? afyp : 1); }
      });

      p.tyTrong = tyTrongCount ? (tyTrongWeighted / tyTrongCount) : 0;
      phongs.push(p);
    }

    total.tyTrong = totalAFYP > 0 ? (totalIP / totalAFYP * 100) : 0;
    return { total, phongs, periodContracts };
  }, [rawData, overviewPeriod, onlineSettings, adStructList, phongStructList]);

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
          <header className="text-center">
            <h1 className="hero-title">Tiến Độ Kinh Doanh</h1>
            <p className="hero-sub">Bảo Việt Nhân Thọ An Giang</p>
            <div className="ctrl-bar">
              <div className={`ctrl-select-wrap ${periodDropdownOpen ? 'open' : ''}`}>
                <button type="button" className="ctrl-select" onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}>
                  <CalendarDays size={14} style={{ color: '#d4a843' }} />
                  {getPeriodLabel(overviewPeriod)}
                  <ChevronDown size={12} />
                </button>
                <div className="ctrl-select-popup" role="listbox" style={{ width: '320px', maxWidth: 'calc(100vw - 32px)' }}>
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
              <button className={`btn-sync ${syncing ? 'loading' : ''}`} onClick={fetchData} title="Đồng bộ">
                <RotateCw size={14} style={{ color: '#d4a843' }} className={syncing ? 'animate-spin' : ''} />
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
                        <span className="afyp-big" style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)' }}>{formatKpiCurrency(dashboard.total.afyp)}</span>
                        {dashboard.total.kh > 0 && <span className="kh-small">/ {formatKpiCurrency(dashboard.total.kh)}</span>}
                      </div>
                      {dashboard.total.kh > 0 && <div className="cty-progress"><div className="cty-progress-fill" style={{ width: `${cp}%` }} /></div>}
                    </div>
                    <div className="cty-stats">
                      <div className="cty-stat hd"><div className="cty-stat-label">Lượt HĐ</div><div className="cty-stat-val"><AnimNum value={dashboard.total.lhd} /></div></div>
                      <div className="cty-stat td"><div className="cty-stat-label">Tuyển dụng</div><div className="cty-stat-val"><AnimNum value={dashboard.total.td} /></div></div>
                      <div className="cty-stat chuan"><div className="cty-stat-label">HĐ Chuẩn</div><div className="cty-stat-val"><AnimNum value={dashboard.total.hdChuan} /></div></div>
                      <div className="cty-stat ip"><div className="cty-stat-label">Tỷ Trọng IP</div><div className="cty-stat-val">{dashboard.total.tyTrong.toFixed(1)}%</div></div>
                      <div className="cty-stat ns"><div className="cty-stat-label">Năng Suất</div><div className="cty-stat-val">{dashboard.total.nangSuat.toFixed(2)}</div></div>
                      <div className="cty-stat dl"><div className="cty-stat-label">Đo Lường HĐ</div><div className="cty-stat-val">{dashboard.total.doLonHD >= 1000 ? (dashboard.total.doLonHD / 1000).toFixed(1) : dashboard.total.doLonHD.toFixed(1)}<span style={{ fontSize: '10px', opacity: .7 }}> trđ</span></div></div>
                      <div className="cty-stat sl" style={{ gridColumn: '2' }}><div className="cty-stat-label">SL HĐ</div><div className="cty-stat-val"><AnimNum value={dashboard.total.slHD} /></div></div>
                    </div>
                  </div>
                </div>

                {/* Desktop Company Strip */}
                <div className="dsk-company">
                  <div className="dsk-cty-left">
                    <div className="dsk-cty-label"><Trophy size={12} style={{ color: '#f2b24d', marginRight: 4 }} />Công Ty</div>
                    <div className="dsk-cty-pct"><AnimPct value={pct} /></div>
                    {dashboard.total.kh > 0 && <div className="dsk-cty-prog-wrap"><div className="dsk-cty-prog"><div className="dsk-cty-prog-fill" style={{ width: `${cp}%` }} /></div></div>}
                    <div className="dsk-cty-afyp">{formatKpiCurrency(dashboard.total.afyp)}</div>
                    {dashboard.total.kh > 0 && <div className="dsk-cty-kh">KH: {formatKpiCurrency(dashboard.total.kh)}</div>}
                  </div>
                  <div className="dsk-cty-right">
                    <div className="dsk-cty-tile hd"><div className="dsk-cty-tile-label">Lượt HĐ</div><div className="dsk-cty-tile-val"><AnimNum value={dashboard.total.lhd} /></div></div>
                    <div className="dsk-cty-tile td"><div className="dsk-cty-tile-label">Tuyển dụng</div><div className="dsk-cty-tile-val"><AnimNum value={dashboard.total.td} /></div></div>
                    <div className="dsk-cty-tile chuan"><div className="dsk-cty-tile-label">HĐ Chuẩn</div><div className="dsk-cty-tile-val"><AnimNum value={dashboard.total.hdChuan} /></div></div>
                    <div className="dsk-cty-tile ip"><div className="dsk-cty-tile-label">Tỷ Trọng IP</div><div className="dsk-cty-tile-val">{dashboard.total.tyTrong.toFixed(1)}%</div></div>
                    <div className="dsk-cty-tile ns"><div className="dsk-cty-tile-label">Năng Suất</div><div className="dsk-cty-tile-val">{dashboard.total.nangSuat.toFixed(2)}</div></div>
                    <div className="dsk-cty-tile dl"><div className="dsk-cty-tile-label">ĐL HĐ (trđ)</div><div className="dsk-cty-tile-val">{dashboard.total.doLonHD >= 1000 ? (dashboard.total.doLonHD / 1000).toFixed(1) : dashboard.total.doLonHD.toFixed(1)}</div></div>
                    <div className="dsk-cty-tile sl"><div className="dsk-cty-tile-label">SL HĐ</div><div className="dsk-cty-tile-val"><AnimNum value={dashboard.total.slHD} /></div></div>
                  </div>
                </div>
              </div>

              {/* Navigation Grid */}
              <nav className="nav-grid" aria-label="Điều hướng">
                <button className="nav-btn nav-detail" onClick={() => setView('detail')}>
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

              {/* Mobile Phong Cards — hidden on desktop */}
              <div className="mobile-phong-section">
                <div className="section-divider" style={{ marginTop: 6 }}>Tiến Độ Khu Vực</div>
                {dashboard.phongs.length === 0 && (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: '#5a8aaa', fontSize: 12, fontStyle: 'italic' }}>Đang tải dữ liệu khu vực...</div>
                )}
                {dashboard.phongs.map((phong, pi) => {
                  const pPct = phong.kh ? (phong.afyp / phong.kh * 100) : 0;
                  const pCp = Math.min(pPct, 100);
                  return (
                    <div key={pi}>
                      {/* Main indicator card */}
                      <div className="mobile-phong-main-card">
                        <div className="mobile-phong-main-head">
                          <span className="mobile-phong-main-name"><Clipboard size={12} style={{ color: '#fff8' }} />{phong.ten}</span>
                          {!phong.noAds && <span className="mobile-phong-main-pct"><AnimPct value={pPct} /></span>}
                        </div>
                        <div className="mobile-phong-main-body">
                          <div className="mobile-phong-main-afyp">{formatKpiCurrency(phong.afyp)}</div>
                          {!phong.noAds && <>
                            <div className="mobile-phong-main-kh">KH: {formatKpiCurrency(phong.kh)}</div>
                            <div className="mobile-phong-main-prog"><div className="mobile-phong-main-prog-fill" style={{ width: `${pCp}%` }} /></div>
                          </>}
                        </div>
                      </div>
                      {/* Sub-indicator grid */}
                      <div className="mobile-phong-sub-grid" style={{ marginTop: 5 }}>
                        <div className="mobile-phong-sub hd">
                          <div className="mobile-phong-sub-head">
                            <div className="mobile-phong-sub-label">Lượt HĐ</div>
                          </div>
                          <div className="mobile-phong-sub-body">
                            <div className="mobile-phong-sub-val"><AnimNum value={phong.lhd} /></div>
                          </div>
                        </div>
                        <div className="mobile-phong-sub td">
                          <div className="mobile-phong-sub-head">
                            <div className="mobile-phong-sub-label">TD</div>
                          </div>
                          <div className="mobile-phong-sub-body">
                            <div className="mobile-phong-sub-val"><AnimNum value={phong.td} /></div>
                          </div>
                        </div>
                        <div className="mobile-phong-sub chuan">
                          <div className="mobile-phong-sub-head">
                            <div className="mobile-phong-sub-label">HĐ Chuẩn</div>
                          </div>
                          <div className="mobile-phong-sub-body">
                            <div className="mobile-phong-sub-val"><AnimNum value={phong.hdChuan} /></div>
                          </div>
                        </div>
                        {!phong.noAds && <div className="mobile-phong-sub ip">
                          <div className="mobile-phong-sub-head">
                            <div className="mobile-phong-sub-label">IP/AFYP</div>
                          </div>
                          <div className="mobile-phong-sub-body">
                            <div className="mobile-phong-sub-val">{phong.tyTrong.toFixed(1)}%</div>
                          </div>
                        </div>}
                      </div>
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
                  <div className="section-divider">Chi tiết các phòng</div>
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
                          {/* Mobile Phong Card */}
                          <div className={`kpi-card kpi-phong ${phong.noAds ? 'banca ' : ''}anim-in${glowCls(pPct)}`} style={{ animationDelay: `${pi * 60}ms` }}>
                            <div className="phong-inner">
                              <div className="phong-head">
                                <span className="phong-name"><Clipboard size={15} style={{ color: '#ffcf8a' }} />Tổng hợp {phong.ten}</span>
                                {!phong.noAds && <span className="phong-pct"><AnimPct value={pPct} /></span>}
                              </div>
                              <div className="phong-body">
                                <div className="afyp-kh-row">
                                  <span className="afyp-big"><AnimNum value={phong.afyp} /></span>
                                  {!phong.noAds && <span className="kh-small">/ KH: {fmt(phong.kh)}</span>}
                                </div>
                                {!phong.noAds && <div className="phong-progress"><div className="phong-progress-fill" style={{ width: `${pCp}%` }} /></div>}
                              </div>
                              <div className="phong-stats">
                                <div className="phong-stat hd"><div className="phong-stat-label">Lượt HĐ</div><div className="phong-stat-val"><AnimNum value={phong.lhd} /></div></div>
                                <div className="phong-stat td"><div className="phong-stat-label">TD</div><div className="phong-stat-val"><AnimNum value={phong.td} /></div></div>
                                <div className="phong-stat chuan"><div className="phong-stat-label">Lượt chuẩn</div><div className="phong-stat-val"><AnimNum value={phong.hdChuan} /></div></div>
                                {!phong.noAds && <div className="phong-stat ip"><div className="phong-stat-label">IP/AFYP</div><div className="phong-stat-val">{fmtTyTrong(phong.tyTrong)}</div></div>}
                              </div>
                            </div>
                          </div>

                          {/* Desktop Phong Card */}
                          <div className={`kpi-ad is-phong ${phong.noAds ? 'banca ' : ''}anim-in${glowCls(pPct)}`} style={{ animationDelay: `${pi * 60}ms` }}>
                            <div className="ad-inner">
                              <div className="ad-top">
                                <div className="ad-left">
                                  <div className="ad-name-row"><span className="ad-name"><Clipboard size={14} style={{ color: '#3a8ad4', marginRight: 4 }} />{phong.ten}</span><span className="ad-pct">{!phong.noAds ? `${pPct.toFixed(0)}%` : ''}</span></div>
                                  {!phong.noAds && <span className="ad-kh">KH: {fmt(phong.kh)}trđ</span>}
                                </div>
                                <div className="ad-right">
                                  <div className="ad-stats">
                                    <div className="ad-stat afyp"><span className="ad-stat-label">AFYP</span><span className="ad-stat-val"><span className="ad-stat-val-main"><AnimNum value={afypTrd} /></span><span className="ad-stat-unit">trđ</span></span></div>
                                    {!phong.noAds && <div className="ad-stat kh"><span className="ad-stat-label">KH</span><span className="ad-stat-val"><span className="ad-stat-val-main"><AnimNum value={khTrd} /></span><span className="ad-stat-unit">trđ</span></span></div>}
                                    <div className="ad-stat lhd"><span className="ad-stat-label">Lượt HĐ</span><span className="ad-stat-val"><AnimNum value={phong.lhd} /></span></div>
                                    {!phong.noAds && <div className="ad-stat td"><span className="ad-stat-label">TD</span><span className="ad-stat-val"><AnimNum value={phong.td} /></span></div>}
                                    <div className="ad-stat chuan"><span className="ad-stat-label">Chuẩn</span><span className="ad-stat-val"><AnimNum value={phong.hdChuan} /></span></div>
                                    {!phong.noAds && <div className="ad-stat ip"><span className="ad-stat-label">IP/AFYP</span><span className="ad-stat-val">{fmtTyTrong(phong.tyTrong)}</span></div>}
                                  </div>
                                  {!phong.noAds && <div className="ad-progress"><div className="ad-progress-fill" style={{ width: `${pCp}%`, background: `linear-gradient(90deg,${progStart},${progEnd})` }} /></div>}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* AD Cards (Mobile) */}
                          {!phong.noAds && (
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
                                          <div className="ad-name-row"><span className="ad-name">{ad.ten}</span><span className="ad-pct">{aPct.toFixed(0)}%</span></div>
                                          <span className="ad-kh">KH: {fmt(ad.kh)}trđ</span>
                                        </div>
                                        <div className="ad-right">
                                          <div className="ad-stats">
                                            <div className="ad-stat afyp"><span className="ad-stat-label">AFYP</span><span className="ad-stat-val">{fmt(ad.afyp)}<span className="ad-stat-unit">đ</span></span></div>
                                            <div className="ad-stat lhd"><span className="ad-stat-label">Lượt HĐ</span><span className="ad-stat-val"><AnimNum value={ad.lhd} /></span></div>
                                            <div className="ad-stat td"><span className="ad-stat-label">TD</span><span className="ad-stat-val"><AnimNum value={ad.td} /></span></div>
                                            <div className="ad-stat chuan"><span className="ad-stat-label">L.Chuẩn</span><span className="ad-stat-val"><AnimNum value={ad.hdChuan} /></span></div>
                                            <div className="ad-stat ip"><span className="ad-stat-label">IP/AFYP</span><span className="ad-stat-val">{fmtTyTrong(ad.tyTrong)}</span></div>
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

                          {/* AD Table (Desktop) */}
                          {!phong.noAds && (
                            <div className="dsk-ad-wrap">
                              <table className="dsk-ad-table">
                                <thead><tr><th>AD</th><th>% KH</th><th>AFYP</th><th>KH</th><th>HĐ</th><th>TD</th><th>Chuẩn</th><th>IP</th><th></th></tr></thead>
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
                                        <td><span className={`dsk-ad-pct ${aPctCls}`}>{aPct.toFixed(0)}%</span></td>
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
              <button className="btn-back-u" onClick={() => setView('main')} aria-label="Quay lại"><ArrowLeft size={18} /></button>
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

            {/* Group List - Hierarchical by Phong > AD > BanNhom */}
            <div className="detail-list-wrap">
              {detailData.length === 0 && <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', fontSize: 13 }}>Chưa có dữ liệu nhóm</div>}
              {(() => {
                // Group detailData by Phong, then by AD
                const byPhong = new Map<string, GroupDetail[]>();
                detailData.forEach(item => {
                  const key = item.maPhong;
                  if (!byPhong.has(key)) byPhong.set(key, []);
                  byPhong.get(key)!.push(item);
                });
                let idx = 0;
                return Array.from(byPhong.entries()).map(([maPhong, items]) => {
                  const phongName = items[0]?.tenPhong || maPhong;
                  const byAD = new Map<string, GroupDetail[]>();
                  items.forEach(item => {
                    const key = item.maAD;
                    if (!byAD.has(key)) byAD.set(key, []);
                    byAD.get(key)!.push(item);
                  });
                  return (
                    <div className="dt-phong" key={maPhong}>
                      <div className="dt-phong-head">{phongName}</div>
                      {Array.from(byAD.entries()).map(([maAD, adItems]) => {
                        const adName = adItems[0]?.tenAD || maAD;
                        return (
                          <div className="dt-ad" key={maAD}>
                            <div className="dt-ad-head">{adName}</div>
                            {adItems.map(item => {
                              const fill = Math.min(item.pct, 100);
                              const pc = item.pct >= 90 ? '#7de8c8' : item.pct >= 70 ? '#8fd0ff' : '#7a9bbf';
                              idx++;
                              return (
                                <div className="dt-bn" key={item.maBanNhom}>
                                  <div className={`grp-item ${idx <= 3 ? 'is-top' : ''}`} style={{ animationDelay: `${idx * 30}ms` }}>
                                    <div className="grp-fill" style={{ width: `${fill}%` }} />
                                    <div className="grp-top-row">
                                      <span className="grp-name">{item.name}</span>
                                      <span className="grp-pct" style={{ color: pc }}><AnimPct value={item.pct} dec={1} /></span>
                                    </div>
                                    {item.tnName && (
                                      <div className="grp-tn-name">TN: {item.tnName}</div>
                                    )}
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
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </section>

        {/* ===== CALENDAR VIEW ===== */}
        <section className={`view ${view === 'calendar' ? 'active' : ''}`} id="view-calendar" role="region">
          <div className="sub-header">
            <button className="btn-back-u" onClick={() => setView('main')} aria-label="Quay lại"><ArrowLeft size={18} /></button>
            <span className="sub-title">Kế Hoạch Khung</span>
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
              <span>Loại</span>
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
                        ? row.events.map((e, ei) => <span className="cal-line" key={ei}>{e.title}</span>)
                        : <span className="cal-empty" />}
                    </div>
                    <div className="cal-owner">
                      {row.events.map((e, ei) => <span className="cal-line" key={ei} style={{ color: e.color }}>{e.color}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
