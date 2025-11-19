import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { RegisterServiceWorker } from "./register-sw"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: {
    default: "Scalper Propfirm - Professional Trading Account Manager",
    template: "%s | Scalper Propfirm",
  },
  description:
    "Professional prop firm trading account management platform. Track PnL, manage withdrawals, monitor trading cycles for TopStep and TakeProfitTrader accounts. Optimize your funded trading performance.",
  keywords: [
    "prop firm",
    "propfirm",
    "trading",
    "scalping",
    "TopStep",
    "TakeProfitTrader",
    "funded account",
    "trading tracker",
    "PnL tracker",
    "withdrawal management",
    "day trading",
    "futures trading",
  ],
  authors: [{ name: "Scalper Propfirm" }],
  creator: "Scalper Propfirm",
  publisher: "Scalper Propfirm",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icon.svg", sizes: "180x180", type: "image/svg+xml" }],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://scalper-propfirm.com",
    siteName: "Scalper Propfirm",
    title: "Scalper Propfirm - Professional Trading Account Manager",
    description:
      "Professional prop firm trading account management platform. Track your funded accounts, PnL, and withdrawals with ease.",
    images: [
      {
        url: "/icon.svg",
        width: 1200,
        height: 630,
        alt: "Scalper Propfirm Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scalper Propfirm - Professional Trading Account Manager",
    description:
      "Professional prop firm trading account management platform. Track your funded accounts, PnL, and withdrawals with ease.",
    images: ["/icon.svg"],
  },
  verification: {
    // Ajouter vos codes de vérification Google/Bing ici
    // google: "votre-code-google",
    // yandex: "votre-code-yandex",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <RegisterServiceWorker />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
