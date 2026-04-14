"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Users, Lock, Unlock, Mail, Clock, CheckCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RollupPopup } from '@/components/ui/RollupPopup';
import { showToast } from '@/lib/toast';

type UserData = {
  user_no: string;
  user_id: string;
  email: string;
  user_name: string;
  is_locked: boolean;
  last_login_at: string | null;
  created_at: string;
  role_no?: string;
  role_name?: string;
};

type RoleData = {
  role_no: string;
  role_name: string;
};

export default function UserAdminPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Bottom Sheet State
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [editRoleNo, setEditRoleNo] = useState<string>('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/user-admin/users');
      if (!res.ok) {
        if (res.status === 403) throw new Error('권한이 없습니다.');
        throw new Error('사용자 목록을 불러오는 데 실패했습니다.');
      }
      const data = await res.json();
      setUsers(data.users || []);
      if (data.roles) setRoles(data.roles);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserClick = (user: UserData) => {
    setSelectedUser(user);
    setEditRoleNo(user.role_no || '');
    setIsPopupOpen(true);
  };

  const toggleLockStatus = async () => {
    if (!selectedUser) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/user-admin/users/${selectedUser.user_no}/lock`, {
        method: 'PATCH',
      });
      const data = await res.json();
      
      if (!res.ok) {
        showToast(data.error || '상태 변경 중 오류가 발생했습니다.', 'error');
        return;
      }

      showToast(data.message, 'success');
      setIsPopupOpen(false);
      // Refresh user list
      fetchUsers();
    } catch (err) {
      showToast('서버 오류가 발생했습니다.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !editRoleNo) return;
    if (editRoleNo === selectedUser.role_no) {
      showToast('변경된 역할이 없습니다.', 'info');
      return;
    }
    
    setProcessing(true);
    try {
      const res = await fetch(`/api/user-admin/users/${selectedUser.user_no}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_no: editRoleNo })
      });
      const data = await res.json();
      
      if (!res.ok) {
        showToast(data.error || '역할 변경 중 오류가 발생했습니다.', 'error');
        return;
      }

      showToast(data.message, 'success');
      setIsPopupOpen(false);
      fetchUsers();
    } catch (err) {
      showToast('서버 오류가 발생했습니다.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '미접속';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: '5rem' }}>
      <header className="header" style={{ position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/dashboard" className="text-muted" style={{ padding: '0.25rem', textDecoration: 'none' }}>
            <ChevronLeft size={24} />
          </Link>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>사용자 관리</h1>
        </div>
      </header>

      <main style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Users size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--foreground)' }}>전체 사용자 목록</h2>
          <span style={{ backgroundColor: 'var(--primary)', color: 'white', fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '1rem', fontWeight: 700 }}>
            {users.length}
          </span>
        </div>

        {loading ? (
          <div className="empty-state text-muted">목록을 불러오는 중...</div>
        ) : error ? (
          <div className="empty-state" style={{ color: 'var(--danger)' }}>{error}</div>
        ) : users.length === 0 ? (
          <div className="empty-state text-muted">가입된 사용자가 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {users.map(user => (
              <div 
                key={user.user_no} 
                className="card"
                onClick={() => handleUserClick(user)}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem', 
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Lock Overlay indicating disabled state visually */}
                {user.is_locked && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(243, 244, 246, 0.4)', zIndex: 1, pointerEvents: 'none' }} />
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '2.5rem', height: '2.5rem', borderRadius: '50%', 
                      backgroundColor: user.is_locked ? '#f3f4f6' : 'var(--primary)', 
                      color: user.is_locked ? '#9ca3af' : 'white', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'bold', fontSize: '1.25rem'
                    }}>
                      {user.user_name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: user.is_locked ? 'var(--text-muted)' : 'var(--foreground)' }}>
                          {user.user_name}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{user.user_id}</span>
                        {user.role_name && (
                          <span style={{ 
                            fontSize: '0.65rem', fontWeight: 600, padding: '0.1rem 0.35rem', borderRadius: '0.5rem',
                            backgroundColor: 'white', color: 'var(--primary)', border: '1px solid var(--primary)', marginLeft: '0.25rem'
                          }}>
                            {user.role_name}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                        <span style={{ 
                          fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '0.25rem',
                          backgroundColor: user.is_locked ? '#fee2e2' : '#dcfce7',
                          color: user.is_locked ? '#ef4444' : '#22c55e'
                        }}>
                          {user.is_locked ? '잠금 상태' : '정상'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {user.is_locked ? <Lock size={20} color="#ef4444" /> : <CheckCircle size={20} color="#22c55e" />}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem', zIndex: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <Mail size={14} className="text-muted" />
                    <span className="text-muted">{user.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <Clock size={14} className="text-muted" />
                    <span className="text-muted">최근 접속: {formatDate(user.last_login_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <RollupPopup isOpen={isPopupOpen} onClose={() => setIsPopupOpen(false)}>
        {selectedUser && (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: '3.5rem', height: '3.5rem', borderRadius: '50%', backgroundColor: '#f3f4f6', 
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                {selectedUser.is_locked ? <Unlock size={28} color="#ef4444" /> : <Lock size={28} color="var(--primary)" />}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--foreground)' }}>
                {selectedUser.user_name}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                {selectedUser.user_id} 계정 조작
              </p>
            </div>

            <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                현재 상태: <strong style={{ color: selectedUser.is_locked ? '#ef4444' : '#22c55e' }}>{selectedUser.is_locked ? '잠금됨' : '정상'}</strong>
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {selectedUser.is_locked 
                  ? '이 계정의 잠금을 해제하면 사용자가 즉시 로그인할 수 있게 됩니다.' 
                  : '이 계정을 잠금 처리하면 해당 사용자는 로그인할 수 없게 되며 강제로 차단됩니다.'}
              </p>
            </div>

            {/* Role Assignment UI */}
            {roles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 0.25rem' }}>
                <label className="text-sm font-semibold flex items-center gap-1">
                  <Shield size={16} /> 권한 그룹 설정
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    style={{ 
                      flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', 
                      backgroundColor: 'var(--bg-card)', fontSize: '0.9rem' 
                    }}
                    value={editRoleNo}
                    onChange={(e) => setEditRoleNo(e.target.value)}
                  >
                    <option value="" disabled>역할을 선택하세요</option>
                    {roles.map(r => (
                      <option key={r.role_no} value={r.role_no}>{r.role_name}</option>
                    ))}
                  </select>
                  <Button 
                    variant="primary" 
                    onClick={handleRoleChange} 
                    disabled={processing || !editRoleNo || editRoleNo === selectedUser.role_no}
                  >
                    권한 변경
                  </Button>
                </div>
              </div>
            )}
            
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

            <Button 
              onClick={toggleLockStatus}
              disabled={processing}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                fontWeight: 700,
                backgroundColor: selectedUser.is_locked ? 'var(--foreground)' : '#ef4444',
                color: 'white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {processing ? '처리 중...' : selectedUser.is_locked ? (
                <><Unlock size={18} /> 계정 잠금 해제</>
              ) : (
                <><Lock size={18} /> 강제 잠금 처리</>
              )}
            </Button>
          </div>
        )}
      </RollupPopup>
    </div>
  );
}
