const path = require("path");

const isDev = process.env.NODE_ENV !== "production";
const DEV_BACKEND = "http://localhost:5001";

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  images: {
    domains: ["res.cloudinary.com"],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // In development, proxy /api/* to the local Express server on port 5001.
  // In production (Vercel), /api/* is handled by the Vercel serverless function
  // in api/index.js — no rewrite needed.
  ...(isDev && {
    async rewrites() {
      return [
        {
          source: "/api/:path*",
          destination: `${DEV_BACKEND}/api/:path*`,
        },
      ];
    },
  }),
};

module.exports = nextConfig;
