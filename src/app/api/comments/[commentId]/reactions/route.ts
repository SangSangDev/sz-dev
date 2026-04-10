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

      // Notification Logic
      const [commentInfo] = await db.query<RowDataPacket[]>(`
        SELECT c.user_id, b.board_code, b.board_no 
        FROM T_COMMENT c 
        JOIN T_BOARD b ON c.board_no = b.board_no 
        WHERE c.comment_no = ?
      `, [commentId]);

      if (commentInfo.length > 0) {
        const commentAuthor = commentInfo[0].user_id;
        const boardCode = commentInfo[0].board_code;
        const boardNo = commentInfo[0].board_no;
        
        if (commentAuthor !== session.user_id) {
          const [userRow] = await db.query<RowDataPacket[]>('SELECT user_name FROM T_USER WHERE user_id = ?', [session.user_id]);
          const userName = userRow[0]?.user_name || session.user_id;
          
          // Navigate to board, normally people just scroll manually to comment but sending to board is fine 
          const targetUrl = `/boards/${boardCode}/${boardNo}`;
          const message = `${userName}님이 회원님의 댓글에 이모지를 남겼습니다.`;
          
          const { sendNotification } = await import('@/lib/notifications');
          await sendNotification(session.user_id, commentAuthor, 'COMMENT_REACTION', targetUrl, message);
        }
      }
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
