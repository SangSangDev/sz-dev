"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Bold, Italic, Strikethrough, Heading2, List, Code, Quote, Table as TableIcon, Image as ImageIcon, Plus, Minus, Trash2 } from 'lucide-react';

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function RichEditor({ value, onChange, placeholder }: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }: any) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose focus:outline-none placeholder-muted max-w-none',
      },
    },
  });

  // Sync external value changes (like resetting form)
  useEffect(() => {
    if (editor && value === '') {
      editor.commands.setContent('');
    }
  }, [value, editor]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    // Optional: Only allow images
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('업로드 실패');
      
      const data = await res.json();
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url }).run();
      }
    } catch (err) {
      console.error(err);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!editor) return <div className="p-4 text-center text-muted border rounded-md">Loading editor...</div>;

  return (
    <div className="rich-editor-wrapper flex flex-col border border-border rounded-md overflow-hidden bg-card relative">
      {uploading && (
        <div className="absolute inset-0 bg-card flex items-center justify-center z-10 font-bold text-primary" style={{ opacity: 0.8 }}>
          사진 업로드 중...
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-transparent border-b border-border">
        <button 
          title="굵게"
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()} 
          className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-primary text-white' : 'hover:bg-black/10 text-black'}`}
        >
          <Bold size={16} strokeWidth={2.5} />
        </button>
        <button 
          title="기울임"
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-primary text-white' : 'hover:bg-black/10 text-black'}`}
        >
          <Italic size={16} strokeWidth={2.5} />
        </button>
        <button 
          title="취소선"
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()} 
          className={`p-1.5 rounded transition-colors ${editor.isActive('strike') ? 'bg-primary text-white' : 'hover:bg-black/10 text-black'}`}
        >
          <Strikethrough size={16} strokeWidth={2.5} />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button 
          title="제목"
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
          className={`p-1.5 rounded transition-colors ${editor.isActive('heading') ? 'bg-primary text-white' : 'hover:bg-black/10 text-black'}`}
        >
          <Heading2 size={16} strokeWidth={2.5} />
        </button>
        <button 
          title="목록"
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()} 
          className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-primary text-white' : 'hover:bg-black/10 text-black'}`}
        >
          <List size={16} strokeWidth={2.5} />
        </button>
        
        <button 
          title="코드 블록"
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()} 
          className={`p-1.5 rounded transition-colors ${editor.isActive('codeBlock') ? 'bg-primary text-white' : 'hover:bg-black/10 text-black'}`}
        >
          <Code size={16} strokeWidth={2.5} />
        </button>
        <button 
          title="인용구"
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()} 
          className={`p-1.5 rounded transition-colors ${editor.isActive('blockquote') ? 'bg-primary text-white' : 'hover:bg-black/10 text-black'}`}
        >
          <Quote size={16} strokeWidth={2.5} />
        </button>

        <div className="w-px h-4 bg-gray-300 mx-1" />

        {/* Table actions */}
        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          className={`p-1.5 rounded transition-colors ${editor.isActive('table') ? 'bg-primary text-white' : 'hover:bg-black/10 text-black'} flex items-center gap-1`}
          title="표 삽입"
        >
          <TableIcon size={16} strokeWidth={2.5} />
        </button>

        <div className="w-px h-4 bg-gray-300 mx-1" />
        
        {/* Image Upload Button */}
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleImageUpload} 
        />
        <button 
          title="사진 추가"
          type="button"
          onClick={() => fileInputRef.current?.click()} 
          className="p-1.5 rounded transition-colors hover:bg-black/10 text-black flex items-center gap-1"
        >
          <ImageIcon size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Editor Content Area */}
      <div className="p-3 relative" style={{ minHeight: '200px', maxHeight: '50vh', overflowY: 'auto', cursor: 'text' }} onClick={() => editor.chain().focus().run()}>
        {editor && (
          <BubbleMenu 
            editor={editor} 
            options={{ placement: 'bottom-start' }}
            shouldShow={({ editor }) => editor.isActive('table')}
            getReferencedVirtualElement={() => {
              const node = document.getSelection()?.anchorNode;
              if (!node) return { getBoundingClientRect: () => new DOMRect(0, 0, 0, 0) };
              let el: HTMLElement | null = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
              while (el && el.tagName !== 'TABLE' && !el.classList.contains('ProseMirror')) {
                el = el.parentElement;
              }
              if (el && el.tagName === 'TABLE') {
                return {
                  getBoundingClientRect: () => el!.getBoundingClientRect(),
                };
              }
              const range = document.getSelection()?.getRangeAt(0);
              return range ? { getBoundingClientRect: () => range.getBoundingClientRect() } : { getBoundingClientRect: () => new DOMRect(0, 0, 0, 0) };
            }}
          >
            <div className="bubble-menu">
              <span className="bubble-menu-label">열</span>
              <button title="열 추가" type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} className="bubble-menu-btn"><Plus size={14} strokeWidth={2.5}/></button>
              <button title="열 삭제" type="button" onClick={() => editor.chain().focus().deleteColumn().run()} className="bubble-menu-btn danger"><Minus size={14} strokeWidth={2.5}/></button>
              
              <div className="bubble-menu-divider" />
              
              <span className="bubble-menu-label">행</span>
              <button title="행 추가" type="button" onClick={() => editor.chain().focus().addRowAfter().run()} className="bubble-menu-btn"><Plus size={14} strokeWidth={2.5}/></button>
              <button title="행 삭제" type="button" onClick={() => editor.chain().focus().deleteRow().run()} className="bubble-menu-btn danger"><Minus size={14} strokeWidth={2.5}/></button>
              
              <div className="bubble-menu-divider" />
              <button title="표 삭제" type="button" onClick={() => editor.chain().focus().deleteTable().run()} className="bubble-menu-btn danger"><Trash2 size={14}/></button>
            </div>
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
      </div>


    </div>
  );
}
