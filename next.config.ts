import type { NextConfig } from "next";

// No dev badge: the demo runs live at the table and the badge covers the Plan bar.
const nextConfig: NextConfig = {
  devIndicators: false,
  // The cart moved to /list in the Figma redesign.
  redirects: async () => [{ source: "/cart", destination: "/list", permanent: false }],
};

export default nextConfig;
