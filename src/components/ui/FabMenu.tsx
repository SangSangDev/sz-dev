import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';

interface FabMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
}

export function FabMenuItem({ icon, label, onClick, href }: FabMenuItemProps) {
  const inner = (
    <>
      <span>{label}</span>
      <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
    </>
  );

  const style: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.75rem', 
    backgroundColor: 'var(--card-bg)', padding: '0.75rem 1rem', 
    borderRadius: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', 
    color: 'var(--foreground)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
    border: 'none'
  };

  if (href) {
    return <Link href={href} style={style}>{inner}</Link>;
  }
  return <button onClick={onClick} style={style}>{inner}</button>;
}

interface FabMenuProps {
  children: React.ReactNode;
}

export function FabMenu({ children }: FabMenuProps) {
  const [showFabMenu, setShowFabMenu] = useState(false);

  return (
    <>
      {showFabMenu && (
        <div 
          className="animate-fade-in"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(2px)' }} 
          onClick={() => setShowFabMenu(false)} 
        />
      )}
      <div 
        style={{
          position: 'fixed',
          bottom: '5rem',
          right: '1.5rem',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '0.75rem'
        }}
      >
        {showFabMenu && (
          <div 
            style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end', animation: 'slideUp 0.15s ease-out' }}
            onClick={() => setShowFabMenu(false)} // Auto dismiss when clicking an option
          >
            {children}
          </div>
        )}

        <button 
          onClick={() => setShowFabMenu(!showFabMenu)}
          style={{ width: '3.5rem', height: '3.5rem', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4), 0 4px 6px -2px rgba(99, 102, 241, 0.2)', transition: 'transform 0.2s', transform: showFabMenu ? 'rotate(45deg)' : 'none' }}
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      </div>
    </>
  );
}
