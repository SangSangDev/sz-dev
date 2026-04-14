"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MessageSquareText, Check } from 'lucide-react';
import { showToast } from '@/lib/toast';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberId, setRememberId] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Load saved ID if exists
    const saved = localStorage.getItem('savedUserId');
    if (saved) {
      setUserId(saved);
      setRememberId(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // Handle remember ID
      if (rememberId) {
        localStorage.setItem('savedUserId', userId);
      } else {
        localStorage.removeItem('savedUserId');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-login-wrapper">
      <style dangerouslySetInnerHTML={{
        __html: `
        .modern-login-wrapper {
          flex: 1;
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--background);
          padding: 1rem;
          position: relative;
        }

        .glass-box {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 1.5rem;
          padding: 2.5rem;
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.1);
          color: var(--foreground);
        }

        .custom-input {
          background: var(--background) !important;
          border: 1px solid var(--border-color) !important;
          color: var(--foreground) !important;
          border-radius: 0.75rem !important;
          padding: 0.75rem 1rem !important;
          transition: all 0.3s ease !important;
        }
        .custom-input:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 2px rgba(91, 95, 199, 0.2) !important;
          outline: none;
        }

        .custom-button {
          background: var(--primary) !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          border-radius: 0.75rem !important;
          padding: 0.75rem !important;
          font-size: 1rem !important;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s !important;
          border: none !important;
        }
        .custom-button:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          box-shadow: 0 5px 15px -5px var(--primary) !important;
        }
        .custom-button:active:not(:disabled) {
          transform: translateY(0) !important;
        }
        
        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--text-muted);
          user-select: none;
        }
        .custom-checkbox {
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 0.375rem;
          border: 2px solid var(--border-color);
          background: var(--background);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .checkbox-container input {
          display: none;
        }
        .checkbox-container input:checked + .custom-checkbox {
          background: var(--primary);
          border-color: var(--primary);
        }
        .checkbox-container input:checked + .custom-checkbox svg {
          opacity: 1;
          transform: scale(1);
        }
        .custom-checkbox svg {
          stroke: #ffffff;
          opacity: 0;
          transform: scale(0.5);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .icon-wrapper {
          position: relative;
          width: 4rem;
          height: 4rem;
          background: var(--primary);
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem auto;
          box-shadow: 0 8px 24px -6px var(--primary);
        }
      `}} />

      <div className="glass-box">
        <div className="icon-wrapper">
          <MessageSquareText color="white" size={32} strokeWidth={1.5} />
        </div>

        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center', letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
          SZ WORKS
        </h1>
        <p style={{ textAlign: 'center', marginBottom: '2.5rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          welcome to sz works
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.7rem' }}>
          <div>
            <Input
              type="text"
              placeholder="아이디"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="custom-input"
              required
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="custom-input"
              required
            />
          </div>

          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={rememberId}
              onChange={(e) => setRememberId(e.target.checked)}
            />
            <div className="custom-checkbox">
              <Check size={14} strokeWidth={3} />
            </div>
            아이디 저장
          </label>

          <Button type="submit" className="custom-button" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? '로그인 중...' : '로그인'}
          </Button>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', textAlign: 'center', marginTop: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>아직 계정이 없으신가요? </span>
            <button type="button" onClick={() => router.push('/signup')} style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.875rem', background: 'none' }}>
              회원가입하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
