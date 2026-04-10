"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

// Now expects boardCode to be passed via URL ?boardCode=ABC
export default function CreatePostPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // In a real app we would read this from search parameters, but for simplicity we rely on the backend.
  // Wait, the API needs the boardCode. Let's extract from URL:
  const getBoardCodeFromUrl = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('boardCode');
    }
    return null;
  };

  const handlePost = async () => {
    if (!title.trim() || !content.trim()) return;
    const code = getBoardCodeFromUrl();
    if (!code) {
      alert("No Board Code found!");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, boardCode: code }),
      });

      if (!res.ok) {
        if (res.status === 401) router.push('/login');
        throw new Error('Failed to post');
      }

      router.push(`/boards/${code}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="header">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted" style={{ padding: '0.25rem' }}>
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold">New Post</h1>
        </div>
        <Button onClick={handlePost} disabled={loading || !title.trim() || !content.trim()} size="sm" style={{ gap: '0.5rem' }}>
          Post <Send size={16} />
        </Button>
      </header>

      <div className="flex flex-col" style={{ padding: '0 1rem' }}>
        <Input 
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="editor-title"
        />
        <Textarea 
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="editor-content"
          style={{ marginTop: '0.5rem' }}
        />
      </div>
    </div>
  );
}
