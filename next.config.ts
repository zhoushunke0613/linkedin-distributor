import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // LinkedIn allows images up to 10 MB; give multipart some headroom.
      bodySizeLimit: "15mb",
    },
  },
  // Ensure skill markdown files are included in the Vercel function bundle
  // so runtime readdirSync + readFileSync works on the serverless function.
  outputFileTracingIncludes: {
    "/experiments/**": ["./src/skills/**/*.md"],
    "/api/**": ["./src/skills/**/*.md"],
  },
};

export default nextConfig;
