"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Heart, Send, ExternalLink, Minimize2, Edit2, Save, X, Plus, Minus, MoreHorizontal, Maximize2, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { RichEditor } from '@/components/ui/RichEditor';
import { ReactionBar, Reaction, EMOTIONS } from '@/components/ui/ReactionBar';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
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

type Comment = {
  comment_no: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  updated_at: string;
  reactions?: Reaction[];
};

const formatRelativeTime = (dateString: string) => {
  const diffMs = new Date().getTime() - new Date(dateString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffMin < 1) return '방금 전';
  if (diffHour < 1) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;

  return new Date(dateString).toLocaleDateString();
};

interface PostCardProps {
  board: BoardInfo;
  currentUser: { user_id: string; user_name: string } | null;
  defaultExpanded?: boolean;
}

export function PostCard({ board, currentUser, defaultExpanded = false }: PostCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Comments Infinite Scroll States
  const [commentsPage, setCommentsPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll Lock for Edit Modal
  useEffect(() => {
    if (isEditing) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isEditing]);

  const [showPostOptions, setShowPostOptions] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Comment Actions & Delete State
  const [activeCommentModalId, setActiveCommentModalId] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // Live content (for immediate update without reloading parent)
  const [liveTitle, setLiveTitle] = useState(board.title);
  const [liveContent, setLiveContent] = useState(board.content);
  const [liveUpdatedAt, setLiveUpdatedAt] = useState(board.updated_at);

  // Reaction Summary
  const [localReactCount, setLocalReactCount] = useState(board.reaction_count);
  const [localCommentCount, setLocalCommentCount] = useState(board.comment_count);

  const fetchDetails = async () => {
    if (hasLoaded) return;
    setLoadingDetails(true);
    try {
      const [commentRes, reactRes] = await Promise.all([
        fetch(`/api/boards/${board.board_no}/comments?page=1`),
        fetch(`/api/boards/${board.board_no}/reactions`),
      ]);
      const commentData = await commentRes.json();
      const reactData = await reactRes.json();

      if (commentData.comments) {
        setComments(commentData.comments);
        setHasMoreComments(commentData.comments.length === 10);
        setCommentsPage(1);
        setLocalCommentCount(commentData.comments.length); // Assuming we don't have total count, but this helps. Wait, the API doesn't return total.
      }
      if (reactData.reactions) {
        setReactions(reactData.reactions);
        setLocalReactCount(reactData.reactions.length);
      }
      setHasLoaded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Real-time Event Listener for the Board & Comments Reactions
  useEffect(() => {
    if (!isExpanded) return;

    let eventSource: EventSource | null = null;
    let fallbackTimer: NodeJS.Timeout;

    const connectSSE = () => {
      eventSource = new EventSource(`/api/boards/${board.board_no}/stream`);

      eventSource.onmessage = (event) => {
        if (!event.data) return;
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'REACTION_UPDATE') {
            // Ignore events generated by ourselves if we already optimistically updated
            if (currentUser?.user_id === payload.user_id) return;

            if (payload.targetType === 'COMMENT') {
              setComments(prev => prev.map(c => {
                if (c.comment_no === payload.targetId) {
                  const currentReactions = [...(c.reactions || [])];
                  const existingIndex = currentReactions.findIndex(r => r.user_id === payload.user_id);

                  if (payload.action === 'ADD') {
                    if (existingIndex > -1) {
                      currentReactions[existingIndex].emotion = payload.emotion;
                    } else {
                      currentReactions.push({ user_id: payload.user_id, emotion: payload.emotion });
                    }
                  } else if (payload.action === 'REMOVE') {
                    if (existingIndex > -1) currentReactions.splice(existingIndex, 1);
                  }

                  return { ...c, reactions: currentReactions };
                }
                return c;
              }));
            } else if (payload.targetType === 'BOARD') {
              setReactions(prev => {
                const newReactions = [...prev];
                const existingIndex = newReactions.findIndex(r => r.user_id === payload.user_id);
                let delta = 0;
                if (payload.action === 'ADD') {
                  if (existingIndex > -1) {
                    newReactions[existingIndex].emotion = payload.emotion;
                  } else {
                    newReactions.push({ user_id: payload.user_id, emotion: payload.emotion });
                    delta = 1;
                  }
                } else if (payload.action === 'REMOVE') {
                  if (existingIndex > -1) {
                    newReactions.splice(existingIndex, 1);
                    delta = -1;
                  }
                }
                setLocalReactCount(c => Math.max(0, c + delta));
                return newReactions;
              });
            }
          }
        } catch (e) {
          // ignore parse errors for ping
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        fallbackTimer = setTimeout(connectSSE, 5000); // Reconnect after 5s
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      clearTimeout(fallbackTimer);
    };
  }, [isExpanded, board.board_no, currentUser]);

  const loadMoreComments = useCallback(async () => {
    if (loadingMoreComments || !hasMoreComments) return;
    setLoadingMoreComments(true);
    try {
      const nextPage = commentsPage + 1;
      const res = await fetch(`/api/boards/${board.board_no}/comments?page=${nextPage}`);
      const data = await res.json();
      if (data.comments) {
        setComments(prev => [...prev, ...data.comments]);
        setHasMoreComments(data.comments.length === 10);
        setCommentsPage(nextPage);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMoreComments(false);
    }
  }, [commentsPage, loadingMoreComments, hasMoreComments, board.board_no]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMoreComments) {
          loadMoreComments();
        }
      },
      { threshold: 0.5 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [loadMoreComments, hasMoreComments]);

  const handleToggleExpand = () => {
    if (isEditing) return; // Prevent collapse if currently editing
    if (!isExpanded) {
      fetchDetails();
    }
    setIsExpanded(!isExpanded);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/boards/${board.board_no}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content: editContent })
      });
      if (res.ok) {
        setLiveTitle(editTitle);
        setLiveContent(editContent);
        setLiveUpdatedAt(new Date().toISOString());
        setIsEditing(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await fetch(`/api/boards/${board.board_no}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment }),
      });
      setNewComment('');
      setIsAddingComment(false);

      const commentRes = await fetch(`/api/boards/${board.board_no}/comments?page=1`);
      const data = await commentRes.json();
      if (data.comments) {
        setComments(data.comments);
        setHasMoreComments(data.comments.length === 10);
        setCommentsPage(1);
        setLocalCommentCount(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editingCommentContent.trim()) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingCommentContent })
      });
      if (res.ok) {
        setComments(prev => prev.map(c => c.comment_no === commentId ? { ...c, content: editingCommentContent, updated_at: new Date().toISOString() } : c));
        setEditingCommentId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCommentReaction = async (commentId: string, emotion: string) => {
    if (!currentUser) return;

    // Optimistic update
    setComments(prev => prev.map(c => {
      if (c.comment_no !== commentId) return c;
      const existing = c.reactions?.find(r => r.user_id === currentUser.user_id);
      let newReactions = c.reactions || [];
      if (existing) {
        if (existing.emotion === emotion) {
          newReactions = newReactions.filter(r => r.user_id !== currentUser.user_id);
        } else {
          newReactions = [...newReactions.filter(r => r.user_id !== currentUser.user_id), { user_id: currentUser.user_id, emotion }];
        }
      } else {
        newReactions = [...newReactions, { user_id: currentUser.user_id, emotion }];
      }
      return { ...c, reactions: newReactions };
    }));

    setActiveCommentModalId(null);

    try {
      await fetch(`/api/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotion, board_no: board.board_no })
      });
    } catch (err) { console.error(err); }
  };

  const handleBoardReaction = async (emotion: string) => {
    if (!currentUser) return;

    // Optimistic update
    setReactions(prev => {
      let newReactions = [...prev];
      const existingIndex = newReactions.findIndex(r => r.user_id === currentUser.user_id);

      let delta = 0;
      if (existingIndex > -1) {
        if (newReactions[existingIndex].emotion === emotion) {
          newReactions.splice(existingIndex, 1);
          delta = -1;
        } else {
          newReactions[existingIndex].emotion = emotion;
        }
      } else {
        newReactions.push({ user_id: currentUser.user_id, emotion });
        delta = 1;
      }
      setLocalReactCount(c => Math.max(0, c + delta));
      return newReactions;
    });

    setShowPostOptions(false); // Close rollup popup

    try {
      await fetch(`/api/boards/${board.board_no}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotion })
      });
    } catch (err) { console.error(err); }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    try {
      const res = await fetch(`/api/comments/${commentToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.comment_no !== commentToDelete));
        setLocalCommentCount(prev => Math.max(0, prev - 1));
        window.dispatchEvent(new CustomEvent('show_toast', { detail: { message: '댓글이 삭제되었습니다.', type: 'info' } }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentToDelete(null);
    }
  };

  const isAuthor = currentUser?.user_id === board.user_id;
  const isEdited = new Date(liveUpdatedAt).getTime() - new Date(board.created_at).getTime() > 1000;
  const [boardToDelete, setBoardToDelete] = useState<boolean>(false);

  const handleDeleteBoard = async () => {
    try {
      const res = await fetch(`/api/boards/${board.board_no}`, { method: 'DELETE' });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('show_toast', { detail: { message: '게시글이 삭제되었습니다.', type: 'info' } }));
        window.location.reload(); // Quick refresh to update the list since we don't have onDelete prop hooked up globally
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="card bg-card" style={{ transition: 'all 0.3s ease', padding: 0, overflow: 'hidden', borderBottom: '1px solid var(--border-color)' }}>
      <div
        onClick={!isExpanded && !isEditing ? handleToggleExpand : undefined}
        style={{ padding: '1rem', cursor: !isExpanded && !isEditing ? 'pointer' : 'default', backgroundColor: isExpanded ? 'var(--post-expansion-bg)' : 'transparent', borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none' }}
      >
        <div
          className="flex justify-between items-start mb-2"
          onClick={(e) => {
            if (!isEditing) {
              e.stopPropagation();
              handleToggleExpand();
            }
          }}
          style={{ cursor: !isEditing ? 'pointer' : 'default', margin: '-1rem -1rem 0 -1rem', padding: '1rem 1rem 0.5rem 1rem' }}
        >
          <div className="flex items-center gap-2">
            <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '10px' }}>{board.user_name.charAt(0)}</div>
            <span className="font-semibold text-sm">{board.user_name}</span>
          </div>
          <div className="flex items-center gap-2 relative">
            <button
              className="text-muted hover:text-foreground p-1 rounded hover:bg-gray-200 transition-colors flex items-center gap-1 text-xs font-semibold"
              onClick={(e) => e.stopPropagation()} /* Parent handles click */
              style={{ pointerEvents: 'none' }} /* Let click pass to parent visually although e.stop is there if they manage it */
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        <>
          <h2 className="text-lg font-bold leading-tight" style={{ margin: 0, padding: 0, paddingBottom: 0, marginBottom: 0, lineHeight: '1.2' }}>
            {liveTitle}
          </h2>
          <div className="flex justify-between items-center mb-3" style={{ marginTop: '0.25rem' }}>
            <div className="text-xs text-muted flex items-center gap-2">
              <span>{formatRelativeTime(isEdited ? liveUpdatedAt : board.created_at)}</span>
              {isEdited && <span className="font-semibold">(편집됨)</span>}
            </div>
          </div>
        </>

        {/* If not expanded, show truncated summary removing HTML tags safely */}
        {!isExpanded && (
          <>
            <div
              className="text-sm text-muted mb-4 border-t border-border pt-4"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              dangerouslySetInnerHTML={{ __html: liveContent.replace(/<[^>]+>/g, ' ') }}
            />
            <div className="flex justify-between text-muted mt-2 border-t border-gray-100 pt-3">
              <div className="flex gap-4">
                <div className="flex items-center gap-1 font-semibold text-sm opacity-80">
                  <MessageCircle size={16} />
                  <span>{localCommentCount}</span>
                </div>
                <div className="flex items-center gap-1 font-semibold text-sm opacity-80">
                  <Heart size={16} />
                  <span>{localReactCount}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 2) Expanded View Area */}
      {isExpanded && (
        <div className="animate-fade-in" style={{ padding: '1rem' }}>

          {/* Full Content */}
          <div className="mb-8">
            <div
              className="post-content ProseMirror"
              style={{ fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--foreground)' }}
              dangerouslySetInnerHTML={{ __html: liveContent }}
            />

            {/* Board Reactions rendered at the bottom of the post content inline with options */}
            <div className="mt-6 border-t border-gray-100 pt-4 flex items-center justify-end gap-1">
              <div style={{ flex: 1 }}>
                <ReactionBar
                  targetType="BOARD"
                  targetId={board.board_no}
                  initialReactions={reactions}
                  currentUser={currentUser}
                  onReactionsChange={(newReactions) => {
                    setReactions(newReactions);
                  }}
                />
              </div>
              {isExpanded && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPostOptions(true);
                  }}
                  className="text-muted hover:text-foreground p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <MoreHorizontal size={20} />
                </button>
              )}
            </div>
          </div>

          {/* Comments Section and Close Button (Integrated into bottom dark area) */}
          <div style={{ backgroundColor: 'var(--post-expansion-bg)', padding: '1rem 1rem 0.5rem 1rem', marginLeft: '-1rem', marginRight: '-1rem', marginBottom: '-1rem', borderTop: '1px solid var(--border-color)', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem' }}>
            {loadingDetails && <div className="text-center text-muted text-sm my-4">댓글 및 반응 불러오는 중...</div>}

            {!loadingDetails && (
              <div>
                <h3 className="font-bold flex items-center gap-2 mb-4 text-sm">
                  <MessageCircle size={16} />
                  댓글 ({comments.length})
                </h3>

                <div className="flex flex-col gap-4 mb-4" style={{ maxHeight: '18rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {comments.length === 0 ? (
                    <div className="text-center text-muted text-sm py-2">첫 댓글을 작성해보세요.</div>
                  ) : (
                    <>
                      {comments.map(c => (
                        <div key={c.comment_no} className="flex gap-3">
                          <div className="avatar" style={{ width: '2rem', height: '2rem', fontSize: '0.875rem', backgroundColor: 'var(--border-color)', color: 'var(--foreground)' }}>
                            {c.user_name.charAt(0)}
                          </div>
                          <div className="comment-bubble" style={{ flex: 1, position: 'relative', marginBottom: '0.75rem' }}>
                            <div className="flex justify-between items-start mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{c.user_name}</span>
                                <span className="text-muted flex items-center gap-1" style={{ fontSize: '0.625rem' }}>
                                  {formatRelativeTime((c.updated_at && new Date(c.updated_at).getTime() - new Date(c.created_at).getTime() > 1000) ? c.updated_at : c.created_at)}
                                  {(c.updated_at && new Date(c.updated_at).getTime() - new Date(c.created_at).getTime() > 1000) && <span className="font-semibold">(편집됨)</span>}
                                </span>
                              </div>
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCommentModalId(c.comment_no);
                                  }}
                                  className="text-muted hover:text-foreground pl-1 p-1"
                                >
                                  <MoreHorizontal size={18} />
                                </button>
                              </div>
                            </div>

                            <p className="text-sm" style={{ lineHeight: '1.4', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{c.content}</p>

                            <div className="absolute right-4" style={{ bottom: '-0.75rem' }}>
                              <ReactionBar
                                targetType="COMMENT"
                                targetId={c.comment_no}
                                initialReactions={c.reactions || []}
                                currentUser={currentUser}
                                onReactionsChange={(newReactions) => {
                                  setComments(prev => prev.map(comment =>
                                    comment.comment_no === c.comment_no
                                      ? { ...comment, reactions: newReactions }
                                      : comment
                                  ));
                                }}
                              />
                            </div>

                          </div>
                        </div>
                      ))}
                      {/* Infinite Scroll Trigger for Comments */}
                      {hasMoreComments && (
                        <div ref={observerTarget} className="text-center text-sm text-muted py-2">
                          {loadingMoreComments ? '더 불러오는 중...' : '스크롤하여 더 보기'}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Comment Input Bar (Triggers Modal) */}
                <div
                  onClick={() => setIsAddingComment(true)}
                  className="flex items-center gap-2 p-2 px-4 rounded-full cursor-pointer transition-colors"
                  style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
                >
                  <span className="text-sm flex-1 text-left text-muted">댓글 입력...</span>
                  <Button size="icon" variant="ghost" disabled style={{ borderRadius: '50%', width: '30px', height: '30px', flexShrink: 0 }}>
                    <Send size={14} className="text-muted" />
                  </Button>
                </div>
              </div>
            )}

            {/* Close expanded view button inside */}
            <div className="mt-3 text-center">
              <Button variant="ghost" onClick={handleToggleExpand} className="text-muted w-full flex justify-center items-end gap-2" style={{ padding: '0.5rem' }}>
                <Minimize2 size={16} /> 접기
              </Button>
            </div>
          </div> {/* CLOSE NEW WRAPPER */}
        </div>
      )}

      {/* Common Rollup Popup for Comment Actions */}
      <RollupPopup isOpen={!!activeCommentModalId} onClose={() => setActiveCommentModalId(null)}>
        {(() => {
          const activeComment = comments.find(c => c.comment_no === activeCommentModalId);
          if (!activeComment) return null;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Emoji Options */}
              <div className="flex justify-between items-center mb-6" style={{ padding: '0 0.5rem' }}>
                {EMOTIONS.map(emotion => {
                  const hasSelected = currentUser && activeComment.reactions?.some(r => r.user_id === currentUser.user_id && r.emotion === emotion.value);
                  return (
                    <button
                      key={emotion.value}
                      onClick={() => handleCommentReaction(activeComment.comment_no, emotion.value)}
                      style={{
                        fontSize: '1.75rem', padding: '0.5rem', cursor: 'pointer',
                        borderRadius: '50%',
                        border: hasSelected ? '1px solid var(--primary)' : '1px solid transparent',
                        backgroundColor: hasSelected ? 'rgba(91, 95, 199, 0.15)' : 'var(--background)',
                        transition: 'transform 0.1s, background-color 0.2s'
                      }}
                      className={hasSelected ? 'active:scale-90' : 'active:scale-90'}
                    >
                      {emotion.icon}
                    </button>
                  );
                })}
              </div>

              {currentUser?.user_id === activeComment.user_id ? (
                <>
                  <button
                    onClick={() => {
                      setEditingCommentId(activeComment.comment_no);
                      setEditingCommentContent(activeComment.content);
                      setActiveCommentModalId(null);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', width: '100%', padding: '1rem', border: 'none', background: 'none', color: 'var(--foreground)', fontSize: '1rem', fontWeight: 500, cursor: 'pointer' }}
                  >
                    <Edit2 size={20} className="text-blue-500" />
                    수정
                  </button>
                  <button
                    onClick={() => {
                      setActiveCommentModalId(null);
                      setCommentToDelete(activeComment.comment_no);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', width: '100%', padding: '1rem', border: 'none', background: 'none', color: '#ef4444', fontSize: '1rem', fontWeight: 500, cursor: 'pointer' }}
                  >
                    <Trash2 size={20} />
                    삭제
                  </button>
                </>
              ) : (
                <div className="text-center text-muted" style={{ padding: '1rem 0' }}>
                  이 댓글에 대한 권한이 없습니다.
                </div>
              )}
            </div>
          );
        })()}
      </RollupPopup>

      {/* Board Options Rollup */}
      <RollupPopup
        isOpen={showPostOptions}
        onClose={() => setShowPostOptions(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Reaction Emoji Options */}
          <div className="flex justify-between items-center mb-6" style={{ padding: '0 0.5rem' }}>
            {EMOTIONS.map(emotion => {
              const hasSelected = currentUser && reactions.some(r => r.user_id === currentUser.user_id && r.emotion === emotion.value);
              return (
                <button
                  key={emotion.value}
                  onClick={() => handleBoardReaction(emotion.value)}
                  style={{
                    fontSize: '1.75rem', padding: '0.5rem', cursor: 'pointer',
                    borderRadius: '50%',
                    border: hasSelected ? '1px solid var(--primary)' : '1px solid transparent',
                    backgroundColor: hasSelected ? 'rgba(91, 95, 199, 0.15)' : 'var(--background)',
                    transition: 'transform 0.1s, background-color 0.2s'
                  }}
                  className={hasSelected ? 'active:scale-90' : 'active:scale-90'}
                >
                  {emotion.icon}
                </button>
              );
            })}
          </div>

          {isAuthor && (
            <>
              <button
                onClick={() => {
                  setShowPostOptions(false);
                  setEditTitle(liveTitle);
                  setEditContent(liveContent);
                  setIsEditing(true);
                }}
                className="w-full text-left font-medium p-2 rounded flex items-center gap-2 transition-colors"
                style={{ fontSize: '1rem', padding: '0.8rem 1rem', color: 'var(--foreground)' }}
              >
                <Edit2 size={18} className="text-primary" />
                수정
              </button>
              <button
                onClick={() => {
                  setShowPostOptions(false);
                  setBoardToDelete(true);
                }}
                className="w-full text-left font-medium hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 p-2 rounded flex items-center gap-2"
                style={{ fontSize: '1rem', padding: '0.8rem 1rem' }}
              >
                <Trash2 size={18} />
                삭제
              </button>
            </>
          )}
        </div>
      </RollupPopup>

      <ConfirmModal
        isOpen={boardToDelete}
        title="게시글 삭제"
        message="이 게시글을 정말로 삭제하시겠습니까?"
        onConfirm={handleDeleteBoard}
        onCancel={() => setBoardToDelete(false)}
        confirmText="삭제"
        cancelText="취소"
      />

      <ConfirmModal
        isOpen={!!commentToDelete}
        title="댓글 삭제"
        message="이 댓글을 정말 삭제하시겠습니까?"
        confirmText="삭제"
        onConfirm={handleDeleteComment}
        onCancel={() => setCommentToDelete(null)}
      />

      {/* Add Comment Modal */}
      <ConfirmModal
        isOpen={isAddingComment}
        title="댓글 달기"
        icon={<MessageCircle size={20} />}
        iconColor="var(--primary)"
        confirmVariant="primary"
        message={
          <div style={{ marginTop: '0.5rem' }}>
            <Textarea
              className="w-full border border-border rounded p-3 text-sm focus:outline-none focus:border-primary text-foreground"
              style={{ backgroundColor: 'var(--background)' }}
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글 내용을 입력하세요..."
            />
          </div>
        }
        confirmText="저장"
        onConfirm={handleAddComment}
        onCancel={() => {
          setIsAddingComment(false);
          setNewComment('');
        }}
      />

      {/* Edit Comment Modal */}
      <ConfirmModal
        isOpen={!!editingCommentId}
        title="댓글 수정"
        icon={<Edit2 size={20} />}
        iconColor="var(--primary)"
        confirmVariant="primary"
        message={
          <div style={{ marginTop: '0.5rem' }}>
            <Textarea
              className="w-full border border-border rounded p-3 text-sm focus:outline-none focus:border-primary text-foreground"
              style={{ backgroundColor: 'var(--background)' }}
              rows={3}
              value={editingCommentContent}
              onChange={(e) => setEditingCommentContent(e.target.value)}
              placeholder="댓글 내용을 입력하세요..."
            />
          </div>
        }
        confirmText="저장"
        onConfirm={() => {
          if (editingCommentId) handleSaveCommentEdit(editingCommentId);
        }}
        onCancel={() => {
          setEditingCommentId(null);
          setEditingCommentContent('');
        }}
      />

      {/* Edit Component Floating Modal (Matches New Post Modal) */}
      {mounted && isEditing && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99990, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '1rem' }}>

          {/* Inner Modal Card */}
          <div className="mx-auto" style={{ position: 'relative', backgroundColor: 'var(--card-bg)', width: '100%', maxWidth: '42rem', height: '85vh', borderRadius: '1rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>

            <header className="shrink-0 pt-4 px-4 border-b" style={{ borderColor: 'var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={() => { setIsEditing(false); setEditTitle(liveTitle); setEditContent(liveContent); }} className="text-muted"><ArrowLeft size={24} /></button>
              <h1 className="text-xl font-bold flex-1 text-center">게시글 수정</h1>
              <div style={{ width: 24 }} />
            </header>

            <div className="flex-1 overflow-auto p-4 flex flex-col gap-4" style={{ paddingBottom: '6rem' }}>
              <input
                placeholder="제목을 입력하세요"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="form-input"
                style={{ fontWeight: 'bold', fontSize: '1.25rem', height: '3.5rem', border: 'none', borderBottom: '1px solid var(--border-color)', borderRadius: '0', padding: '0.5rem 0', backgroundColor: 'transparent', color: 'var(--foreground)' }}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                <RichEditor
                  value={editContent}
                  onChange={setEditContent}
                  placeholder="내용을 작성해주세요..."
                />
              </div>
            </div>

            <div className="p-4 border-t" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderColor: 'var(--border-color)', display: 'flex', justifyContent: 'center', backgroundColor: 'var(--card-bg)', zIndex: 10 }}>
              <Button
                onClick={handleSaveEdit}
                disabled={savingEdit || !editTitle.trim() || editContent === '<p><br></p>' || !editContent}
                className="btn btn-primary"
                style={{ width: '100%', height: '3.5rem', fontSize: '1rem', fontWeight: 'bold', borderRadius: '1rem' }}
              >
                {savingEdit ? '저장 중...' : '게시글 수정하기'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Global Style for content */}
      <style jsx global>{`
        .post-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .post-content pre {
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow-x: hidden !important;
        }
        .post-content code {
          white-space: pre-wrap !important;
          word-break: break-word !important;
        }
      `}</style>
    </div>
  );
}
