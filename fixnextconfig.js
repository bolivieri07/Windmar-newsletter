const fs = require("fs");
const content = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "assets.cdn.filesafe.space",
      },
    ],
  },
};

export default nextConfig;
`;
fs.writeFileSync("next.config.ts", content, "utf8");
console.log("done - next.config.ts updated");
