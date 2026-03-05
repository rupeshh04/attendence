const path = require("path");

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";
// Strip trailing /api so rewrite destination path doesn't double it
const BACKEND_ORIGIN = BACKEND_URL.replace(/\/api$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  images: {
    domains: ["res.cloudinary.com"],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  async rewrites() {
    return [
      {
        // Proxy /api/:path* → Express backend at :5001/api/:path*
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
