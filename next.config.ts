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

  let source = fs.readFileSync(pagePath, "utf8");

  const currentFixed =
    "appData.leaders, appDataReloading, appDataLoading, dataVersion]);";
  const currentBuggy =
    "appData.leaders, appDataReloading, dataVersion]);";

  if (source.includes(currentFixed)) return;

  if (source.includes(currentBuggy)) {
    source = source.replace(currentBuggy, currentFixed);
    fs.writeFileSync(pagePath, source, "utf8");
    console.log(`[KPI] Đã thêm appDataLoading dependency cho ${relativePagePath}`);
    return;
  }

  // Compatibility with the older KPI data shape kept in some recovery refs.
  const legacyFixed =
    "      nguoiTuyenNgang,\n      appDataLoading,\n      standalone,\n    ]);";
  const legacyBuggy =
    "      nguoiTuyenNgang,\n      standalone,\n    ]);";

  if (source.includes(legacyFixed)) return;
  if (source.includes(legacyBuggy)) {
    fs.writeFileSync(
      pagePath,
      source.replace(legacyBuggy, legacyFixed),
      "utf8",
    );
    console.log(`[KPI] Đã thêm appDataLoading dependency cho ${relativePagePath}`);
    return;
  }

  console.warn(`[KPI] Không tìm thấy dependency block cần vá trong ${relativePagePath}`);
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
