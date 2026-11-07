import type { NextConfig } from "next";

// No dev badge: the demo runs live at the table and the badge covers the Plan bar.
const nextConfig: NextConfig = { devIndicators: false };

export default nextConfig;
