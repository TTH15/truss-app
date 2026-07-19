import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@truss/core",
    "@platform/utils",
    "@platform/supabase-client",
    "@platform/ui",
  ],
};

export default nextConfig;
