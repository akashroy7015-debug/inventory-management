import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Marketplace order reports can be a few MB.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
