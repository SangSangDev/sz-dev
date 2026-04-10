"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Menu, X, MessageCircle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MenuInfo } from '@/lib/session';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { showToast } from '@/lib/toast';

type CurrentUser = {
  user_id: string;
  user_name: string;
};

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menus, setMenus] = useState<MenuInfo[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [showKickoutModal, setShowKickoutModal] = useState(false);

  const fetchMenus = async () => {
    try {
      const res = await fetch('/api/menus');
      if (res.ok) {
        const data = await res.json();
        if (data?.menus) setMenus(data.menus);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (pathname === '/login') return;
    fetchMenus();

    // Fetch current user
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.user) setCurrentUser(data.user); });

    // Fetch unread chat messages total
    fetch('/api/chats/me')
      .then(res => res.ok ? res.json() : [])
      .then(rooms => {
        if (Array.isArray(rooms)) {
          const total = rooms.reduce((acc, room) => acc + (room.unread_count || 0), 0);
          setUnreadTotal(total);
        }
      });

    // Fetch unread notifications count
    fetch('/api/notifications/unread-count')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && typeof data.count === 'number') {
          setUnreadNotifs(data.count);
        }
      });
  }, [pathname]);

  // Global Real-time Stream
  useEffect(() => {
    if (pathname === '/login' || typeof window === 'undefined') return;

    const eventSource = new EventSource('/api/users/me/stream');

    eventSource.onmessage = (event) => {
      if (!event.data) return;
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'NEW_ROOM') {
          setUnreadTotal(prev => prev + 1);
          // Broadcast to other components (like chats page)
          window.dispatchEvent(new CustomEvent('chat_update', { detail: payload }));

          // Custom Toast for new invite
          if (!pathname.startsWith('/chats')) {
            showToast(`새로운 채팅 초대!\n${payload.inviter}님이 '${payload.room_name}' 방에 초대했습니다.`, 'success');
          }
        } else if (payload.type === 'NEW_MESSAGE') {
          // If we are currently in that same room, we are actively reading it, so don't increase unread total globally.
          // Wait, the API might not mark it read instantly, but UX-wise we shouldn't bump badge if active.
          const isActiveRoom = pathname === `/chats/${payload.room_no}`;
          if (!isActiveRoom) {
            setUnreadTotal(prev => prev + 1);
          }
          // Broadcast to other components (like chats page)
          window.dispatchEvent(new CustomEvent('chat_update', { detail: payload }));
        } else if (payload.type === 'NEW_NOTIFICATION') {
          setUnreadNotifs(prev => prev + 1);
        } else if (payload.type === 'KICKOUT') {
          // Concurrent login handled!
          eventSource.close();
          setShowKickoutModal(true);
        }
      } catch (err) {
        console.error('Failed to parse SSE in MobileNav', err);
      }
    };

    let errorAlerted = false;
    eventSource.onerror = () => {
      console.error('SSE Connection Error: Redis might be down.');
      if (!errorAlerted) {
        showToast('실시간 서버 연결 실패\n새로운 채팅 알림 기능이 일시 중단됩니다.', 'error');
        errorAlerted = true;
      }
      eventSource.close(); // Prevent infinite reconnect attempts spamming the failing server
    };

    return () => {
      eventSource.close();
    };
  }, [pathname]);

  if (pathname === '/login') return null;

  const isChatDetailOrCreate = pathname.startsWith('/chats/') && pathname !== '/chats';

  const openSidebar = () => {
    fetchMenus();
    setIsSidebarOpen(true);
  };

  const boardMenus = menus.filter(m => m.is_board === 'Y');
  const generalMenus = menus.filter(m => m.is_board !== 'Y');

  return (
    <>
      {!isChatDetailOrCreate && (
        <nav className="mobile-nav">
          <Link href="/notifications" className={cn("nav-item", pathname === '/notifications' && "active")} style={{ position: 'relative' }}>
          <Bell size={24} fill={pathname === '/notifications' ? "currentColor" : "none"} strokeWidth={pathname === '/notifications' ? 1.5 : 2} />
          <span className="nav-item-text">알림</span>
          {unreadNotifs > 0 && (
            <div className="badge-danger" style={{ position: 'absolute', top: '0.95rem', right: '47%', transform: 'translate(100%, -50%)', zIndex: 10, fontSize: '0.625rem', padding: '0 0.25rem', minWidth: '1.125rem', height: '1.125rem' }}>
              {unreadNotifs > 99 ? '99+' : unreadNotifs}
            </div>
          )}
        </Link>
        
        <Link href="/dashboard" className={cn("nav-item", pathname === '/dashboard' && "active")}>
          <Home size={24} fill={pathname === '/dashboard' ? "currentColor" : "none"} strokeWidth={pathname === '/dashboard' ? 1.5 : 2} />
          <span className="nav-item-text">대시보드</span>
        </Link>

        <Link href="/chats" className={cn("nav-item", pathname.startsWith('/chats') && "active")} style={{ position: 'relative' }}>
          <MessageCircle size={24} fill={pathname.startsWith('/chats') ? "currentColor" : "none"} strokeWidth={pathname.startsWith('/chats') ? 1.5 : 2} />
          <span className="nav-item-text">채팅</span>
          {unreadTotal > 0 && (
            <div className="badge-danger" style={{ position: 'absolute', top: '0.95rem', right: '47%', transform: 'translate(100%, -50%)', zIndex: 10, fontSize: '0.625rem', padding: '0 0.25rem', minWidth: '1.125rem', height: '1.125rem' }}>
              {unreadTotal > 999 ? '999+' : unreadTotal}
            </div>
          )}
        </Link>
        <button onClick={openSidebar} className="nav-item border-none bg-transparent pt-1" style={{ position: 'relative' }}>
          <Menu size={24} strokeWidth={2} />
          <span className="nav-item-text">Menu</span>
          {menus.some(m => m.has_new) && (
            <div style={{ position: 'absolute', top: '0.75rem', right: '50%', transform: 'translate(100%, -50%)', width: '5px', height: '5px', backgroundColor: '#ef4444', borderRadius: '50%', zIndex: 10 }} />
          )}
        </button>
        </nav>
      )}

      {/* Overlay */}
      <div
        className={cn("overlay", isSidebarOpen && "show")}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <div className={cn("sidebar", isSidebarOpen && "show")}>
        <div className="safe-area-bottom hidden md:block" />
        <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
          <Link
            href="/profile"
            onClick={() => setIsSidebarOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.875rem',
              textDecoration: 'none',
              color: 'var(--foreground)'
            }}
          >
            <div style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              backgroundColor: 'var(--primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.25rem',
              flexShrink: 0,
            }}>
              {currentUser?.user_name?.charAt(0) || '?'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="font-bold" style={{ fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.user_name || '로그인 필요'}
              </div>
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                @{currentUser?.user_id || '...'}
              </div>
            </div>
          </Link>
        </div>
        <div className="sidebar-menu">
          {boardMenus.length === 0 ? (
            <div className="p-4 text-center text-muted text-sm">접근 가능한 게시판이 없습니다.</div>
          ) : (
            <>
              <div style={{
                padding: '0.5rem 1.5rem 0.25rem',
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}>
                게시판 목록
              </div>
              {boardMenus.map(menu => (
                <Link
                  key={menu.menu_no}
                  href={menu.url || '#'}
                  className="sidebar-link"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <span style={{ fontSize: '0.875rem' }}>📋</span>
                  {menu.menu_name}
                  {menu.has_new && (
                    <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.55rem', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', fontWeight: 800, marginLeft: 'auto' }}>
                      N
                    </span>
                  )}
                </Link>
              ))}
            </>
          )}
        </div>
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '3rem', height: '3rem', borderRadius: '50%', border: 'none', backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'pointer' }}
          >
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Concurrent Login Kickout Modal */}
      <ConfirmModal
        isOpen={showKickoutModal}
        title="로그아웃 알림"
        message="다른 기기에서 로그인되어 강제 로그아웃 됩니다."
        confirmText="로그인 페이지"
        onConfirm={() => {
          fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
            window.location.href = '/login?reason=duplicate';
          });
        }}
      />
    </>
  );
}

