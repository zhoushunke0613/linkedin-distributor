import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // LinkedIn allows images up to 10 MB; give multipart some headroom.
      bodySizeLimit: "15mb",
    },
  },
  // Ensure nested skill folders + SKILL.md files are included in the Vercel
  // function bundle so runtime readdirSync + readFileSync works on serverless.
  outputFileTracingIncludes: {
    "/experiments/**": ["./src/skills/**/SKILL.md", "./src/skills/**/*.md"],
    "/api/**": ["./src/skills/**/SKILL.md", "./src/skills/**/*.md"],
  },
};

export default nextConfig;
