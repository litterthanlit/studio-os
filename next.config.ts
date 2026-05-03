import type { NextConfig } from "next";

const distDir = process.env.NEXT_DIST_DIR?.trim();

const nextConfig: NextConfig = {
  distDir: distDir || ".next",
  // @react-pdf/renderer requires transpilation in Next.js App Router
  transpilePackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "*.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.cloudfront.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.are.na",
        pathname: "/**",
      },
      // Pinterest CDN
      {
        protocol: "https",
        hostname: "i.pinimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.pinimg.com",
        pathname: "/**",
      },
      // Pinterest board thumbnails
      {
        protocol: "https",
        hostname: "s.pinimg.com",
        pathname: "/**",
      },
      // Lummi AI stock images
      {
        protocol: "https",
        hostname: "*.lummi.ai",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.lummi.ai",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
