import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Uses the fetch-based caching model (fetch `next.revalidate`) for provider responses.
  cacheComponents: false,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
