"use client";

import React, { useState, useEffect } from 'react';
import { X, Info, AlertCircle, CheckCircle } from 'lucide-react';

export type ToastMessage = {
  id: number;
  message: string;
  type?: 'info' | 'error' | 'success';
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    let idCounter = 0;

    const handleShowToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type?: 'info' | 'error' | 'success' }>;
      const newToast: ToastMessage = {
        id: ++idCounter,
        message: customEvent.detail.message,
        type: customEvent.detail.type || 'info',
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss after 3.5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3500);
    };

    window.addEventListener('show_toast', handleShowToast);
    return () => window.removeEventListener('show_toast', handleShowToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        width: '90%',
        maxWidth: '400px',
        pointerEvents: 'none', // click through container
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'auto', // but clickable toasts
            animation: 'slideDownFade 0.3s ease-out forwards',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: toast.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 
                             toast.type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 
                             'rgba(59, 130, 246, 0.9)',
            color: '#fff',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            width: '100%',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '0.875rem',
            fontWeight: 500,
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {toast.type === 'error' && <AlertCircle size={20} />}
            {toast.type === 'success' && <CheckCircle size={20} />}
            {toast.type === 'info' && <Info size={20} />}
            <span style={{ lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>{toast.message}</span>
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            style={{
              background: 'none',
              border: 'none',
              color: 'currentcolor',
              opacity: 0.8,
              cursor: 'pointer',
              padding: '4px',
              marginLeft: '8px',
              display: 'flex',
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideDownFade {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}} />
    </div>
  );
}
