import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';
import redis from '@/lib/redis';

export async function GET(request: Request, context: unknown) {
  const resolvedParams = await (context as { params: Promise<{ boardId: string }> }).params;
  const boardId = resolvedParams.boardId;

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [rows] = await db.query<RowDataPacket[]>(`
      SELECT reaction_no, target_type, target_no, user_id, emotion, created_at
      FROM T_REACTION
      WHERE target_type = 'BOARD' AND target_no = ?
    `, [boardId]);

    return NextResponse.json({ reactions: rows });
  } catch (error) {
    console.error('Fetch reactions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, context: unknown) {
  const resolvedParams = await (context as { params: Promise<{ boardId: string }> }).params;
  const boardId = resolvedParams.boardId;

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { emotion } = await request.json();
    if (!emotion) return NextResponse.json({ error: 'Missing emotion' }, { status: 400 });

    let action = 'ADD';

    // Try to find if the user already reacted
    const [existing] = await db.query<RowDataPacket[]>(`
      SELECT reaction_no, emotion FROM T_REACTION
      WHERE target_type = 'BOARD' AND target_no = ? AND user_id = ?
    `, [boardId, session.user_id]);

    if (existing.length > 0) {
      // Toggle / Update (we'll just update it for simplicity or delete if same)
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
        VALUES (?, 'BOARD', ?, ?, ?, NOW())
      `, [new_id, boardId, session.user_id, emotion]);
      action = 'ADD';

      // Notification Logic
      const [boardInfo] = await db.query<RowDataPacket[]>(`
        SELECT user_id, board_code FROM T_BOARD WHERE board_no = ?
      `, [boardId]);

      if (boardInfo.length > 0) {
        const boardAuthor = boardInfo[0].user_id;
        const boardCode = boardInfo[0].board_code;
        
        if (boardAuthor !== session.user_id) {
          const [userRow] = await db.query<RowDataPacket[]>('SELECT user_name FROM T_USER WHERE user_id = ?', [session.user_id]);
          const userName = userRow[0]?.user_name || session.user_id;
          
          const targetUrl = `/boards/${boardCode}/${boardId}`;
          const message = `${userName}님이 회원님의 게시글에 이모지를 남겼습니다.`;
          
          const { sendNotification } = await import('@/lib/notifications');
          await sendNotification(session.user_id, boardAuthor, 'POST_REACTION', targetUrl, message);
        }
      }
    }

    await redis.publish(`board:${boardId}:events`, JSON.stringify({
      type: 'REACTION_UPDATE',
      targetType: 'BOARD',
      targetId: boardId,
      user_id: session.user_id,
      emotion: emotion,
      action: action
    }));

    return NextResponse.json({ message: 'Reaction processed', action });
  } catch (error) {
    console.error('Manage reaction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
