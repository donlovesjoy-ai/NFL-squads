import './globals.css'

export const metadata = {
  title: 'NBA Squads',
  description: 'NBA Squads private league',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'NBA Squads',
    statusBarStyle: 'default'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
