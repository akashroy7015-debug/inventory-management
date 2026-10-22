import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    // The service worker must be re-checked on every load so fixes reach installed apps quickly.
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] }];
  },
  experimental: {
    // Marketplace order reports can be a few MB.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
