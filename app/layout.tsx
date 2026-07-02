import type { Metadata } from "next";
import "./globals.css";
// Provided design system (Bootstrap + custom). Imported so the bundler
// fingerprints and serves them; order matters (bootstrap first).
import "@/public/assets/css/bootstrap.min.css";
import "@/public/assets/css/common.css";
import "@/public/assets/css/main.css";
import "@/public/assets/css/responsive.css";

export const metadata: Metadata = {
  title: "Buddy Script",
  description: "A social feed built for the Appifylab take-home.",
  icons: { icon: "/assets/images/logo-copy.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Fonts — matches the provided template */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
