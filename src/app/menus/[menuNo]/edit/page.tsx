"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function EditMenuPage({ params }: { params: Promise<{ menuNo: string }> }) {
  const unwrappedParams = use(params);
  const menuNo = unwrappedParams.menuNo;
  const [menuName, setMenuName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/menus/${menuNo}`)
      .then(res => res.json())
      .then(data => {
        if (data.menu) {
          setMenuName(data.menu.menu_name);
          setIsPublic(data.menu.is_public === 'Y');
        }
      })
      .catch(console.error)
      .finally(() => setInitialLoading(false));
  }, [menuNo]);

  const handleSave = async () => {
    if (!menuName.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/menus/${menuNo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuName, isPublic: isPublic ? 'Y' : 'N' }),
      });

      if (!res.ok) {
        if (res.status === 401) router.push('/login');
        throw new Error('Failed to update');
      }

      router.push(`/boards/${menuNo}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
        <header className="header shrink-0 bg-white" style={{ zIndex: 10 }}>
          <button onClick={() => router.back()} style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={26} strokeWidth={2.5} />
          </button>
          <h1 style={{ fontSize: '1.0625rem', fontWeight: 'bold', color: 'var(--foreground)' }}>게시판 수정</h1>
          <div style={{ width: 26 }} /> {/* Balance flex-between */}
        </header>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>게시판 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: '8rem', backgroundColor: '#f3f4f6', position: 'relative' }}>
      <header className="header shrink-0 bg-white" style={{ zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={26} strokeWidth={2.5} />
        </button>
        <h1 style={{ fontSize: '1.0625rem', fontWeight: 'bold', color: 'var(--foreground)' }}>게시판 수정</h1>
        <div style={{ width: 26 }} /> {/* Balance flex-between */}
      </header>

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <section>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: '#374151', marginBottom: '0.625rem' }}>게시판 이름</label>
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <Input 
              placeholder="예: 공지사항"
              value={menuName}
              onChange={(e) => setMenuName(e.target.value)}
              className="form-input"
              style={{ height: '3rem', fontSize: '0.9375rem', border: 'none', backgroundColor: 'transparent' }}
            />
          </div>
        </section>

        <section>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: '1rem', padding: '1.25rem', border: '1px solid var(--border-color)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 'bold', color: 'var(--foreground)', marginBottom: '0.25rem' }}>공개 게시판</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>누구나 대시보드에서 이 게시판을 볼 수 있습니다.</div>
            </div>
            <button 
              type="button" 
              role="switch" 
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              style={{
                width: '3rem', 
                height: '1.75rem', 
                borderRadius: '9999px',
                backgroundColor: isPublic ? 'var(--primary)' : '#d1d5db',
                position: 'relative',
                transition: 'background-color 0.2s',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <span style={{
                display: 'block',
                width: '1.375rem',
                height: '1.375rem',
                borderRadius: '50%',
                backgroundColor: 'white',
                position: 'absolute',
                top: '0.1875rem',
                left: isPublic ? 'calc(100% - 1.5625rem)' : '0.1875rem',
                transition: 'left 0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }} />
            </button>
          </div>
        </section>
      </div>

      {/* Fixed Bottom Action Button */}
      <div style={{ position: 'fixed', bottom: '4rem', left: 0, right: 0, padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', borderTop: '1px solid var(--border-color)', zIndex: 20, display: 'flex', justifyContent: 'center', boxShadow: '0 -10px 20px -10px rgba(0,0,0,0.05)' }}>
        <Button 
          onClick={handleSave}
          disabled={loading || !menuName.trim()}
          className="btn btn-primary"
          style={{ width: '100%', maxWidth: '42rem', height: '3.5rem', fontSize: '1rem', fontWeight: 'bold', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(91, 95, 199, 0.2)' }}
        >
          {loading ? '저장 중...' : '게시판 수정하기'}
        </Button>
      </div>
    </div>
  );
}
