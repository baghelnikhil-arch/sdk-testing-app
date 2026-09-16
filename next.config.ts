import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Google Sheets logo on the integrations card.
        protocol: "https",
        hostname: "stuff.thingsofbrand.com",
      },
      {
        // Product images imported from the operator's spreadsheet can point
        // anywhere, so any https host is allowed. Narrow this to your own CDN
        // if you control where catalogue images are hosted.
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
