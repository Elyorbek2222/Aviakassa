import type { NextConfig } from "next";

// Butun sayt uchun xavfsizlik sarlavhalari.
// - X-Frame-Options / frame-ancestors: clickjacking'ni bloklaydi (sayt boshqa
//   saytning iframe'iga joylanib, foydalanuvchi bilmay tugma bosishi oldini oladi).
// - X-Content-Type-Options: MIME-sniffing (fayl turini xato taxmin qilish) oldini oladi.
// - Referrer-Policy: tashqi saytga to'liq URL (ichki yo'llar) sizib chiqmasin.
// - Permissions-Policy: kamera/mikrofon/joylashuv API'lariga ruxsat berilmaydi.
// - HSTS: brauzer saytga faqat HTTPS orqali ulanadi (SSL-strip hujumi oldini oladi).
// ponytail: to'liq Content-Security-Policy qo'shilmadi — ilova ko'p inline style
//   ishlatadi, noto'g'ri CSP sahifani buzadi. Kerak bo'lsa nonce bilan alohida qo'shiladi.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Barcha sahifa va endpoint'larga xavfsizlik sarlavhalari.
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Service worker doim yangi bo'lsin (eski deploy keshda qotib qolmasin)
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
