import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Windmar Solar Academy",
  description: "We Train You. We Value You. We Promote You.",
  manifest: "/manifest.json",
  themeColor: "#1a2f6e",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
