import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "The League",
  description: "Fall 2026 UVA student pickleball league registration and member portal.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
    shortcut: "/logo.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
