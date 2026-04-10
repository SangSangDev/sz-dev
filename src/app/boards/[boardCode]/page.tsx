"use client";

import React, { useEffect, useState, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, MoreHorizontal, RefreshCw, Plus, Edit3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RichEditor } from '@/components/ui/RichEditor';
import { PostCard } from '@/components/ui/PostCard';
import { RollupPopup } from '@/components/ui/RollupPopup';
import { FabMenu, FabMenuItem } from '@/components/ui/FabMenu';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [posting, setPosting] = useState(false);

  const router = useRouter();

  // Scroll Lock for Editor Modal
  useEffect(() => {
    if (showEditor) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showEditor]);

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
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: '9.5rem', /* Positioned above the FAB button */
          zIndex: 50,
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
              backgroundColor: 'var(--border-color)',
              color: 'var(--foreground)',
              border: '1px solid var(--text-muted)',
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
      {/* Floating Centered Post Creator Modal */}
      {showEditor && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '1rem' }}>

          {/* Inner Modal Card */}
          <div className="mx-auto" style={{ position: 'relative', backgroundColor: 'var(--card-bg)', width: '100%', maxWidth: '42rem', height: '85vh', borderRadius: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>

            <header className="shrink-0 pt-4 px-4 border-b" style={{ borderColor: 'var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={() => setShowEditor(false)} className="text-muted"><ArrowLeft size={24} /></button>
              <h1 className="text-xl font-bold flex-1 text-center">새로운 글 작성</h1>
              <div style={{ width: 24 }} />
            </header>

            <div className="flex-1 overflow-auto p-4 flex flex-col gap-4" style={{ paddingBottom: '6rem' }}>
              <input
                placeholder="제목을 입력하세요"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="form-input"
                style={{ fontWeight: 'bold', fontSize: '1.25rem', height: '3.5rem', border: 'none', borderBottom: '1px solid var(--border-color)', borderRadius: '0', padding: '0.5rem 0', backgroundColor: 'transparent', color: 'var(--foreground)' }}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                <RichEditor
                  value={newContent}
                  onChange={setNewContent}
                  placeholder="내용을 작성해주세요..."
                />
              </div>
            </div>

            <div className="p-4 border-t" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderColor: 'var(--border-color)', display: 'flex', justifyContent: 'center', backgroundColor: 'var(--card-bg)', zIndex: 10 }}>
              <Button
                onClick={handlePost}
                disabled={posting || !newTitle.trim() || newContent === '<p><br></p>' || !newContent}
                className="btn btn-primary"
                style={{ width: '100%', height: '3.5rem', fontSize: '1rem', fontWeight: 'bold', borderRadius: '1rem' }}
              >
                {posting ? '게시 중...' : '게시글 등록하기'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) and Menu */}
      <FabMenu>
        <FabMenuItem
          onClick={() => setShowEditor(true)}
          label="새글쓰기"
          icon={<Edit3 size={16} color="var(--primary)" />}
        />
      </FabMenu>

      {/* Board Options RollupPopup */}
      <RollupPopup isOpen={isDropdownOpen} onClose={() => setIsDropdownOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <button
            className="w-full text-left font-medium p-3 rounded-lg flex items-center transition-colors"
            style={{ color: 'var(--foreground)' }}
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
