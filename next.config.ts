import type { NextConfig } from "next";

const parseAllowedDevOrigins = () => {
  const raw = process.env.NEXT_ALLOWED_DEV_ORIGINS?.trim();
  if (!raw) {
    // 默认放行本地局域网调试来源，避免 Next 未来版本升级后被跨域策略拦截。
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
