"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send, Loader2, MessageSquare, MoreHorizontal, Settings, LogOut, UserPlus, Search, Users, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { RollupPopup } from '@/components/ui/RollupPopup';

type Message = {
  msg_no: number;
  room_no: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
};

interface ChatRoomClientProps {
  roomId: string;
  roomName: string;
  roomType?: string;
  createdBy?: string;
  currentUser: { user_id: string; user_name: string };
}

export default function ChatRoomClient({ roomId, roomName, roomType = 'PUBLIC', createdBy, currentUser }: ChatRoomClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Layout & Settings States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Invite States
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [users, setUsers] = useState<{ user_id: string; login_id: string; user_name: string }[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroller helper
  const scrollToBottom = () => {
    // Timeout helps ensure DOM is updated before scroll
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  // 1. Mark as read Helper
  const markAsRead = async () => {
    try {
      await fetch(`/api/chats/${roomId}/read`, { method: 'POST' });
    } catch (e) {
      console.error('Failed to update read timestamp', e);
    }
  };

  // 2. Initial Setup: Load history & mark read
  useEffect(() => {
    const loadInit = async () => {
      try {
        const res = await fetch(`/api/chats/${roomId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
          scrollToBottom();
        }
      } finally {
        setIsLoadingHistory(false);
      }
      markAsRead(); // mark initial load as read
    };
    loadInit();
  }, [roomId]);

  // Handle User Searching for Invite
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!showInviteModal) return;
    const fetchUsers = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(debouncedSearchQuery)}`);
        if (res.ok) setUsers(await res.json());
      } catch (err) {
        console.error('Failed to fetch users', err);
      } finally {
        setIsSearching(false);
      }
    };
    fetchUsers();
  }, [debouncedSearchQuery, showInviteModal]);

  const toggleUserSelection = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) newSet.delete(userId);
    else newSet.add(userId);
    setSelectedUserIds(newSet);
  };

  const handleInviteMembers = async () => {
    if (selectedUserIds.size === 0) return;
    setIsInviting(true);
    try {
      const res = await fetch(`/api/chats/${roomId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedUserIds) })
      });
      if (!res.ok) throw new Error('Failed to invite users');

      window.dispatchEvent(new CustomEvent('show_toast', { detail: { message: '사용자를 초대했습니다.', type: 'success' } }));

      setShowInviteModal(false);
      setSelectedUserIds(new Set());
      setSearchQuery('');
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('show_toast', { detail: { message: '초대에 실패했습니다.', type: 'error' } }));
    } finally {
      setIsInviting(false);
    }
  };

  // 3. SSE Stream Connection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const eventSource = new EventSource(`/api/chats/${roomId}/stream`);

    eventSource.onmessage = (event) => {
      // EventSource sends bare message. Let's parse it safely.
      if (!event.data) return;
      try {
        const newMessage = JSON.parse(event.data);

        // Use functional state update to prevent stale closures
        setMessages((prev) => {
          // Prevent duplicates if EventSource randomly reconnects or gets double events
          if (prev.find(m => m.msg_no === newMessage.msg_no)) return prev;
          return [...prev, newMessage];
        });

        scrollToBottom();
        markAsRead(); // Mark dynamically received messages as read
      } catch (e) {
        console.error('Error parsing SSE message:', e);
      }
    };

    eventSource.onerror = (e) => {
      console.error('SSE Error:', e);
      // EventSource normally auto-reconnects.
    };

    return () => {
      eventSource.close();
    };
  }, [roomId]);

  // 4. Send Message Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    setIsSending(true);
    const textToSend = inputValue.trim();
    setInputValue(''); // Optimistic clear of input

    try {
      const res = await fetch(`/api/chats/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: textToSend })
      });
      if (!res.ok) {
        throw new Error('Failed to send');
      }
      // Note: We do NOT optimistically append the message to State here.
      // We rely completely on the SSE EventSource to bounce the message back to us.
      // This enforces a true Single Source of Truth and guarantees order!
    } catch (err) {
      console.error(err);
      alert('메시지 전송에 실패했습니다.');
      setInputValue(textToSend); // Revert on failure
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', maxWidth: '42rem', margin: '0 auto', width: '100%', backgroundColor: 'var(--background)', overflow: 'hidden', position: 'relative' }}>
      {/* Header */}
      <header className="header shrink-0 sticky-header">
        <Link href={`/chats?tab=${roomType}`} className="text-muted">
          <ChevronLeft size={26} strokeWidth={2.5} />
        </Link>
        <h1 style={{ fontSize: '1.0625rem', fontWeight: 'bold', color: 'var(--foreground)' }}>{roomName}</h1>
        <button
          onClick={() => setIsDropdownOpen(true)}
          className="text-muted"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
        >
          <MoreHorizontal size={26} strokeWidth={2.5} />
        </button>
      </header>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '1.5rem' }}>
        {isLoadingHistory ? (
          <div className="empty-state">
            <Loader2 className="animate-spin" size={20} style={{ marginRight: '0.5rem' }} /> 대화 불러오는 중...
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div style={{ backgroundColor: 'rgba(243, 244, 246, 0.8)', width: '4rem', height: '4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <MessageSquare size={24} color="#9ca3af" />
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>메시지가 없습니다. 첫 인사를 건네보세요!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            if (msg.user_id === 'SYSTEM') {
              return (
                <div key={msg.msg_no} style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '0.5rem 0' }}>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: '#6b7280', padding: '0.25rem 1rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>
                    {msg.content}
                  </div>
                </div>
              );
            }

            const isMe = msg.user_id === currentUser.user_id;
            // Determine if we need to show the username (only if not me, and previous message wasn't from the same user)
            const showName = !isMe && (idx === 0 || messages[idx - 1].user_id !== msg.user_id);
            const timeString = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={msg.msg_no} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-start', width: '100%' }}>
                {/* Time before bubble (Right side layout requires time to come before bubble) layout depends on normal/reverse flex */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.375rem', flexDirection: isMe ? 'row' : 'row-reverse', maxWidth: '75%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>

                    {/* User Name and Profile (Only for others) */}
                    {showName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.375rem', marginLeft: '0.25rem' }}>
                        <div className="avatar-sm" style={{ flexShrink: 0, width: '1.5rem', height: '1.5rem' }}>
                          <span>{msg.user_name.charAt(0)}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280' }}>
                          {msg.user_name}
                        </span>
                        {/* 방장 Label */}
                        {roomType === 'PUBLIC' && msg.user_id === createdBy && (
                          <span style={{ fontSize: '0.6rem', backgroundColor: 'var(--primary)', color: 'white', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                            방장
                          </span>
                        )}
                      </div>
                    )}

                    {/* Time & Bubble Flex */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.375rem', flexDirection: isMe ? 'row' : 'row-reverse' }}>
                      <span style={{ fontSize: '0.625rem', color: '#9ca3af', fontWeight: 500, flexShrink: 0, paddingBottom: '0.125rem' }}>
                        {timeString}
                      </span>

                      <div
                        style={{
                          padding: '0.625rem 0.875rem',
                          fontSize: '0.9375rem',
                          wordBreak: 'break-word',
                          lineHeight: 1.5,
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          backgroundColor: isMe ? 'var(--primary)' : 'var(--card-bg)',
                          color: isMe ? 'white' : 'var(--foreground)',
                          border: isMe ? 'none' : '1px solid var(--border-color)',
                          borderRadius: '1rem',
                          borderBottomRightRadius: isMe ? '0.125rem' : '1rem',
                          borderBottomLeftRadius: isMe ? '1rem' : '0.125rem'
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} style={{ height: '0.5rem' }} />
      </div>

      {/* Input Area */}
      <div style={{ flexShrink: 0, backgroundColor: 'var(--card-bg)', borderTop: '1px solid var(--border-color)', padding: '0.75rem', zIndex: 20, boxShadow: '0 -4px 10px -4px rgba(0,0,0,0.05)' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', maxWidth: '42rem', margin: '0 auto' }}>
          <div style={{ flex: 1, backgroundColor: 'var(--background)', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', minHeight: '2.75rem', transition: 'all 0.2s' }}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="메시지 입력..."
              disabled={isLoadingHistory}
              className="form-input"
              style={{ flex: 1, backgroundColor: 'transparent', border: 'none', padding: '0.75rem 1rem', fontSize: '0.9375rem', boxShadow: 'none', color: 'var(--foreground)' }}
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || isSending || isLoadingHistory}
            style={{
              backgroundColor: (!inputValue.trim() || isSending || isLoadingHistory) ? '#d1d5db' : 'var(--primary)',
              color: (!inputValue.trim() || isSending || isLoadingHistory) ? '#6b7280' : 'white',
              borderRadius: '50%',
              width: '2.75rem',
              height: '2.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: (!inputValue.trim() || isSending || isLoadingHistory) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              border: 'none'
            }}
          >
            {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={18} style={{ transform: 'translate(1px, 1px)' }} />}
          </button>
        </form>
      </div>

      {/* Custom Confirm Modal for Leaving Room */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="채팅방 나가기"
        message={
          <>
            정말 이 채팅방에서 나가시겠습니까?
          </>
        }
        confirmText="나가기"
        cancelText="취소"
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            const res = await fetch(`/api/chats/${roomId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to leave');

            window.dispatchEvent(new CustomEvent('show_toast', { detail: { message: '채팅방에서 성공적으로 나갔습니다.', type: 'info' } }));
            router.push('/chats');
          } catch (err) {
            console.error(err);
            window.dispatchEvent(new CustomEvent('show_toast', { detail: { message: '오류가 발생했습니다.', type: 'error' } }));
            setIsDeleting(false);
            setShowConfirmModal(false);
          }
        }}
        onCancel={() => setShowConfirmModal(false)}
        isLoading={isDeleting}
      />

      {/* User Invite Modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease-out', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '1rem', width: '100%', maxWidth: '28rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={22} style={{ color: 'var(--primary)' }} />
                사용자 초대
              </h2>
              <button onClick={() => setShowInviteModal(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>
              {/* Search Box */}
              <div style={{ position: 'relative' }}>
                <Search size={20} color="#9ca3af" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="이름 또는 아이디로 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', backgroundColor: 'rgba(243, 244, 246, 0.5)', fontSize: '1rem' }}
                />
              </div>

              {/* User List */}
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
                    {users.map(user => {
                      if (user.user_id === currentUser.user_id) return null; // Can't invite self
                      const isSelected = selectedUserIds.has(user.user_id);
                      return (
                        <div
                          key={user.user_id}
                          onClick={() => toggleUserSelection(user.user_id)}
                          style={{
                            display: 'flex', alignItems: 'center', padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'white', transition: 'background-color 0.15s'
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

                          <div style={{
                            width: '1.5rem', height: '1.5rem', borderRadius: '50%', border: isSelected ? 'none' : '1px solid #d1d5db',
                            backgroundColor: isSelected ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: '#f9fafb', display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                disabled={isInviting}
                style={{ flex: 1, padding: '0.875rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', backgroundColor: 'white', color: '#4b5563', fontWeight: 600, cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleInviteMembers}
                disabled={selectedUserIds.size === 0 || isInviting}
                style={{ flex: 1, padding: '0.875rem', borderRadius: '0.75rem', border: 'none', backgroundColor: selectedUserIds.size === 0 ? '#9ca3af' : 'var(--primary)', color: 'white', fontWeight: 600, cursor: selectedUserIds.size === 0 ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
              >
                {isInviting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                {selectedUserIds.size > 0 ? `${selectedUserIds.size}명 초대하기` : '초대하기'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Settings/Options RollupPopup */}
      <RollupPopup isOpen={isDropdownOpen} onClose={() => setIsDropdownOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {roomType === 'PUBLIC' && createdBy === currentUser.user_id && (
            <>
              <button 
                className="w-full text-left font-medium p-3 rounded-lg flex items-center transition-colors"
                style={{ color: 'var(--foreground)' }}
                onClick={() => { setIsDropdownOpen(false); router.push(`/chats/${roomId}/edit`); }}
              >
                <div className="flex items-center gap-2">
                  <Settings size={18} />
                  <span>설정</span>
                </div>
              </button>
              <button 
                className="w-full text-left font-medium p-3 rounded-lg flex items-center transition-colors"
                style={{ color: 'var(--foreground)' }}
                onClick={() => { setIsDropdownOpen(false); setShowInviteModal(true); }}
              >
                <div className="flex items-center gap-2">
                  <UserPlus size={18} />
                  <span>초대하기</span>
                </div>
              </button>
            </>
          )}
          <button 
            className="w-full text-left font-medium p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center transition-colors"
            onClick={() => { setIsDropdownOpen(false); setShowConfirmModal(true); }}
          >
            <div className="flex items-center gap-2">
              <LogOut size={18} />
              <span>나가기</span>
            </div>
          </button>
        </div>
      </RollupPopup>
    </div>
  );
}
