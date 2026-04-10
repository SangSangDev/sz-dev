"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ChatRoomEditPage({ params }: { params: Promise<{ roomId: string }> }) {
  const unwrappedParams = use(params);
  const roomId = unwrappedParams.roomId;
  const router = useRouter();

  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchRoomInfo = async () => {
      try {
        const res = await fetch(`/api/chats/${roomId}`);
        if (!res.ok) {
          if (res.status === 401) router.push('/login');
          if (res.status === 404) router.push('/chats');
          throw new Error('Room not found');
        }
        const data = await res.json();
        setRoomName(data.room.room_name);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoomInfo();
  }, [roomId, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/chats/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: roomName.trim() })
      });
      
      if (!res.ok) throw new Error('Failed to update');
      
      // Notify other parts of the app that the room name might have changed
      window.dispatchEvent(
        new CustomEvent('show_toast', {
          detail: { message: '채팅방 이름이 변경되었습니다.', type: 'success' },
        })
      );
      
      router.push(`/chats/${roomId}`);
    } catch (err) {
      console.error(err);
      window.dispatchEvent(
        new CustomEvent('show_toast', {
          detail: { message: '이름 변경 중 오류가 발생했습니다.', type: 'error' },
        })
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '42rem', margin: '0 auto', width: '100%', backgroundColor: '#f3f4f6' }}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Loader2 className="animate-spin text-muted" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: '42rem', margin: '0 auto', width: '100%', backgroundColor: '#f3f4f6' }}>
      <header className="header shrink-0 bg-white" style={{ zIndex: 20 }}>
        <button onClick={() => router.back()} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <ChevronLeft size={26} strokeWidth={2.5} />
        </button>
        <h1 style={{ fontSize: '1.0625rem', fontWeight: 'bold', color: 'var(--foreground)' }}>채팅방 설정</h1>
        <div style={{ width: 26 }} />
      </header>

      <div style={{ padding: '1.5rem', flex: 1 }}>
        <div className="list-card mb-6" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--foreground)' }}>채팅방 이름 변경</h2>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="채팅방 이름을 입력하세요"
              disabled={isSaving}
              className="form-input"
              required
              style={{
                backgroundColor: 'rgba(243, 244, 246, 0.8)',
                padding: '0.875rem 1rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-color)',
                fontSize: '1rem',
                width: '100%'
              }}
            />
            <Button 
              type="submit" 
              disabled={isSaving || !roomName.trim()} 
              variant="primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem' }}
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
              저장하기
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
