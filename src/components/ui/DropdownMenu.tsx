import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

export type DropdownItem = {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  danger?: boolean; // Text color red
  disabled?: boolean;
};

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: DropdownItem[];
  align?: 'left' | 'right';
  style?: React.CSSProperties; // Pass additional styles if needed
}

export function DropdownMenu({ isOpen, onClose, items, align = 'right', style = {} }: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    // Use mousedown instead of click to prevent issues with drag/selection
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      // Small timeout to prevent the state modifying click from immediately closing it
      setTimeout(() => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          onClose();
        }
      }, 0);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        ref={menuRef}
        style={{
          position: 'absolute', top: '100%', 
          [align === 'right' ? 'right' : 'left']: 0,
          marginTop: '0.5rem',
          backgroundColor: 'white', borderRadius: '0.75rem', padding: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid var(--border-color)', minWidth: '160px', zIndex: 40,
          animation: 'fadeIn 0.2s ease-out',
          ...style
        }}
      >
        {items.map((item, index) => {
          const content = (
            <>
              {item.icon && <item.icon size={18} />}
              <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{item.label}</span>
            </>
          );
          
          const itemStyle: React.CSSProperties = { 
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', 
            color: item.disabled ? '#9ca3af' : (item.danger ? '#ef4444' : 'var(--foreground)'), 
            borderRadius: '0.5rem', transition: 'background-color 0.2s', 
            textDecoration: 'none', background: 'none', border: 'none', 
            width: '100%', textAlign: 'left', 
            cursor: item.disabled ? 'not-allowed' : 'pointer' 
          };

          const handleClick = (e: React.MouseEvent) => {
            if (item.disabled) {
              e.preventDefault();
              return;
            }
            if (item.onClick) item.onClick();
            onClose();
          };

          if (item.href) {
            return (
              <Link key={index} href={item.href} style={itemStyle} onClick={handleClick}>
                {content}
              </Link>
            );
          }

          return (
            <button key={index} onClick={handleClick} style={itemStyle} disabled={item.disabled}>
              {content}
            </button>
          );
        })}
      </div>
    </>
  );
}
