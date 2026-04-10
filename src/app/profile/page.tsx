"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

type ProfileUser = {
  user_id: string;
  user_name: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) { router.push('/login'); return null; }
        return res.json();
      })
      .then(data => {
        if (data?.user) setUser(data.user);
        setLoading(false);
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) return <div className="p-6 text-center text-muted">Loading...</div>;

  return (
    <div className="flex flex-col min-h-screen bottom-padding">
      <header className="header">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-muted" style={{ padding: '0.25rem' }}>
            <ChevronLeft size={24} />
          </Link>
          <h1 className="text-lg font-bold">프로필</h1>
        </div>
      </header>

      <div className="p-6 flex flex-col gap-4">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-3 py-6">
          <div style={{
            width: '5rem',
            height: '5rem',
            borderRadius: '50%',
            backgroundColor: 'var(--primary)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 700,
          }}>
            {user?.user_name?.charAt(0) || <User size={32} />}
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{user?.user_name}</div>
            <div className="text-muted text-sm">@{user?.user_id}</div>
          </div>
        </div>

        {/* Info Card */}
        <div className="card flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-muted text-sm">아이디</span>
            <span className="font-semibold text-sm">{user?.user_id}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--border-color)' }} />
          <div className="flex justify-between items-center">
            <span className="text-muted text-sm">이름</span>
            <span className="font-semibold text-sm">{user?.user_name}</span>
          </div>
        </div>

        {/* Logout */}
        <div className="mt-4">
          <Button
            variant="danger"
            className="w-full"
            onClick={handleLogout}
            style={{ gap: '0.5rem' }}
          >
            <LogOut size={18} />
            로그아웃
          </Button>
        </div>
      </div>
    </div>
  );
}
