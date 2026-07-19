import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@truss/core", "@platform/utils", "@platform/supabase-client"],
};

export default nextConfig;
