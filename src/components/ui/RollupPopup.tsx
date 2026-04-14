import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface RollupPopupProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function RollupPopup({ isOpen, onClose, children }: RollupPopupProps) {
  // render state allows us to delay unmounting until animation ends
  const [render, setRender] = useState(isOpen);
  const [mounted, setMounted] = useState(false);

  // Drag logic
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setRender(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      setOffsetY(0);
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    startY.current = e.clientY;
    setIsDragging(true);
    // Explicitly grab pointer events so we keep getting mouse move if cursor leaves the element
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    let diff = e.clientY - startY.current;
    
    // When dragged upwards, applying friction/resistance
    if (diff < 0) {
      diff = Math.max(-30, diff * 0.2); 
    }
    
    setOffsetY(diff);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    if (offsetY > 100) {
      onClose();
    } else {
      setOffsetY(0); // Snap back to original position
    }
  };

  if (!mounted) return null;
  if (!render && !isOpen) return null;

  // Determine current translation based on `isOpen` state and `offsetY`
  const currentTransform = isOpen 
    ? `translateY(${offsetY}px)` 
    : 'translateY(100%)';

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed', 
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', 
          backdropFilter: 'blur(2px)', 
          zIndex: 99998,
          opacity: isOpen ? 1 : 0, 
          transition: 'opacity 0.25s ease',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
        onClick={onClose}
      />
      
      {/* Rollup Content Area */}
      <div 
        style={{
          position: 'fixed', 
          bottom: 0, left: 0, right: 0, 
          zIndex: 99999,
          backgroundColor: 'var(--card-bg)', 
          color: 'var(--foreground)',
          borderTopLeftRadius: '1.25rem', 
          borderTopRightRadius: '1.25rem',
          padding: '1.25rem 1.25rem', 
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
          boxShadow: '0 -10px 25px -5px rgba(0, 0, 0, 0.1)',
          transform: currentTransform,
          // Only animate transition if NOT actively dragging so drag is responsive
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          touchAction: 'none', // Prevent default browser scrolling/zooming during drag
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTransitionEnd={() => { 
          if (!isOpen) setRender(false); 
        }}
      >
        {/* Handle bar indicator */}
        <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--handle-color)', borderRadius: '4px', margin: '0 auto 1rem', cursor: 'grab' }} />
        
        {/* Content passed from caller */}
        {children}
        
        {/* Anti-gap fill for over-pulling upwards */}
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, height: '50vh', backgroundColor: 'var(--card-bg)' }} />
      </div>
    </>,
    document.body
  );
}
