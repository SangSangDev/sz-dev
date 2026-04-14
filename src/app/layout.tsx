import type { Metadata } from 'next';
import './globals.css';
import { ToastContainer } from '@/components/ui/ToastContainer';

export const metadata: Metadata = {
  title: 'SZ WORKS',
  description: 'SZ WORKS',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SZ WORKS',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="app-container">
          {children}
        </main>
        <ToastContainer />
      </body>
    </html>
  );
}
