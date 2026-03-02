import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@node-rs/argon2'],
  turbopack: {
    root: resolve(__dirname),
  },
};

export default nextConfig;
