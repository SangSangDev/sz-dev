"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Search, Users, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

type User = {
  user_id: string;
  user_name: string;
  login_id: string;
};

export default function CreateChatPage() {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Local static debounce since the query is lightweight
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(debouncedSearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [debouncedSearchQuery]);

  // Client-side mapping is no longer filtered manually since backend does the job -> filteredUsers = users
  const filteredUsers = users;

  const toggleUserSelection = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      alert('채팅방 이름을 입력해주세요.');
      return;
    }
    if (selectedUserIds.size === 0) {
      alert('참여할 인원을 1명 이상 선택해주세요.');
      return;
    }

    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomName: roomName.trim(), 
          userIds: Array.from(selectedUserIds) 
        })
      });

      if (!res.ok) throw new Error('Failed to create chat room');
      
      const { room_no } = await res.json();
      router.push(`/chats/${room_no}`);
    } catch (err) {
      console.error(err);
      alert('채팅방 생성에 실패했습니다.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: '8rem', backgroundColor: 'var(--background)', position: 'relative' }}>
      {/* Header */}
      <header className="header shrink-0" style={{ zIndex: 10 }}>
        <Link href="/chats" style={{ color: 'var(--text-muted)' }}>
          <ChevronLeft size={26} strokeWidth={2.5} />
        </Link>
        <h1 style={{ fontSize: '1.0625rem', fontWeight: 'bold', color: 'var(--foreground)' }}>새 채팅방</h1>
        <div style={{ width: 26 }} /> {/* Balance for flex-between */}
      </header>

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Room Name Input */}
        <section>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--foreground)', marginBottom: '0.625rem' }}>채팅방 이름</label>
          <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <Input 
              placeholder="멋진 채팅방 이름을 지어주세요" 
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="form-input"
              style={{ height: '3rem', fontSize: '0.9375rem', border: 'none', backgroundColor: 'transparent', color: 'var(--foreground)' }}
            />
          </div>
        </section>

        {/* User Search & Selection */}
        <section style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Users size={16} color="var(--primary)" /> 
              대화 상대 초대
            </label>
            <span style={{ fontSize: '0.6875rem', fontWeight: 'bold', color: 'var(--primary)', backgroundColor: 'rgba(91, 95, 199, 0.1)', padding: '0.125rem 0.5rem', borderRadius: '9999px' }}>
              {selectedUserIds.size}명 선택됨
            </span>
          </div>
          
          <div style={{ position: 'relative', marginBottom: '0.75rem', backgroundColor: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            <Search style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
            <Input 
              placeholder="이름이나 아이디로 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.5rem', backgroundColor: 'transparent', border: 'none', color: 'var(--foreground)' }}
            />
          </div>

          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '1rem', maxHeight: '50vh', overflowY: 'auto', width: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            {isLoading ? (
              <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                <Users size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>사용자 검색 중...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                <Search size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>일치하는 사용자가 없습니다</span>
              </div>
            ) : (
              filteredUsers.map(user => {
                const isSelected = selectedUserIds.has(user.user_id);
                return (
                  <div 
                    key={user.user_id} 
                    onClick={() => toggleUserSelection(user.user_id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', backgroundColor: isSelected ? 'var(--post-expansion-bg)' : 'transparent', transition: 'background-color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--post-expansion-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? 'var(--post-expansion-bg)' : 'transparent'}
                  >
                    {/* Checkbox */}
                    <div style={{ width: '1.25rem', height: '1.25rem', borderRadius: '50%', border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: isSelected ? 'var(--primary)' : 'transparent' }}>
                      {isSelected && <Check size={12} strokeWidth={4} color="white" />}
                    </div>
                    {/* User Avatar */}
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', backgroundColor: 'rgba(91, 95, 199, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9375rem', flexShrink: 0 }}>
                      {user.user_name.charAt(0)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--foreground)' }}>{user.user_name}</span>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{user.login_id}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Fixed Bottom Action Button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))', backgroundColor: 'var(--card-bg)', borderTop: '1px solid var(--border-color)', zIndex: 20, display: 'flex', justifyContent: 'center', boxShadow: '0 -10px 20px -10px rgba(0,0,0,0.05)' }}>
        <Button 
          onClick={handleCreateRoom}
          disabled={!roomName.trim() || selectedUserIds.size === 0}
          className="btn btn-primary"
          style={{ width: '100%', maxWidth: '42rem', height: '3.5rem', fontSize: '1rem', fontWeight: 'bold', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(91, 95, 199, 0.2)' }}
        >
          시작하기
        </Button>
      </div>
    </div>
  );
}
