import type { Metadata } from "next";
import "./globals.css";
import { MuiProvider } from "@/components/mui-provider";
import { Toasts } from "@/components/toast";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "EarthRe | SLA Monitor",
  description: "A dependable, auditable view of cleaned SLA monitoring checks.",
  openGraph: {
    title: "EarthRe | SLA Monitor",
    description: "Tech-first reinsurance for the Global South — intelligent capital deployment with precision underwriting from IFSC, GIFT City, India.",
    type: "website",
    images: [{ url: "https://earthre.in/og-image.png", width: 1200, height: 630, alt: "EarthRe" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EarthRe | SLA Monitor",
    description: "Tech-first reinsurance for the Global South — intelligent capital deployment with precision underwriting from IFSC, GIFT City, India.",
    images: ["https://earthre.in/og-image.png"],
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "https://earthre.in/icon.svg?b7b89dab7de36ac3",
    shortcut: "https://earthre.in/icon.svg?b7b89dab7de36ac3",
    apple: "https://earthre.in/apple-icon.png?8eec7a43e4a2aa95",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><MuiProvider>{children}<Toasts /></MuiProvider></body>
    </html>
  );
}
