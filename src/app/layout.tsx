import type {Metadata} from 'next';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import {AuthProvider} from '@/context/auth-context';
import {OrderProvider} from '@/context/order-context';

export const metadata: Metadata = {
  title: 'Hızlı Kurye',
  description: 'Hızlı Kurye - Your fast and reliable delivery partner.',
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <OrderProvider>
            {children}
            <Toaster />
          </OrderProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
