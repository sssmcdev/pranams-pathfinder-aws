import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Legacy Python app still lives in backend/ and frontend/ during the port.
  // Nothing in them is imported by the Next app; excluded in tsconfig.json.
};

export default nextConfig;
