import './globals.css'
import RefreshOnResume from './components/RefreshOnResume'

export const metadata={
  title:'NFL Squads',
  description:'NFL Squads private league',
  manifest:'/manifest.webmanifest',
  appleWebApp:{
    capable:true,
    title:'NFL Squads',
    statusBarStyle:'default'
  }
}

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><RefreshOnResume/>{children}</body></html>
}
