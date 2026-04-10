"use client";

import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Users, RefreshCw, Search, MessageCircle, MoreVertical, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type ChatRoom = {
  room_no: string;
  room_name: string;
  member_count: number;
  unread_count: number;
  last_message: string | null;
  last_message_time: string | null;
  created_at: string;
  room_type: 'PUBLIC' | 'PRIVATE';
};

type User = {
  user_id: string;
  login_id: string;
  user_name: string;
};

export default function ChatsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = React.useRef(0);

  // Tab State
  const [activeTab, setActiveTab] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/chats/me');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setMyUserId(meData.user.user_id);
      }
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    } finally {
      setIsLoading(false);
    }
  };

  // FAB Menu States
  const [showFabMenu, setShowFabMenu] = useState(false);

  // Direct Message Modal States
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingDirect, setIsCreatingDirect] = useState(false);

  // Handle Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!showDirectModal) return;
    const fetchUsers = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(debouncedSearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          // Filter out myself
          setUsers(data.filter((u: User) => u.user_id !== myUserId));
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally {
        setIsSearching(false);
      }
    };
    fetchUsers();
  }, [debouncedSearchQuery, showDirectModal, myUserId]);

  const handleStartDirectChat = async (targetUserId: string) => {
    setIsCreatingDirect(true);
    try {
      const res = await fetch('/api/chats/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId })
      });
      if (!res.ok) throw new Error('Failed to join/create direct chat');

      const { room_no, isNew } = await res.json();

      if (isNew) {
        window.dispatchEvent(new CustomEvent('show_toast', { detail: { message: '다이렉트 채팅방이 생성되었습니다.', type: 'success' } }));
      }

      router.push(`/chats/${room_no}`);
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('show_toast', { detail: { message: '채팅방 이동에 실패했습니다.', type: 'error' } }));
      setIsCreatingDirect(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0) pullStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pullStartY.current || isRefreshing) return;
    if (window.scrollY > 0) {
      pullStartY.current = 0;
      setPullDistance(0);
      return;
    }
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy > 0) {
      if (e.cancelable) e.preventDefault();
      setPullDistance(Math.min(dy * 0.4, 80));
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (!pullStartY.current || isRefreshing) return;
    pullStartY.current = 0;
    if (pullDistance > 60) {
      setIsRefreshing(true);
      setPullDistance(60);
      fetchRooms().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }
  };

  // Global Real-time Stream for Chat List synced via window event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleChatUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail) return;

      const payload = customEvent.detail;
      if (payload.type === 'NEW_ROOM' || payload.type === 'NEW_MESSAGE') {
        const roomId = payload.room_no;
        setRooms((prevRooms) => {
          const roomIndex = prevRooms.findIndex(r => r.room_no === roomId);
          if (roomIndex === -1) {
            // New room or completely unknown room: trigger a quick refetch of everything
            fetch('/api/chats/me').then(res => res.json()).then(setRooms);
            return prevRooms;
          }

          const updated = [...prevRooms];
          if (payload.type === 'NEW_MESSAGE') {
            updated[roomIndex] = {
              ...updated[roomIndex],
              last_message: payload.message,
              last_message_time: payload.created_at || new Date().toISOString(),
              unread_count: (updated[roomIndex].unread_count || 0) + 1
            };
          }
          // Move the updated room to the top
          return updated.sort((a, b) => new Date(b.last_message_time || 0).getTime() - new Date(a.last_message_time || 0).getTime());
        });
      }
    };

    window.addEventListener('chat_update', handleChatUpdate);
    return () => {
      window.removeEventListener('chat_update', handleChatUpdate);
    };
  }, []);

  const filteredRooms = rooms.filter(r => r.room_type === activeTab);

  return (
    <div className="flex flex-col min-h-screen pb-20 max-w-2xl mx-auto w-full relative" style={{ backgroundColor: '#f3f4f6' }}>
      <header className="header shrink-0 bg-white" style={{ zIndex: 10, display: 'flex', flexDirection: 'column', height: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', height: '3.5rem', padding: '0 1.25rem' }}>
          <h1 className="text-xl font-bold">채팅</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', width: '100%' }}>
          <button
            onClick={() => setActiveTab('PRIVATE')}
            style={{
              flex: 1, padding: '0.875rem 0', fontWeight: 600, fontSize: '0.9375rem',
              color: activeTab === 'PRIVATE' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'PRIVATE' ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            개인 채팅 (1:1)
          </button>
          <button
            onClick={() => setActiveTab('PUBLIC')}
            style={{
              flex: 1, padding: '0.875rem 0', fontWeight: 600, fontSize: '0.9375rem',
              color: activeTab === 'PUBLIC' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'PUBLIC' ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            그룹 채팅
          </button>
        </div>
      </header>

      {/* Main Content Wrapper (Fixed Header Above) */}
      <div style={{ flex: 1, position: 'relative' }}>

        {/* Pull To Refresh Indicator */}
        {pullDistance > 0 && (
          <div
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '60px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1, opacity: Math.min(pullDistance / 60, 1),
            }}
          >
            <RefreshCw
              size={24}
              className={`text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: isRefreshing ? 'none' : `rotate(${pullDistance * 2}deg)` }}
            />
          </div>
        )}

        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            transform: `translateY(${pullDistance}px)`,
            transition: isRefreshing || pullStartY.current === 0 ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
            position: 'relative', zIndex: 2, minHeight: '100%',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {isLoading ? (
            <div style={{ flex: 1, padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
              목록 불러오는 중...
            </div>
          ) : filteredRooms.length === 0 ? (
            <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', height: '70vh' }}>
              <div style={{ backgroundColor: 'white', width: '5rem', height: '5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                <MessageSquare size={32} color="var(--text-muted)" />
              </div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--foreground)', marginBottom: '0.5rem' }}>
                {activeTab === 'PUBLIC' ? '참여 중인 그룹 대화가 없습니다' : '참여 중인 개인 채팅이 없습니다'}
              </h2>
              <p style={{ fontSize: '0.875rem' }}>우측 하단의 + 버튼을 눌러 새 채팅을 시작해보세요.</p>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredRooms.map((room) => (
                <Link key={room.room_no} href={`/chats/${room.room_no}`}>
                  <div className="list-card">
                    {/* Room Avatar */}
                    <div className="avatar-lg" style={{ position: 'relative' }}>
                      <span>{room.room_name.charAt(0)}</span>
                      {/* Unread Badge */}
                      {room.unread_count > 0 && (
                        <div className="badge-danger" style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem' }}>
                          {room.unread_count > 99 ? '99+' : room.unread_count}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.9375rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--foreground)' }}>{room.room_name}</span>
                          {room.room_type !== 'PRIVATE' && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500, backgroundColor: '#f3f4f6', padding: '0.125rem 0.375rem', borderRadius: '9999px', flexShrink: 0 }}>
                              <Users size={10} /> {room.member_count}
                            </span>
                          )}
                        </div>
                        {room.last_message_time && (
                          <span style={{ fontSize: '0.6875rem', color: '#9ca3af', flexShrink: 0, marginLeft: '0.5rem', fontWeight: 500 }}>
                            {new Date(room.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: room.unread_count > 0 ? 'var(--foreground)' : 'var(--text-muted)', fontWeight: room.unread_count > 0 ? 'bold' : 'normal' }}>
                        {room.last_message || '아직 메시지가 없습니다.'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {showFabMenu && (
        <div 
          className="animate-fade-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(2px)' }} 
          onClick={() => setShowFabMenu(false)} 
        />
      )}
      <div
        style={{
          position: 'fixed',
          bottom: '5rem', // Adjusted slightly above nav bar normally handled by .fab-btn class context, but defining fully here
          right: '1.5rem',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '0.75rem'
        }}
      >
        {/* Expanded Menu Options */}
        {showFabMenu && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end', animation: 'slideUp 0.15s ease-out' }}>
            <button
              onClick={() => {
                setShowFabMenu(false);
                setShowDirectModal(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', color: 'var(--foreground)', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              <span>사용자 검색</span>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={16} color="var(--primary)" />
              </div>
            </button>

            <Link
              href="/chats/create"
              onClick={() => setShowFabMenu(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', color: 'var(--foreground)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}
            >
              <span>그룹 채팅 만들기</span>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={16} color="var(--primary)" />
              </div>
            </Link>
          </div>
        )}

        {/* Main + Button */}
        <button
          onClick={() => setShowFabMenu(!showFabMenu)}
          style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4), 0 4px 6px -2px rgba(99, 102, 241, 0.2)', transition: 'transform 0.2s', transform: showFabMenu ? 'rotate(45deg)' : 'none' }}
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </div>

      {/* Direct Message (1:1) Search Modal */}
      {showDirectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease-out', padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '28rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', position: 'relative' }}>

            {/* Loading Overlay when joining room */}
            {isCreatingDirect && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem' }}>
                <Loader2 className="animate-spin text-primary" size={40} />
                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>채팅방 이동 중...</span>
              </div>
            )}

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageCircle size={22} style={{ color: 'var(--primary)' }} />
                1:1 대화 시작하기
              </h2>
              <button
                onClick={() => setShowDirectModal(false)}
                disabled={isCreatingDirect}
                style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ position: 'relative' }}>
                <Search size={20} color="#9ca3af" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="아이디 또는 이름으로 검색하세요"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', backgroundColor: 'rgba(243, 244, 246, 0.5)', fontSize: '1rem' }}
                />
              </div>

              <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '0.75rem', backgroundColor: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '16rem' }}>
                {isSearching ? (
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Loader2 className="animate-spin text-muted" size={24} />
                  </div>
                ) : users.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#9ca3af', gap: '0.5rem', padding: '2rem' }}>
                    <Users size={32} />
                    <p style={{ fontSize: '0.9rem' }}>검색 결과가 없습니다.</p>
                  </div>
                ) : (
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {users.map(user => (
                      <div
                        key={user.user_id}
                        onClick={() => handleStartDirectChat(user.user_id)}
                        style={{
                          display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: 'white', transition: 'background-color 0.15s'
                        }}
                      >
                        <div style={{
                          width: '2.5rem', height: '2.5rem', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem', marginRight: '1rem', flexShrink: 0
                        }}>
                          {user.user_name.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--foreground)' }}>{user.user_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>@{user.login_id}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
