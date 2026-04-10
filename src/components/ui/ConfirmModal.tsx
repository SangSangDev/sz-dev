import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconColor?: string;
  confirmVariant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  isLoading = false,
  icon = <AlertCircle size={20} />,
  iconColor = '#dc2626',
  confirmVariant = 'danger'
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Disable background scatter scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;
  if (!mounted) return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'var(--card-bg)',
        borderRadius: '1rem',
        width: '92%',
        maxWidth: '28rem',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: iconColor }}>
            {icon}
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 'bold', color: 'var(--foreground)' }}>{title}</h3>
          </div>
          {onCancel && (
            <button 
              onClick={onCancel} 
              disabled={isLoading}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: isLoading ? 'not-allowed' : 'pointer', padding: '0.25rem' }}
            >
              <X size={20} />
            </button>
          )}
        </div>
        
        {/* Body */}
        <div style={{ padding: '1.5rem', fontSize: '0.9375rem', color: 'var(--foreground)', lineHeight: 1.6 }}>
          {message}
        </div>
        
        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', backgroundColor: 'transparent', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderBottomLeftRadius: '1rem', borderBottomRightRadius: '1rem' }}>
          {onCancel && (
            <Button 
              variant="ghost" 
              onClick={onCancel} 
              disabled={isLoading}
              style={{ minWidth: '5rem' }}
            >
              {cancelText}
            </Button>
          )}
          <Button 
            variant={confirmVariant} 
            onClick={onConfirm} 
            disabled={isLoading}
            style={{ minWidth: '5rem' }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}} />
    </div>,
    document.body
  );
}
