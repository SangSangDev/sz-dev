import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request, context: unknown) {
  // We need to type the params safely in Next.js 15 since params is a Promise
  const resolvedParams = await (context as { params: Promise<{ boardId: string }> }).params;
  const boardId = resolvedParams.boardId;

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [rows] = await db.query<RowDataPacket[]>(`
      SELECT b.board_no, b.board_code, b.title, b.content, b.user_id, b.created_at, b.updated_at, u.user_name,
             (SELECT COUNT(*) FROM T_COMMENT c WHERE c.board_no = b.board_no AND c.del_yn = 'N') as comment_count,
             (SELECT COUNT(*) FROM T_REACTION r WHERE r.target_type = 'BOARD' AND r.target_no = b.board_no) as reaction_count
      FROM T_BOARD b
      JOIN T_USER u ON b.user_id = u.user_id
      WHERE b.board_no = ? AND b.del_yn = 'N'
    `, [boardId]);

    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ board: rows[0] });
  } catch (error) {
    console.error('Fetch board details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: unknown) {
  const resolvedParams = await (context as { params: Promise<{ boardId: string }> }).params;
  const boardId = resolvedParams.boardId;

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, content } = await request.json();
    if (!title || !content) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const [rows] = await db.query<RowDataPacket[]>(`
      SELECT user_id FROM T_BOARD WHERE board_no = ? AND del_yn = 'N'
    `, [boardId]);

    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (rows[0].user_id !== session.user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await db.query(`
      UPDATE T_BOARD SET title = ?, content = ?, updated_at = NOW() WHERE board_no = ?
    `, [title, content, boardId]);

    return NextResponse.json({ message: 'Board updated' });
  } catch (error) {
    console.error('Update board error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
