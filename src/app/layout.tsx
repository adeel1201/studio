import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'Zynqo | Connect, Chat, Share, Discover',
  description: 'Premium modern messaging and social networking platform.',
  manifest: '/manifest.json',
  themeColor: '#7B5AFF',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zynqo',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="https://picsum.photos/seed/zynqo/32/32" />
        <link rel="apple-touch-icon" href="https://picsum.photos/seed/zynqo/180/180" />
      </head>
      <body className="font-body antialiased bg-background text-foreground selection:bg-primary/30 min-h-screen">
        <FirebaseClientProvider>
          <AuthProvider>
            <div className="flex flex-col min-h-screen max-w-md mx-auto relative bg-background shadow-2xl overflow-hidden">
              {children}
            </div>
            <Toaster />
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
