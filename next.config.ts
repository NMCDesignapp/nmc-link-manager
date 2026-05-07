import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    "http://127.0.0.1:3099",
    "http://localhost:3099",
    "http://0.0.0.0:3099",
    "http://21.0.4.40:3099",
  ],
};

export default nextConfig;
