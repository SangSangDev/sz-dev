"use client";

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

export const EMOTIONS = [
  { value: 'LIKE', icon: '👍', label: 'Like' },
  { value: 'HEART', icon: '❤️', label: 'Heart' },
  { value: 'LAUGH', icon: '😂', label: 'Laugh' },
  { value: 'SURPRISE', icon: '😮', label: 'Surprise' },
  { value: 'CRY', icon: '😭', label: 'Cry' },
];

export type Reaction = {
  reaction_no?: string;
  user_id: string;
  emotion: string;
};

interface ReactionBarProps {
  targetType: 'BOARD' | 'COMMENT';
  targetId: string;
  initialReactions: Reaction[];
  currentUser: { user_id: string; user_name: string } | null;
  onCountChange?: (delta: number) => void;
  onReactionsChange?: (reactions: Reaction[]) => void;
}

export function ReactionBar({ targetType, targetId, initialReactions, currentUser, onCountChange, onReactionsChange }: ReactionBarProps) {
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Sync state if parent forces a new array (e.g. from a popup)
  React.useEffect(() => {
    setReactions(initialReactions);
  }, [initialReactions]);

  // Sync if parent passes fundamentally radically new initialReactions
  // But wait, if we only want to lift state up, just the callback is fine!
  // No, actually if we expand/collapse, it remounts anyway so initialReactions handles the sync.

  const handleToggleReaction = async (emotion: string) => {
    if (!currentUser) return;
    let delta = 0;
    const existingReaction = reactions.find(r => r.user_id === currentUser.user_id);
    if (existingReaction) {
      if (existingReaction.emotion === emotion) {
        delta = -1;
      } else {
        delta = 0; // Emotion merely changed, count remains the same
      }
    } else {
      delta = 1; // New reaction added
    }

    if (delta !== 0 && onCountChange) {
      onCountChange(delta);
    }

    const newReactions = (() => {
      if (existingReaction) {
        if (existingReaction.emotion === emotion) {
          return reactions.filter(r => r.user_id !== currentUser.user_id);
        } else {
          return [...reactions.filter(r => r.user_id !== currentUser.user_id), { user_id: currentUser.user_id, emotion }];
        }
      } else {
        return [...reactions, { user_id: currentUser.user_id, emotion }];
      }
    })();

    setReactions(newReactions);
    if (onReactionsChange) onReactionsChange(newReactions);

    try {
      const endpoint = targetType === 'BOARD'
        ? `/api/boards/${targetId}/reactions`
        : `/api/comments/${targetId}/reactions`;

      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emotion }),
      });

      // We don't refetch automatically to save bandwidth, optimistic update is enough.
      // If needed, we can refetch here.
    } catch (err) {
      console.error(err);
      // Revert optimistic update could be done here if needed
    }
  };

  const reactSummary = reactions.reduce((acc, r) => {
    acc[r.emotion] = (acc[r.emotion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex gap-2 items-center flex-wrap" style={{ position: 'relative', width: '100%', justifyContent: 'flex-end' }}>
      {/* Active Reactions Only */}
      {EMOTIONS.filter(e => (reactSummary[e.value] || 0) > 0).map(e => {
        const isActive = currentUser && reactions.some(r => r.user_id === currentUser.user_id && r.emotion === e.value);
        const count = reactSummary[e.value] || 0;
        return (
          <button
            key={e.value}
            onClick={() => handleToggleReaction(e.value)}
            className={`reaction-btn`}
            style={{
              border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
              backgroundColor: isActive ? 'rgba(91, 95, 199, 0.15)' : 'var(--background)',
              padding: '0.15rem 0.4rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              borderRadius: '1rem'
            }}
          >
            <span style={{ fontSize: '0.85rem' }}>{e.icon}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? 'var(--primary)' : 'var(--foreground)' }}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
