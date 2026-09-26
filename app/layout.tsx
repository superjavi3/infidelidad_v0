import type { Metadata } from "next";
import "./globals.css";

// Solo lo usan las páginas de Next (los links antiguos /a/[id]); la web es public/index.html
export const metadata: Metadata = {
  title: "YaLoSabía",
  description: "El diario de su relación, escrito con su chat de WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-MX">
      <body className="antialiased">{children}</body>
    </html>
  );
}
