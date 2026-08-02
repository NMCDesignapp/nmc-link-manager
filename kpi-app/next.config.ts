import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

const MAIN_APP_ORIGIN = (
  process.env.MAIN_APP_ORIGIN || "https://nc-link.vercel.app"
).replace(/\/+$/, "");

/**
 * The standalone page is regenerated from Main App during `prebuild`.
 * Patch the shared loading dependency after that sync so both builds recover
 * from the same AppDataContext loading transition.
 */
function patchKpiLoadingDependency() {
  const relativePagePath = "src/app/page.tsx";
  const pagePath = path.join(process.cwd(), relativePagePath);
  if (!fs.existsSync(pagePath)) return;

  const source = fs.readFileSync(pagePath, "utf8");
  const fixedDependencies =
    "      nguoiTuyenNgang,\n      appDataLoading,\n      standalone,\n    ]);";

  if (source.includes(fixedDependencies)) return;

  const oldDependencies =
    "      nguoiTuyenNgang,\n      standalone,\n    ]);";

  if (!source.includes(oldDependencies)) {
    console.warn(`[KPI] Không tìm thấy dependency block cần vá trong ${relativePagePath}`);
    return;
  }

  fs.writeFileSync(
    pagePath,
    source.replace(oldDependencies, fixedDependencies),
    "utf8",
  );
  console.log(`[KPI] Đã thêm appDataLoading dependency cho ${relativePagePath}`);
}

patchKpiLoadingDependency();

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["@prisma/client", "@neondatabase/serverless"],
  // Fix: Turbopack không infer đúng workspace root khi có 2 lockfiles
  // (kpi-app/package-lock.json + parent package-lock.json)
  turbopack: {
    root: __dirname,
  },
  /**
   * KPI standalone is display-only. All API traffic is proxied to Main App,
   * which is the single source of truth for edits and database access.
   * `beforeFiles` deliberately takes precedence over copied local API routes.
   */
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${MAIN_APP_ORIGIN}/api/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
