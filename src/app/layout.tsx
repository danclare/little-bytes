import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./components.css";

export const metadata: Metadata = {
  title: "Little Bites — Baby Weaning",
  description: "A calm place to explore first foods, keep a food diary and plan family meals.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f4ed",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
