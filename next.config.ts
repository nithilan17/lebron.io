import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // graph.json is read with fs at runtime, so explicitly keep it in API bundles.
  outputFileTracingIncludes: { "/api/*": ["./data/generated/graph.json"] }
};
export default nextConfig;
