"use client";

import React, { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, MoreHorizontal, RefreshCw, Plus, Edit3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RichEditor } from '@/components/ui/RichEditor';
import { PostCard } from '@/components/ui/PostCard';
import { RollupPopup } from '@/components/ui/RollupPopup';

type BoardInfo = {
  board_no: string;
  title: string;
  content: string;
  user_name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  comment_count: number;
  reaction_count: number;
};

export default function BoardFeedPage({ params }: { params: Promise<{ boardCode: string }> }) {
  const unwrappedParams = use(params);
  const boardCode = unwrappedParams.boardCode;
  const [boards, setBoards] = useState<BoardInfo[]>([]);
  const [boardName, setBoardName] = useState<string>('Board');
  const [currentUser, setCurrentUser] = useState<{ user_id: string; user_name: string; menus?: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  // Editor States
  const [showEditor, setShowEditor] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [posting, setPosting] = useState(false);

  const router = useRouter();

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Pull-to-Refresh States
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow pull-to-refresh if we're exactly at the top of the page
    if (window.scrollY <= 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pullStartY.current || isRefreshing) return;
    
    // Only allow pulling down if we are at the top
    if (window.scrollY > 0) {
      pullStartY.current = 0;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const dy = currentY - pullStartY.current;

    if (dy > 0) {
      // Prevent default scrolling when pulling down
      if (e.cancelable) e.preventDefault();
      
      // Apply friction so it feels elastic (max pull distance approx 80px)
      const distance = Math.min(dy * 0.4, 80);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (!pullStartY.current || isRefreshing) return;
    
    pullStartY.current = 0;
    
    // If pulled more than 60px, trigger refresh
    if (pullDistance > 60) {
      setIsRefreshing(true);
      setPullDistance(60); // lock at 60px while refreshing
      
      setPage(1);
      setHasMore(true);
      loadBoards(1, false).finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else {
      // Revert if not pulled far enough
      setPullDistance(0);
    }
  };

  const loadBoards = async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const [boardsRes, catRes, meRes] = await Promise.all([
        fetch(`/api/boards?boardCode=${boardCode}&page=${pageNum}`),
        fetch('/api/board-categories'),
        fetch('/api/auth/me')
      ]);

      if (boardsRes.status === 401 || catRes.status === 401) {
        router.push('/login');
        return;
      }

      const boardsData = await boardsRes.json();
      const catData = await catRes.json();
      const meData = meRes.ok ? await meRes.json() : null;

      if (boardsData?.boards) {
        if (append) {
          setBoards(prev => [...prev, ...boardsData.boards]);
        } else {
          setBoards(boardsData.boards);
        }
        if (boardsData.boards.length < 10) setHasMore(false);
        else setHasMore(true);
      }

      if (!append && catData?.categories) {
        const currentCat = catData.categories.find((c: any) => c.board_code === boardCode);
        if (currentCat) setBoardName(currentCat.menu_name);
      }

      if (!append && meData?.user) {
        setCurrentUser(meData.user);
      }

    } catch (err) {
      console.error(err);
    } finally {
      if (!append) setLoading(false);
      else setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadBoards(1, false);
  }, [boardCode, router]);

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadBoards(nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page]);

  const handlePost = async () => {
    const rawContent = newContent.replace(/<[^>]*>?/gm, '').trim();
    if (!newTitle.trim() || !rawContent) return;

    setPosting(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: newContent, boardCode }),
      });

      if (!res.ok) {
        if (res.status === 401) router.push('/login');
        throw new Error('Failed to post');
      }

      setNewTitle('');
      setNewContent('');
      setShowEditor(false);
      // Reload from page 1
      setPage(1);
      setHasMore(true);
      await loadBoards(1, false);
      if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  useEffect(() => {
    const handleWindowScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      if (scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };



  return (
    <div 
      className="flex flex-col min-h-screen" 
      style={{ backgroundColor: 'var(--background)' }}
    >
      <header className="header shrink-0" style={{ zIndex: 10 }}>
        <div className="flex items-center gap-3 w-full justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="text-muted" style={{ padding: '0.25rem' }}>
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-bold">{boardName}</h1>
          </div>
          {(currentUser?.menus?.find(m => m.menu_name === '대시보드')?.can_write ?? false) && (
            <button onClick={() => setIsDropdownOpen(true)} className="text-muted" style={{ padding: '0.25rem' }}>
              <MoreHorizontal size={24} />
            </button>
          )}
        </div>
      </header>



      <div
        style={{
          flex: 1,
          position: 'relative',
        }}
      >
        {/* Pull To Refresh Indicator */}
        {pullDistance > 0 && (
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1, // behind the sliding content but within this wrapper
              opacity: Math.min(pullDistance / 60, 1),
            }}
          >
            <RefreshCw 
              size={24} 
              className={`text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} 
              style={{ 
                transform: isRefreshing ? 'none' : `rotate(${pullDistance * 2}deg)` 
              }} 
            />
          </div>
        )}

        <div
          ref={scrollRef}
          className="p-4 flex flex-col gap-4 bottom-padding"
          style={{
            transform: `translateY(${pullDistance}px)`,
            transition: isRefreshing || pullStartY.current === 0 ? 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
            position: 'relative',
            zIndex: 2, // above the spinner
            minHeight: '100%',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >

        {loading && page === 1 ? (
          <div className="p-6 text-center text-muted mt-8">게시물을 불러오는 중입니다...</div>
        ) : boards.length === 0 ? (
          <div className="text-center text-muted mt-8">작성된 글이 없습니다.</div>
        ) : (
          boards.map((board) => (
            <PostCard key={board.board_no} board={board} currentUser={currentUser} />
          ))
        )}

        {/* Infinite Scroll Trigger */}
        {hasMore && (
          <div ref={observerTarget} className="h-10 flex items-center justify-center text-muted text-sm py-4">
            {loadingMore ? '더 불러오는 중...' : ''}
          </div>
        )}
        {!hasMore && boards.length > 0 && (
          <div className="text-center text-muted text-sm py-6">모든 게시물을 확인했습니다.</div>
        )}
        </div>
      </div>

      {/* Fixed Scroll To Top Button Wrapper */}
      <div
        className="z-50"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: '9rem', /* Positioned above the FAB button */
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'flex-end',
          paddingRight: '1.5rem',
          pointerEvents: 'none'
        }}
      >
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="animate-fade-in shadow-lg"
            style={{
              pointerEvents: 'auto',
              width: '3.5rem',
              height: '3.5rem',
              borderRadius: '50%',
              backgroundColor: 'white',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            title="최상단으로 이동"
          >
            <span style={{ fontSize: '1.25rem', lineHeight: 1, fontWeight: 'bold' }}>↑</span>
          </button>
        )}
      </div>
      {/* Fullscreen Post Creator Modal */}
      {showEditor && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: '#f3f4f6', display: 'flex', flexDirection: 'column' }}>
          <header className="header shrink-0 bg-white" style={{ zIndex: 110 }}>
            <div className="flex items-center gap-3 w-full">
              <button onClick={() => setShowEditor(false)} className="text-muted" style={{ padding: '0.25rem' }}>
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-xl font-bold flex-1">새로운 글 작성</h1>
              <div style={{ width: 24 }} />
            </div>
          </header>
          
          <div className="p-4 flex-1 overflow-auto flex flex-col gap-4 max-w-3xl w-full mx-auto" style={{ backgroundColor: 'white', marginTop: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <input
              placeholder="제목을 입력하세요"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="form-input"
              style={{ fontWeight: 'bold', fontSize: '1.25rem', height: '3.5rem', border: 'none', borderBottom: '1px solid var(--border-color)', borderRadius: '0', padding: '0.5rem 0' }}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
              <RichEditor
                value={newContent}
                onChange={setNewContent}
                placeholder="내용을 작성해주세요..."
              />
            </div>
          </div>

          {/* Fixed Bottom Action Button for Editor */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)', borderTop: '1px solid var(--border-color)', zIndex: 120, display: 'flex', justifyContent: 'center', boxShadow: '0 -10px 20px -10px rgba(0,0,0,0.05)', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <Button 
              onClick={handlePost}
              disabled={posting || !newTitle.trim() || newContent === '<p><br></p>' || !newContent}
              className="btn btn-primary"
              style={{ width: '100%', maxWidth: '42rem', height: '3.5rem', fontSize: '1rem', fontWeight: 'bold', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(91, 95, 199, 0.2)' }}
            >
              {posting ? '게시 중...' : '게시글 등록하기'}
            </Button>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) and Menu */}
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
            <button 
              onClick={() => {
                setShowFabMenu(false);
                setShowEditor(true);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', color: 'var(--foreground)', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
            >
              <span>새글쓰기</span>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Edit3 size={16} color="var(--primary)" />
              </div>
            </button>
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

      {/* Board Options RollupPopup */}
      <RollupPopup isOpen={isDropdownOpen} onClose={() => setIsDropdownOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <button 
            className="w-full text-left font-medium p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-foreground flex items-center transition-colors"
            onClick={() => { setIsDropdownOpen(false); router.push(`/menus/${boardCode}/edit`); }}
          >
            <div className="flex items-center gap-2">
              <Settings size={18} />
              <span>게시판 수정</span>
            </div>
          </button>
        </div>
      </RollupPopup>

    </div>
  );
}
