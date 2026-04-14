import { MobileNav } from '@/components/layout/MobileNav';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <MobileNav />
    </>
  );
}
