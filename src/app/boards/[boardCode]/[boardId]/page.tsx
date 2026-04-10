"use client";

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PostCard } from '@/components/ui/PostCard';

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

export default function SinglePostPage({ params }: { params: Promise<{ boardCode: string, boardId: string }> }) {
  const unwrappedParams = use(params);
  const boardCode = unwrappedParams.boardCode;
  const boardId = unwrappedParams.boardId;

  const [board, setBoard] = useState<BoardInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<{ user_id: string; user_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, boardRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch(`/api/boards/${boardId}`)
        ]);

        if (meRes.ok) {
          const data = await meRes.json();
          if (data?.user) setCurrentUser(data.user);
        }

        if (boardRes.ok) {
          const data = await boardRes.json();
          if (data?.board) {
            setBoard(data.board);
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [boardCode, boardId]);

  if (loading) {
    return (
      <div className="flex flex-col h-full relative" style={{ backgroundColor: 'var(--background)' }}>
        <header className="header shrink-0" style={{ zIndex: 10, backgroundColor: 'var(--card-bg)' }}>
          <button onClick={() => router.back()} className="mr-3 text-text-muted hover:text-text p-1">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">게시글 보기</h1>
        </header>
        <div className="p-8 text-center text-text-muted">로딩 중...</div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="flex flex-col h-full relative" style={{ backgroundColor: 'var(--background)' }}>
        <header className="header shrink-0" style={{ zIndex: 10, backgroundColor: 'var(--card-bg)', justifyContent: 'flex-start' }}>
          <button onClick={() => router.back()} className="mr-3 text-text-muted hover:text-text p-1">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">게시글 보기</h1>
        </header>
        <div className="p-8 text-center text-text-muted">
          게시글을 찾을 수 없거나 접근 권한이 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative" style={{ backgroundColor: 'var(--background)' }}>
      <header className="header shrink-0" style={{ zIndex: 10, backgroundColor: 'var(--card-bg)', justifyContent: 'flex-start' }}>
        <button onClick={() => router.back()} className="mr-3 text-text-muted hover:text-text p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">게시글 보기</h1>
      </header>

      <div style={{ flex: 1, position: 'relative', overflowY: 'auto' }}>
        <div className="p-4" style={{ minHeight: '100%', paddingBottom: '5rem' }}>
          {/* We artificially expand the post postcard on isolated load */}
          <PostCard board={board} currentUser={currentUser} defaultExpanded={true} />
        </div>
      </div>
    </div>
  );
}
