"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MessageSquareText } from 'lucide-react';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, password }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to login');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper bg-background">
      <div className="login-box">
        <div className="flex items-center justify-center mb-4" style={{ width: '3rem', height: '3rem', backgroundColor: 'var(--primary)', borderRadius: '0.75rem' }}>
          <MessageSquareText color="white" size={24} />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center">Welcome to Board</h1>
        <p className="text-muted text-sm mb-8 text-center">Sign in with your account</p>

        <form onSubmit={handleLogin} className="w-full flex-col gap-4">
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Username"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-center mb-4" style={{color: 'var(--danger)', fontSize: '0.875rem'}}>{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
}
