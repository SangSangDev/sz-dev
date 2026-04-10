import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request, context: unknown) {
  const resolvedParams = await (context as { params: Promise<{ boardId: string }> }).params;
  const boardId = resolvedParams.boardId;

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = 10;
    const offset = (page - 1) * limit;

    const [rows] = await db.query<RowDataPacket[]>(`
      SELECT c.comment_no, c.board_no, c.user_id, c.content, c.created_at, c.updated_at, u.user_name
      FROM T_COMMENT c
      JOIN T_USER u ON c.user_id = u.user_id
      WHERE c.board_no = ? AND c.del_yn = 'N'
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [boardId, limit, offset]);

    if (rows.length === 0) {
      return NextResponse.json({ comments: [], page, limit });
    }

    const commentIds = rows.map(r => r.comment_no);

    const [reactions] = await db.query<RowDataPacket[]>(`
      SELECT reaction_no, target_no, user_id, emotion 
      FROM T_REACTION
      WHERE target_type = 'COMMENT' AND target_no IN (?)
    `, [commentIds]);

    const commentsWithReactions = rows.map(comment => ({
      ...comment,
      reactions: reactions.filter(r => r.target_no === comment.comment_no)
    }));

    return NextResponse.json({ comments: commentsWithReactions, page, limit });
  } catch (error) {
    console.error('Fetch comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, context: unknown) {
  const resolvedParams = await (context as { params: Promise<{ boardId: string }> }).params;
  const boardId = resolvedParams.boardId;

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await request.json();
    if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });

    const [[{ new_id }]] = await db.query<RowDataPacket[]>('SELECT FN_GEN_ID() AS new_id');

    await db.query(`
      INSERT INTO T_COMMENT (comment_no, board_no, user_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `, [new_id, boardId, session.user_id, content]);

    return NextResponse.json({ message: 'Comment created' }, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
