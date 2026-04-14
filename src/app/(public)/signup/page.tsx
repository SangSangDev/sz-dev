"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Mail, Key, User, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showToast } from '@/lib/toast';

export default function SignupPage() {
  const router = useRouter();

  // Step 1: Email Verification
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  // Step 2: User Details
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [userName, setUserName] = useState('');
  const [registering, setRegistering] = useState(false);

  // Removed error state for toast
  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      showToast('유효한 이메일 주소를 입력해주세요.', 'error');
      return;
    }
    setSendingCode(true);

    try {
      const res = await fetch('/api/auth/register/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '인증번호 발송에 실패했습니다.');

      setIsCodeSent(true);
      showToast('인증번호가 발송되었습니다. 5분 내에 입력해 주세요.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length !== 6) {
      showToast('6자리 인증번호를 입력해주세요.', 'error');
      return;
    }
    setVerifyingCode(true);

    try {
      const res = await fetch('/api/auth/register/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '인증번호 검증에 실패했습니다.');

      setIsEmailVerified(true);
      showToast('이메일 인증이 완료되었습니다.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailVerified) return;

    if (!userId || !password || !userName) {
      showToast('모든 항목을 입력해주세요.', 'error');
      return;
    }

    if (password !== passwordConfirm) {
      showToast('비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    setRegistering(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          email,
          password,
          user_name: userName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '회원가입에 실패했습니다.');

      showToast('회원가입이 성공적으로 완료되었습니다!', 'success');
      router.push('/login');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="modern-login-wrapper">
      {/* Include the same modern login styles from the login page to keep them identical */}
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
          max-width: 440px;
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
          padding: 0.75rem 1rem;
          transition: all 0.3s ease !important;
        }
        .custom-input:focus {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 2px rgba(91, 95, 199, 0.2) !important;
          outline: none;
        }
        .custom-input:disabled {
          opacity: 0.7;
          background-color: var(--background) !important;
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
          <UserPlus color="white" size={32} strokeWidth={1.5} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center', letterSpacing: '-0.02em', color: 'var(--foreground)' }}>
          회원가입
        </h1>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          SZ WORKS에 오신 것을 환영합니다
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Step 1: Email Verification */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>이메일</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Mail size={18} style={{ color: 'var(--text-muted)', position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <Input
                  type="email"
                  placeholder="이메일 주소"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="custom-input"
                  style={{ paddingLeft: '2.75rem', width: '100%' }}
                  disabled={isEmailVerified}
                />
              </div>
              <Button onClick={handleSendCode} disabled={!email || isEmailVerified || sendingCode} className="custom-button" style={{ padding: '0.75rem 1rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {sendingCode ? '발송 중...' : isCodeSent ? '재발송' : '인증 요청'}
              </Button>
            </div>
          </div>

          {isCodeSent && !isEmailVerified && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: 'fadeIn 0.3s ease-out' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>인증번호 6자리</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Input
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="custom-input"
                  style={{ textAlign: 'center', letterSpacing: '0.25rem', fontSize: '1.125rem', fontWeight: 'bold', flex: 1 }}
                />
                <Button onClick={handleVerifyCode} disabled={code.length !== 6 || verifyingCode} className="custom-button" style={{ padding: '0.75rem 1rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {verifyingCode ? '확인 중...' : '확인'}
                </Button>
              </div>
            </div>
          )}

          {isEmailVerified && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <CheckCircle2 size={18} />
              이메일 인증이 완료되었습니다.
            </div>
          )}

          {/* Step 2: Registration Fields */}
          {isEmailVerified && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>아이디</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ color: 'var(--text-muted)', position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <Input
                    type="text"
                    placeholder="로그인 아이디 (영문/숫자)"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="custom-input w-full"
                    style={{ paddingLeft: '2.75rem' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>비밀번호</label>
                <div style={{ position: 'relative' }}>
                  <Key size={18} style={{ color: 'var(--text-muted)', position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <Input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="custom-input"
                    style={{ paddingLeft: '2.75rem', width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>비밀번호 확인</label>
                <div style={{ position: 'relative' }}>
                  <Key size={18} style={{ color: 'var(--text-muted)', position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <Input
                    type="password"
                    placeholder="비밀번호 재입력"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="custom-input"
                    style={{ paddingLeft: '2.75rem', width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)' }}>이름 (닉네임)</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ color: 'var(--text-muted)', position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <Input
                    type="text"
                    placeholder="홍길동"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="custom-input"
                    style={{ paddingLeft: '2.75rem', width: '100%' }}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <Button type="submit" className="custom-button" disabled={registering} style={{ width: '100%' }}>
                  {registering ? '가입 진행 중...' : '가입 완료하기'}
                </Button>
              </div>
            </form>
          )}

          <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0 0 0', paddingTop: '1.5rem', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>이미 계정이 있으신가요? </span>
            <button onClick={() => router.push('/login')} style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.875rem', background: 'none' }}>
              로그인하기
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
