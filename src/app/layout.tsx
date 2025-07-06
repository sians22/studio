import type {Metadata} from 'next';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import {AuthProvider} from '@/context/auth-context';
import {OrderProvider} from '@/context/order-context';
import {ThemeProvider} from '@/context/theme-context';
import { PricingProvider } from '@/context/pricing-context';

export const metadata: Metadata = {
  title: 'Быстрый Курьер',
  description: 'Быстрый Курьер - Ваш быстрый и надежный партнер по доставке.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Grand+Hotel&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider>
          <AuthProvider>
            <PricingProvider>
              <OrderProvider>
                {children}
                <Toaster />
              </OrderProvider>
            </PricingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
