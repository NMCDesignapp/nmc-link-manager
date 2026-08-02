import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

/**
 * KPI reads AppDataContext asynchronously. The dashboard effect previously
 * returned while app data was loading, but `appDataLoading` was missing from
 * its dependency list, so it could remain on the empty shell forever.
 *
 * Keep this build-time patch idempotent until the large shared KPI page is
 * split into smaller modules. It also makes local `next dev` builds safe.
 */
function patchKpiLoadingDependency(relativePagePath: string) {
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

patchKpiLoadingDependency("src/app/kpi/page.tsx");

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["ws", "xlsx"],
  allowedDevOrigins: [
    "http://127.0.0.1:3099",
    "http://localhost:3099",
    "http://0.0.0.0:3099",
    "http://21.0.4.40:3099",
    "http://21.0.13.29:3000",
    "http://localhost:3000",
  ],
};

export default nextConfig;
