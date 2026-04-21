import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // LinkedIn allows images up to 10 MB; give multipart some headroom.
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
