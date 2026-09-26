import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La web entera es public/index.html: se sirve en «/» directamente (antes era un 307 a /index.html,
  // un salto más en cada visita desde un anuncio y el canonical apuntaba a una redirección).
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/index.html" }], afterFiles: [], fallback: [] };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Imágenes que casi nunca cambian: 1 día en caché y se revalidan en segundo plano
        source: "/:file(og-image.jpg|favicon.svg|favicon.ico|favicon-16.png|favicon-32.png|apple-touch-icon.png|legal.css)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/diario/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
