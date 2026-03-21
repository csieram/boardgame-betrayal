import './globals.css'

export const metadata = {
  title: 'Betrayal at House on the Hill',
  description: '山中小屋的背叛',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-gray-900 text-white">{children}</body>
    </html>
  )
}
