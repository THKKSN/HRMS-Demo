import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// อ่าน request config จาก ./i18n/request.ts (ตำแหน่งเริ่มต้นของ next-intl)
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'jazlynn-prototrophic-cheryle.ngrok-free.dev',
    '*.ngrok-free.app',
    '*.ngrok.io',
    '*.loca.lt',
  ],
  // @hrms/i18n เป็น workspace package ที่ชี้ .ts ตรง ๆ (ไม่ได้ build) ต้องให้ Next transpile เอง
  transpilePackages: ['@hrms/i18n'],
};

export default withNextIntl(nextConfig);
