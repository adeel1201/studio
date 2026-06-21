import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { RootErrorBoundary } from '@/components/RootErrorBoundary';
import Script from 'next/script';
import React from 'react';

export const viewport: Viewport = {
  themeColor: '#6A0DAD',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Zynqo | Messaging & Social',
  description: 'Premium social networking platform.',
  manifest: '/manifest.json',
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
      </head>
      <body className="font-body antialiased bg-background text-foreground selection:bg-primary/30 min-h-screen">
        <RootErrorBoundary>
          <FirebaseClientProvider>
            <AuthProvider>
              <div className="flex flex-col min-h-screen max-w-md mx-auto relative bg-background shadow-2xl overflow-hidden">
                {children}
              </div>
              <Toaster />
            </AuthProvider>
          </FirebaseClientProvider>
        </RootErrorBoundary>
        <Script id="register-pwa-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(console.error);
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
