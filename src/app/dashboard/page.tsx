"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Lock, Folder, FileText, RefreshCw, MoreHorizontal, Check, ChevronUp, ChevronDown, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RollupPopup } from '@/components/ui/RollupPopup';

type CategoryInfo = {
  menu_no: string;
  menu_name: string;
  board_code: string;
  is_public: string;
  created_at: string;
  has_access: boolean;
  post_count: number;
  has_new: boolean;
};

export default function DashboardPage() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasWritePermission, setHasWritePermission] = useState(false);
  const router = useRouter();

  // Sort State
  const [showSortModal, setShowSortModal] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // FAB Menu States
  const [showFabMenu, setShowFabMenu] = useState(false);

  // Pull-to-Refresh States
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = React.useRef(0);

  const fetchCategories = async () => {
    try {
      const [catRes, meRes] = await Promise.all([
        fetch('/api/board-categories'),
        fetch('/api/auth/me')
      ]);

      if (catRes.status === 401 || meRes.status === 401) {
        router.push('/login');
        return;
      }
      
      const data = await catRes.json();
      if (data && data.categories) {
        setCategories(data.categories);
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData?.user?.menus) {
          // Find '대시보드' menu and check can_write
          const dashboardMenu = meData.user.menus.find((m: any) => m.menu_name === '대시보드');
          if (dashboardMenu?.can_write) {
            setHasWritePermission(true);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [router]);

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCategories.length) return;
    
    // Swap
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;
    
    setCategories(newCategories);
  };
  
  const saveCategoryOrder = async () => {
    setSavingOrder(true);
    const updates = categories.map((c, idx) => ({ menu_no: c.menu_no, board_sort: idx + 1 }));
    try {
      const res = await fetch('/api/board-categories/sort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      if (res.ok) {
        setIsReordering(false);
        fetchCategories(); // Reload the pristine data state
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingOrder(false);
    }
  };

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
      fetchCategories().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bottom-padding">
      {isReordering ? (
        <header className="header">
          <h1 className="text-lg font-bold text-primary">순서 편집 모드</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setIsReordering(false); fetchCategories(); }}>취소</Button>
            <Button variant="primary" size="sm" disabled={savingOrder} onClick={saveCategoryOrder}>
              {savingOrder ? '저장중...' : '저장'}
            </Button>
          </div>
        </header>
      ) : (
        <header className="header">
          <h1 className="text-xl font-bold">대시보드</h1>
          {hasWritePermission && (
            <button 
              onClick={() => setShowSortModal(true)} 
              className="text-muted hover:text-foreground p-2"
            >
              <MoreHorizontal size={24} />
            </button>
          )}
        </header>
      )}

      <div
        style={{ flex: 1, position: 'relative' }}
      >
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
          className="p-4 flex flex-col gap-3"
          style={{
            flex: 1, overflowY: 'auto',
            transform: `translateY(${pullDistance}px)`,
            transition: isRefreshing || pullStartY.current === 0 ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
            position: 'relative', zIndex: 2, minHeight: '100%',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {loading ? (
            <div className="p-6 text-center text-muted">로딩 중...</div>
          ) : categories.length === 0 ? (
            <div className="text-center text-muted mt-4">게시판이 없습니다. + 버튼을 눌러 추가하세요.</div>
          ) : (
            categories.map((cat, idx) => {
              const isPrivate = cat.is_public === 'N';           // 비공개 여부 (아이콘/배지용)
              const isLocked = isPrivate && !cat.has_access;    // 접근 차단 여부 (링크 막기용)

              const content = (
                <div className="list-card" style={{ justifyContent: 'space-between' }}>
                  {/* Left: Icon + Name + Badge */}
                  <div className="flex items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      backgroundColor: isPrivate ? 'var(--text-muted)' : 'var(--primary)',
                      color: 'white',
                      padding: '0.625rem',
                      borderRadius: '0.625rem',
                      flexShrink: 0,
                    }}>
                      {isPrivate ? <Lock size={20} /> : <Folder size={20} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold" style={{
                          fontSize: '0.975rem',
                          lineHeight: '1.3',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {cat.menu_name}

                        </h2>
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          backgroundColor: !isPrivate ? 'rgba(91,95,199,0.12)' : 'rgba(107,114,128,0.12)',
                          color: !isPrivate ? 'var(--primary)' : 'var(--text-muted)',
                          borderRadius: '9999px',
                          padding: '0.15rem 0.5rem',
                          flexShrink: 0,
                        }}>
                          {!isPrivate ? '공개' : '비공개'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {isReordering ? (
                    <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveCategory(idx, 'up'); }} 
                        disabled={idx === 0}
                        className={`p-2 rounded ${idx === 0 ? 'text-gray-300' : 'text-primary hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
                      >
                       <ChevronUp size={24} />
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveCategory(idx, 'down'); }} 
                        disabled={idx === categories.length - 1}
                        className={`p-2 rounded ${idx === categories.length - 1 ? 'text-gray-300' : 'text-primary hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
                      >
                       <ChevronDown size={24} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {cat.has_new && (
                        <span style={{ backgroundColor: '#ef4444', color: 'white', fontSize: '0.6rem', padding: '0.2rem 0.3rem', borderRadius: '0.25rem', fontWeight: 800, marginLeft: '0.4rem', marginRight: '0.5rem' }}>
                          N
                        </span>
                      )}
                      {/* Right: Post count */}
                      <div className="flex items-center gap-1 text-muted" style={{ flexShrink: 0 }}>
                        <FileText size={14} />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{cat.post_count}</span>
                      </div>
                    </div>
                  )}
                </div>
              );

              if (isLocked) {
                return (
                  <div key={cat.menu_no} title="비공개 게시판">
                    {content}
                  </div>
                );
              }

              return (
                <Link key={cat.menu_no} href={`/boards/${cat.board_code}`} className="block">
                  {content}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) and Menu - Only show if user has write permission */}
      {hasWritePermission && (
        <>
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
              bottom: '5rem',
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
                <Link 
                  href="/menus/create"
                  onClick={() => setShowFabMenu(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', color: 'var(--foreground)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}
                >
                  <span>새 게시판 만들기</span>
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Folder size={16} color="var(--primary)" />
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
        </>
      )}

      {/* Manage Sort Menu Modal */}
      <RollupPopup isOpen={showSortModal} onClose={() => setShowSortModal(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <button 
            className="w-full text-left font-medium p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-foreground flex items-center justify-between transition-colors"
            onClick={() => { setShowSortModal(false); setIsReordering(true); }}
          >
            <div className="flex items-center gap-2">
              <Settings2 size={18} />
              <span>대시보드 순서 편집</span>
            </div>
          </button>
        </div>
      </RollupPopup>
    </div>
  );
}
