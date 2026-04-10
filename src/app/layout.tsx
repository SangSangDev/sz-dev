import type { Metadata } from 'next';
import './globals.css';
import { MobileNav } from '@/components/layout/MobileNav';
import { ToastContainer } from '@/components/ui/ToastContainer';

export const metadata: Metadata = {
  title: 'Teams Board App',
  description: 'Mobile compatible teams-like board application',
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
          <MobileNav />
        </main>
        <ToastContainer />
      </body>
    </html>
  );
}
