import type { NextConfig } from "next";

// 로그인 기반의 실시간 서비스라 Cache Components 없이 동적 렌더링을 쓴다.
const nextConfig: NextConfig = {
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
