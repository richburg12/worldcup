import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wecanjustmakeshitnow.com"),
  title: "We can just make shit now",
  description: "Tools and toys Richard builds. Some for fun, some for work.",
  openGraph: {
    title: "We can just make shit now",
    description: "Tools and toys Richard builds. Some for fun, some for work.",
    url: "https://wecanjustmakeshitnow.com",
    siteName: "We can just make shit now",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "We can just make shit now",
    description: "Tools and toys Richard builds. Some for fun, some for work.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
