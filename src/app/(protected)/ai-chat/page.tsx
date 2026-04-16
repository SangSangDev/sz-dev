'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Search, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isStreaming?: boolean;
  toolsUsed?: string[];
  created_at?: number;
}

const SUGGESTIONS = [
  '최근 게시글 보여줘',
  '어떤 게시판들이 있어?',
  '공지사항 알려줘',
  '자유 게시판 최신 글',
];

const TOOL_LABEL: Record<string, string> = {
  search_board_posts: '게시판 검색 중...',
  get_recent_posts: '최신 게시물 조회 중...',
  list_boards: '게시판 목록 확인 중...',
};

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/ai/chat');
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error('Failed to load chat history', err);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    fetchHistory();
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // textarea 자동 높이 조정
  const adjustTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      created_at: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setActiveTool(null);

    // textarea 높이 리셋
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // AI 응답 메시지 placeholder
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      text: '',
      isStreaming: true,
      toolsUsed: [],
      created_at: Date.now() + 1,
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      // 대화 기록 구성 (새 사용자 메시지 포함)
      const allMessages = [
        ...messages.map(m => ({ role: m.role, text: m.text })),
        { role: 'user' as const, text: text.trim() },
      ];

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: '서버 오류가 발생했습니다.' }));
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, text: err.error || '오류가 발생했습니다.', isStreaming: false }
              : m
          )
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw);

            if (event.type === 'tool_call') {
              setActiveTool(event.tool);
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, toolsUsed: [...(m.toolsUsed ?? []), event.tool] }
                    : m
                )
              );
            } else if (event.type === 'text') {
              setActiveTool(null);
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, text: m.text + event.chunk }
                    : m
                )
              );
            } else if (event.type === 'done') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m
                )
              );
              setActiveTool(null);
            } else if (event.type === 'error') {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId
                    ? { ...m, text: `오류: ${event.message}`, isStreaming: false }
                    : m
                )
              );
              setActiveTool(null);
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, text: '네트워크 오류가 발생했습니다. 다시 시도해 주세요.', isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setActiveTool(null);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, bottom: 0, left: 0, right: 0, display: 'flex', flexDirection: 'column', maxWidth: '42rem', margin: '0 auto', width: '100%', backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="header shrink-0 sticky-header" style={{ justifyContent: 'center' }}>
        <h1 style={{ fontSize: '1.0625rem', fontWeight: 'bold', color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bot size={18} style={{ color: 'var(--primary)' }} />
          AI 어시스턴트
        </h1>
      </header>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '1.5rem' }}>
        {isLoadingHistory ? (
          <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyItems: 'center', color: 'var(--text-muted)' }}>
            <Loader2 className="animate-spin" size={24} style={{ marginRight: '0.5rem', margin: 'auto' }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div style={{ backgroundColor: 'rgba(243, 244, 246, 0.8)', width: '4rem', height: '4rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyItems: 'center', marginBottom: '0.75rem' }}>
              <Bot size={24} color="#9ca3af" style={{ margin: 'auto' }} />
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem' }}>무엇이 궁금하신가요?</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  disabled={isLoading}
                  style={{
                    padding: '0.4rem 0.875rem',
                    borderRadius: '9999px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--card-bg)',
                    fontSize: '0.8rem',
                    color: 'var(--foreground)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.backgroundColor = 'rgba(108, 112, 232, 0.06)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--foreground)'; e.currentTarget.style.backgroundColor = 'var(--card-bg)'; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.role === 'user';
            const showName = !isMe && (idx === 0 || messages[idx - 1].role !== msg.role);
            const timeString = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-start', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.375rem', flexDirection: isMe ? 'row' : 'row-reverse', maxWidth: '75%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>

                    {showName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.375rem', marginLeft: '0.25rem' }}>
                        <div className="avatar-sm" style={{ flexShrink: 0, width: '1.5rem', height: '1.5rem', background: 'linear-gradient(135deg, #6c70e8, #a78bfa)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                          <Bot size={14} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#6b7280' }}>
                          AI 어시스턴트
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.375rem', flexDirection: isMe ? 'row' : 'row-reverse' }}>
                      <span style={{ fontSize: '0.625rem', color: '#9ca3af', fontWeight: 500, flexShrink: 0, paddingBottom: '0.125rem' }}>
                        {timeString}
                      </span>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div
                          style={{
                            padding: '0.625rem 0.875rem',
                            fontSize: '0.9375rem',
                            wordBreak: 'break-word',
                            whiteSpace: isMe ? 'pre-wrap' : 'normal',
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
                          {!isMe ? (
                            <div className="markdown-content">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({node, ...props}) => <p style={{ margin: '0 0 0.5rem 0', padding: 0 }} {...props} />,
                                  ul: ({node, ...props}) => <ul style={{ margin: '0 0 0.5rem 0', paddingLeft: '1.5rem', listStyleType: 'disc' }} {...props} />,
                                  ol: ({node, ...props}) => <ol style={{ margin: '0 0 0.5rem 0', paddingLeft: '1.5rem', listStyleType: 'decimal' }} {...props} />,
                                  li: ({node, ...props}) => <li style={{ marginBottom: '0.25rem' }} {...props} />,
                                  a: ({node, ...props}) => <a style={{ color: 'var(--primary)', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer" {...props} />,
                                  strong: ({node, ...props}) => <strong style={{ fontWeight: 600 }} {...props} />,
                                  code: ({node, className, children, ...props}: any) => {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const isInline = !match && !String(children).includes('\n');
                                    return isInline ? (
                                      <code style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--foreground)', padding: '0.15rem 0.3rem', borderRadius: '0.25rem', fontSize: '0.85em', fontFamily: 'monospace' }} {...props}>
                                        {children}
                                      </code>
                                    ) : (
                                      <pre style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.75rem', borderRadius: '0.5rem', overflowX: 'auto', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>
                                        <code style={{ color: 'var(--foreground)', fontSize: '0.85em', fontFamily: 'monospace' }} className={className} {...props}>
                                          {children}
                                        </code>
                                      </pre>
                                    );
                                  }
                                }}
                              >
                                {msg.text}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            msg.text
                          )}
                          
                          {msg.isStreaming && activeTool === null && (msg.text || msg.text === '') && (
                            <span style={{ display: 'inline-block', width: '2px', height: '1em', backgroundColor: 'var(--primary)', marginLeft: '2px', animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />
                          )}
                        </div>

                        {/* 도구 호출 인디케이터 */}
                        {!isMe && msg.isStreaming && activeTool && (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.875rem', borderRadius: '9999px',
                            backgroundColor: 'rgba(108, 112, 232, 0.08)', border: '1px solid rgba(108, 112, 232, 0.2)', fontSize: '0.8rem', color: 'var(--primary)', alignSelf: 'flex-start'
                          }}>
                            <Search size={12} />
                            <Loader2 size={14} className="animate-spin" />
                            <span>{TOOL_LABEL[activeTool] ?? '데이터 조회 중...'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} style={{ height: '0.5rem' }} />
      </div>

      {/* Input Area */}
      <div style={{ flexShrink: 0, backgroundColor: 'var(--card-bg)', borderTop: '1px solid var(--border-color)', padding: '0.75rem', paddingBottom: 'calc(env(safe-area-inset-bottom) + 4.75rem)', zIndex: 20, boxShadow: '0 -4px 10px -4px rgba(0,0,0,0.05)' }}>
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', maxWidth: '42rem', margin: '0 auto' }}>
          <div style={{ flex: 1, backgroundColor: 'var(--background)', borderRadius: '1rem', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', minHeight: '2.75rem', transition: 'all 0.2s' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); adjustTextarea(); }}
              onKeyDown={handleKeyDown}
              placeholder="메시지 입력..."
              disabled={isLoading || isLoadingHistory}
              className="form-input no-scrollbar"
              rows={1}
              style={{ flex: 1, backgroundColor: 'transparent', border: 'none', padding: '0.75rem 1rem', fontSize: '0.9375rem', boxShadow: 'none', color: 'var(--foreground)', resize: 'none', maxHeight: '7rem', outline: 'none' }}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isLoadingHistory}
            style={{
              backgroundColor: (!input.trim() || isLoading || isLoadingHistory) ? '#d1d5db' : 'var(--primary)',
              color: (!input.trim() || isLoading || isLoadingHistory) ? '#6b7280' : 'white',
              borderRadius: '50%',
              width: '2.75rem',
              height: '2.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: (!input.trim() || isLoading || isLoadingHistory) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              border: 'none',
              marginBottom: textareaRef.current && textareaRef.current.scrollHeight > 50 ? '0.25rem' : '0'
            }}
          >
            {isLoading && !activeTool ? <Loader2 size={20} className="animate-spin" /> : <Send size={18} style={{ transform: 'translate(1px, 1px)' }} />}
          </button>
        </form>
      </div>
    </div>
  );
}
