import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';
import redis from '@/lib/redis';

export async function POST(request: Request, context: unknown) {
  const resolvedParams = await (context as { params: Promise<{ commentId: string }> }).params;
  const commentId = resolvedParams.commentId;

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { emotion, board_no } = await request.json();
    if (!emotion) return NextResponse.json({ error: 'Missing emotion' }, { status: 400 });

    let action = 'ADD';

    // Try to find if the user already reacted
    const [existing] = await db.query<RowDataPacket[]>(`
      SELECT reaction_no, emotion FROM T_REACTION
      WHERE target_type = 'COMMENT' AND target_no = ? AND user_id = ?
    `, [commentId, session.user_id]);

    if (existing.length > 0) {
      const currentEmotion = existing[0].emotion;
      if (currentEmotion === emotion) {
        // Remove reaction
        await db.query(`DELETE FROM T_REACTION WHERE reaction_no = ?`, [existing[0].reaction_no]);
        action = 'REMOVE';
      } else {
        // Update reaction
        await db.query(`UPDATE T_REACTION SET emotion = ? WHERE reaction_no = ?`, [emotion, existing[0].reaction_no]);
        return NextResponse.json({ message: 'Reaction updated' });
      }
    } else {
      const [[{ new_id }]] = await db.query<RowDataPacket[]>('SELECT FN_GEN_ID() AS new_id');
      await db.query(`
        INSERT INTO T_REACTION (reaction_no, target_type, target_no, user_id, emotion, created_at)
        VALUES (?, 'COMMENT', ?, ?, ?, NOW())
      `, [new_id, commentId, session.user_id, emotion]);
      action = 'ADD';
    }

    if (board_no) {
      await redis.publish(`board:${board_no}:events`, JSON.stringify({
        type: 'REACTION_UPDATE',
        targetType: 'COMMENT',
        targetId: commentId,
        user_id: session.user_id,
        emotion: emotion,
        action: action
      }));
    }

    return NextResponse.json({ message: 'Reaction processed', action });
  } catch (error) {
    console.error('Manage comment reaction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
