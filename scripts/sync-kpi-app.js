#!/usr/bin/env node

/**
 * Đồng bộ KPI standalone từ một nguồn duy nhất: src/app/kpi trong Main App.
 *
 * Script này chạy được trong local, GitHub Actions và Vercel build image;
 * không phụ thuộc vào các tiện ích Unix như diff/rsync.
 *
 * Usage:
 *   node scripts/sync-kpi-app.js
 *   node scripts/sync-kpi-app.js --check
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const kpiApp = path.join(root, 'kpi-app');
const checkOnly = process.argv.includes('--check');
const patchScript = path.join(root, 'scripts', 'apply-standalone-patches.js');

const mainPage = path.join(root, 'src', 'app', 'kpi', 'page.tsx');
const standalonePage = path.join(kpiApp, 'src', 'app', 'page.tsx');
const shim = path.join(kpiApp, 'src', 'lib', 'app-data-context.tsx');

const apiRoutes = [
  'quan-ly/all',
  'settings',
  'calendar',
  'structure/ad',
  'structure/phong',
  'structure/bannhom',
  'structure/tvv',
  'poster-image',
  'kpi-target-registrations',
];

const components = [
  'back-button.tsx',
  'app-loader.tsx',
  'space-bg.tsx',
  'honeycomb-bg.tsx',
];

const libraries = [
  'db.ts',
  'utils.ts',
  'animations.tsx',
];

const standaloneLayout = `import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SpaceBackground } from '@/components/space-bg'
import { AppDataProvider } from '@/lib/app-data-context'

export const metadata: Metadata = {
  title: 'KPI - N.M.C',
  description: 'KPI Dashboard - Trung tam quan ly lien ket',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KPI NMC',
  },
  icons: {
    icon: [
      { url: '/icon/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" className="dark h-full">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="h-full overflow-auto honeycomb-bg">
        <SpaceBackground />
        <AppDataProvider>{children}</AppDataProvider>
      </body>
    </html>
  )
}
`;

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function ensureInputs() {
  if (!fs.existsSync(kpiApp)) fail(`Không tìm thấy thư mục ${kpiApp}`);
  if (!fs.existsSync(mainPage)) fail(`Không tìm thấy ${mainPage}`);
  if (!fs.existsSync(patchScript)) fail(`Không tìm thấy ${patchScript}`);
  if (!fs.existsSync(shim)) fail('Thiếu standalone AppDataContext shim');
}

function replacePath(source, destination) {
  if (!fs.existsSync(source)) return false;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(source, destination, { recursive: true });
  return true;
}

function digest(target) {
  if (!fs.existsSync(target)) return 'MISSING';
  const stat = fs.statSync(target);
  const hash = crypto.createHash('sha256');

  if (stat.isFile()) {
    hash.update('F\0');
    hash.update(fs.readFileSync(target));
    return hash.digest('hex');
  }

  hash.update('D\0');
  const walk = (dir, relative = '') => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const rel = path.posix.join(relative.split(path.sep).join('/'), entry.name);
      const absolute = path.join(dir, entry.name);
      hash.update(`${entry.isDirectory() ? 'D' : 'F'}:${rel}\0`);
      if (entry.isDirectory()) walk(absolute, rel);
      else hash.update(fs.readFileSync(absolute));
    }
  };
  walk(target);
  return hash.digest('hex');
}

function buildExpectedPage() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kpi-sync-'));
  const tempPage = path.join(tempDir, 'page.tsx');
  try {
    fs.copyFileSync(mainPage, tempPage);
    execFileSync(process.execPath, [patchScript, tempPage], { stdio: 'pipe' });
    return fs.readFileSync(tempPage, 'utf8');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function expectedPairs() {
  const pairs = [];

  for (const route of apiRoutes) {
    const source = path.join(root, 'src', 'app', 'api', route);
    if (fs.existsSync(source)) {
      pairs.push([source, path.join(kpiApp, 'src', 'app', 'api', route)]);
    }
  }

  for (const file of components) {
    const source = path.join(root, 'src', 'components', file);
    if (fs.existsSync(source)) {
      pairs.push([source, path.join(kpiApp, 'src', 'components', file)]);
    }
  }

  for (const file of libraries) {
    const source = path.join(root, 'src', 'lib', file);
    if (fs.existsSync(source)) {
      pairs.push([source, path.join(kpiApp, 'src', 'lib', file)]);
    }
  }

  pairs.push([
    path.join(root, 'src', 'app', 'globals.css'),
    path.join(kpiApp, 'src', 'app', 'globals.css'),
  ]);

  const publicPairs = [
    ['icon', 'icon'],
    ['kpi', 'kpi'],
    ['logo.svg', 'logo.svg'],
  ];
  for (const [sourceName, destinationName] of publicPairs) {
    const source = path.join(root, 'public', sourceName);
    if (fs.existsSync(source)) {
      pairs.push([source, path.join(kpiApp, 'public', destinationName)]);
    }
  }

  return pairs;
}

function checkSync() {
  const mismatches = [];
  const expectedPage = buildExpectedPage();
  const actualPage = fs.existsSync(standalonePage)
    ? fs.readFileSync(standalonePage, 'utf8')
    : '';

  if (expectedPage !== actualPage) mismatches.push('src/app/page.tsx');

  for (const [source, destination] of expectedPairs()) {
    if (digest(source) !== digest(destination)) {
      mismatches.push(path.relative(kpiApp, destination));
    }
  }

  const layoutPath = path.join(kpiApp, 'src', 'app', 'layout.tsx');
  const actualLayout = fs.existsSync(layoutPath)
    ? fs.readFileSync(layoutPath, 'utf8')
    : '';
  if (actualLayout !== standaloneLayout) mismatches.push('src/app/layout.tsx');

  if (mismatches.length > 0) {
    console.error('KPI standalone chưa đồng bộ:');
    for (const item of mismatches) console.error(`  - ${item}`);
    process.exit(1);
  }

  console.log('✅ KPI standalone đã đồng bộ với Main App.');
}

function writeSync() {
  console.log('=== Sync KPI standalone từ Main App ===');

  fs.mkdirSync(path.dirname(standalonePage), { recursive: true });
  fs.copyFileSync(mainPage, standalonePage);
  execFileSync(process.execPath, [patchScript, standalonePage], { stdio: 'inherit' });
  console.log('  ✓ Trang KPI');

  for (const [source, destination] of expectedPairs()) {
    replacePath(source, destination);
  }
  console.log('  ✓ API, component, thư viện và tài nguyên ảnh');

  const layoutPath = path.join(kpiApp, 'src', 'app', 'layout.tsx');
  fs.mkdirSync(path.dirname(layoutPath), { recursive: true });
  fs.writeFileSync(layoutPath, standaloneLayout, 'utf8');
  console.log('  ✓ Layout standalone');

  checkSync();
  console.log('=== Sync hoàn tất ===');
}

ensureInputs();
if (checkOnly) checkSync();
else writeSync();
