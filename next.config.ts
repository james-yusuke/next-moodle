import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
    viewTransition: true,
  },
};

export default nextConfig;
