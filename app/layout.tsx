import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { initDatabase } from "@/lib/db"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "App Review Scraper",
  description: "Monitor and analyze app reviews from App Store and Google Play Store",
    generator: 'v0.dev'
}

// 初始化数据库，但不阻塞渲染
initDatabase().catch((error) => {
  console.error("Failed to initialize database:", error)
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}



import './globals.css'