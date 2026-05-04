import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Set only for static zip → cPanel `public_html`. Default build uses `.next` + `next start` on Node.
  ...(process.env.STATIC_EXPORT === "1" ? { output: "export" as const } : {})
};

export default nextConfig;
