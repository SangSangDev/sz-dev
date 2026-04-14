"use client";

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type DetailedBoard = {
  board_no: string;
  title: string;
  content: string;
  user_name: string;
  created_at: string;
};

type Comment = {
  comment_no: string;
  user_name: string;
  content: string;
  created_at: string;
};

type Reaction = {
  reaction_no: string;
  user_id: string;
  emotion: string;
};

const EMOTIONS = [
  { value: 'LIKE', icon: '👍', label: 'Like' },
  { value: 'HEART', icon: '❤️', label: 'Heart' },
  { value: 'LAUGH', icon: '😂', label: 'Laugh' },
  { value: 'SURPRISE', icon: '😮', label: 'Surprise' },
];

export default function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const unwrappedParams = use(params);
  const postId = unwrappedParams.postId;
  const router = useRouter();

  const [board, setBoard] = useState<DetailedBoard | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{user_id: string} | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.ok ? res.json() : null).then(data => {
      if(data?.user) setCurrentUser(data.user);
    });

    const loadData = async () => {
      try {
        const [boardRes, commentRes, reactRes] = await Promise.all([
          fetch(`/api/boards/${postId}`),
          fetch(`/api/boards/${postId}/comments`),
          fetch(`/api/boards/${postId}/reactions`),
        ]);

        if (boardRes.status === 401) { router.push('/login'); return; }

        const boardData = await boardRes.json();
        const commentData = await commentRes.json();
        const reactData = await reactRes.json();

        if (boardData.board) setBoard(boardData.board);
        if (commentData.comments) setComments(commentData.comments);
        if (reactData.reactions) setReactions(reactData.reactions);
        
        setLoading(false);
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, [postId, router]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await fetch(`/api/boards/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });
      setNewComment('');
      
      const commentRes = await fetch(`/api/boards/${postId}/comments`);
      const data = await commentRes.json();
      if(data.comments) setComments(data.comments);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleReaction = async (emotion: string) => {
    try {
      await fetch(`/api/boards/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotion }),
      });
      
      const reactRes = await fetch(`/api/boards/${postId}/reactions`);
      const data = await reactRes.json();
      if(data.reactions) setReactions(data.reactions);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-6 text-center text-muted">Loading post...</div>;
  if (!board) return <div className="p-6 text-center text-muted">Post not found.</div>;

  const reactSummary = reactions.reduce((acc, r) => {
    acc[r.emotion] = (acc[r.emotion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <header className="header">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted" style={{ padding: '0.25rem' }}>
            <ArrowLeft size={24} />
          </button>
          <span className="font-semibold px-2">Thread</span>
        </div>
      </header>

      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="avatar">
            {board.user_name.charAt(0)}
          </div>
          <div>
            <div className="font-bold">{board.user_name}</div>
            <div className="text-sm text-muted">{new Date(board.created_at).toLocaleString()}</div>
          </div>
        </div>

        <h1 className="text-xl font-bold mb-4" style={{ lineHeight: '1.4' }}>{board.title}</h1>
        <div 
          className="mb-8 post-content"
          style={{ fontSize: '1rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          dangerouslySetInnerHTML={{ __html: board.content }}
        />
        <style jsx global>{`
          .post-content img {
            max-width: 100%;
            height: auto;
            border-radius: 0.5rem;
            margin: 1rem 0;
          }
        `}</style>

        {/* Reaction Bar */}
        <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '0.75rem 0', marginBottom: '1.5rem' }}>
          <div className="flex gap-2 no-scrollbar" style={{ overflowX: 'auto', padding: '0 0.25rem' }}>
            {EMOTIONS.map(e => {
              const isActive = currentUser && reactions.some(r => r.user_id === currentUser.user_id && r.emotion === e.value);
              const count = reactSummary[e.value] || 0;
              return (
                <button 
                  key={e.value}
                  onClick={() => handleToggleReaction(e.value)}
                  className={`reaction-btn ${isActive ? 'active' : ''}`}
                >
                  <span style={{ fontSize: '1rem' }}>{e.icon}</span>
                  {count > 0 && <span>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comments Section */}
        <div>
          <h3 className="font-bold flex items-center gap-2 mb-4">
            <MessageCircle size={18} />
            Comments ({comments.length})
          </h3>
          
          <div className="flex flex-col gap-4">
            {comments.map(c => (
              <div key={c.comment_no} className="flex gap-3">
                <div className="avatar" style={{width: '2rem', height: '2rem', fontSize: '0.875rem', backgroundColor: 'var(--border-color)', color: 'var(--foreground)'}}>
                  {c.user_name.charAt(0)}
                </div>
                <div className="comment-bubble">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm">{c.user_name}</span>
                    <span className="text-muted" style={{ fontSize: '0.625rem' }}>{new Date(c.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm" style={{ lineHeight: '1.4' }}>{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleAddComment} className="comment-input-bar">
        <Input 
          placeholder="Write a comment..." 
          style={{ borderRadius: '9999px' }}
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
        />
        <Button size="icon" type="submit" disabled={!newComment.trim()} style={{ borderRadius: '9999px' }}>
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
}
