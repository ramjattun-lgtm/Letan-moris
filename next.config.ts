import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Uses the fetch-based caching model (fetch `next.revalidate`) for provider responses.
  cacheComponents: false,
  poweredByHeader: false,
  // Fonts used to draw the Facebook share cards.
  outputFileTracingIncludes: {
    "/api/social/card": ["./assets/fonts/**"],
    "/api/social/run": ["./assets/fonts/**"],
    "/api/social/approve": ["./assets/fonts/**"],
  },
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
