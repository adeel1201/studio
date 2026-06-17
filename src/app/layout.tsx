import type {Metadata, Viewport} from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import Script from 'next/script';

export const viewport: Viewport = {
  themeColor: '#6A0DAD',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Zynqo | Connect, Chat, Share, Discover',
  description: 'Premium modern messaging and social networking platform.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zynqo',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon-192.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#6A0DAD" />
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
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(registration) {
                  console.log('Zynqo PWA: ServiceWorker registration successful');
                }).catch(function(err) {
                  console.log('Zynqo PWA: ServiceWorker registration failed: ', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}