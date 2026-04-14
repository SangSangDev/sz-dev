"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, ChevronLeft, Key } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RollupPopup } from '@/components/ui/RollupPopup';
import { showToast } from '@/lib/toast';

type ProfileUser = {
  user_id: string;
  email?: string;
  user_name: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Password Change State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

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

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('모든 항목을 입력해주세요.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('새 비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '비밀번호 변경 실패');

      showToast('비밀번호가 성공적으로 변경되었습니다.', 'success');
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setChangingPassword(false);
    }
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
            <div className="text-muted text-sm">{user?.email || `@${user?.user_id}`}</div>
          </div>
        </div>

        {/* Info Card */}
        <div className="card flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-muted text-sm">이메일</span>
            <span className="font-semibold text-sm">{user?.email || user?.user_id}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--border-color)' }} />
          <div className="flex justify-between items-center">
            <span className="text-muted text-sm">이름</span>
            <span className="font-semibold text-sm">{user?.user_name}</span>
          </div>
        </div>

        {/* Logout */}
        <div className="mt-4 flex flex-col gap-3">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setIsPasswordModalOpen(true)}
            style={{ gap: '0.5rem', border: '1px solid var(--border-color)' }}
          >
            <Key size={18} />
            비밀번호 변경
          </Button>
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

      <RollupPopup isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1 items-center mb-2">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2 text-primary">
              <Key size={24} />
            </div>
            <h3 className="font-bold text-lg">비밀번호 변경</h3>
            <p className="text-sm text-muted text-center">안전한 로그인을 위해 비밀번호를 변경합니다.</p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">현재 비밀번호</label>
              <Input
                type="password"
                placeholder="현재 비밀번호를 입력하세요"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">새 비밀번호</label>
              <Input
                type="password"
                placeholder="새로운 비밀번호를 입력하세요"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold">새 비밀번호 확인</label>
              <Input
                type="password"
                placeholder="새로운 비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 w-full mt-2">
            <Button
              variant="ghost"
              className="flex-1 border"
              onClick={() => setIsPasswordModalOpen(false)}
            >
              취소
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? '변경 중...' : '변경하기'}
            </Button>
          </div>
        </div>
      </RollupPopup>
    </div>
  );
}
