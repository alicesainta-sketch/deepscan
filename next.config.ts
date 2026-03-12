import type { NextConfig } from "next";

const parseAllowedDevOrigins = () => {
  const raw = process.env.NEXT_ALLOWED_DEV_ORIGINS?.trim();
  if (!raw) {
    return ["192.168.96.167"];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const nextConfig: NextConfig = {
  allowedDevOrigins: parseAllowedDevOrigins(),
};

export default nextConfig;
