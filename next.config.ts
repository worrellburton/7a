import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/7a",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
