'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type Notification = {
  notif_no: string;
  user_id: string;
  actor_id: string;
  type: string;
  target_url: string;
  message: string;
  is_read: string;
  created_at: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRead = async (notif: Notification) => {
    if (notif.is_read === 'N') {
      try {
        await fetch(`/api/notifications/${notif.notif_no}/read`, { method: 'PATCH' });
      } catch (err) {
        console.error(err);
      }
    }
    // Update locally so it feels fast if they come back
    setNotifications(prev => prev.map(n => n.notif_no === notif.notif_no ? { ...n, is_read: 'Y' } : n));
    router.push(notif.target_url);
  };

  const handleReadAll = async () => {
    try {
      await fetch(`/api/notifications/all/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 'Y' })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <header className="header">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bell size={24} />
          알림
        </h1>
        {!loading && notifications.some(n => n.is_read === 'N') && (
          <Button variant="ghost" size="sm" onClick={handleReadAll} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckSquare size={14} />
            모두 읽음
          </Button>
        )}
      </header>

      <div style={{ flex: 1, position: 'relative' }}>
        <div className="p-4" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '100%' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '10rem', color: 'var(--text-muted)' }}>
              잠시만 기다려주세요...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '10rem', color: 'var(--text-muted)' }}>
              <Bell size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
              <p>새로운 알림이 없습니다.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.notif_no} 
                onClick={() => handleRead(notif)}
                className="list-card"
                style={{ 
                  cursor: 'pointer', 
                  backgroundColor: '#ffffff',
                  border: notif.is_read === 'N' ? '1px solid rgba(91,95,199,0.2)' : '1px solid var(--border-color)',
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
                }}
              >
                <div style={{
                  width: '8px', height: '8px', marginTop: '8px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: notif.is_read === 'N' ? 'var(--primary)' : 'transparent'
                }} />
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: notif.is_read === 'N' ? 600 : 400,
                    color: notif.is_read === 'N' ? 'var(--text)' : 'var(--text-muted)',
                    margin: 0
                  }}>
                    {notif.message}
                  </p>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', opacity: 0.6 }}>
                    {new Date(notif.created_at).toLocaleString('ko-KR')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
