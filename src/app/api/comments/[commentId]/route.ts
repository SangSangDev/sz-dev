import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

export async function PATCH(request: Request, context: unknown) {
  const resolvedParams = await (context as { params: Promise<{ commentId: string }> }).params;
  const commentId = resolvedParams.commentId;

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await request.json();
    if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });

    const [rows] = await db.query<RowDataPacket[]>('SELECT user_id FROM T_COMMENT WHERE comment_no = ?', [commentId]);
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (rows[0].user_id !== session.user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await db.query(`
      UPDATE T_COMMENT SET content = ?, updated_at = NOW() WHERE comment_no = ?
    `, [content, commentId]);

    return NextResponse.json({ message: 'Comment updated' });
  } catch (error) {
    console.error('Update comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: unknown) {
  const resolvedParams = await (context as { params: Promise<{ commentId: string }> }).params;
  const commentId = resolvedParams.commentId;

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [rows] = await db.query<RowDataPacket[]>('SELECT user_id FROM T_COMMENT WHERE comment_no = ?', [commentId]);
    if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (rows[0].user_id !== session.user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Physical delete (or set del_yn = 'Y' based on migration sql schema. Wait, T_COMMENT has del_yn. Let's use physical delete or del_yn update. actually, let me physical delete reactions and comment for consistency, or just update del_yn.)
    // Because T_COMMENT has a del_yn = 'N' default, let's update del_yn = 'Y'.
    await db.query(`
      UPDATE T_COMMENT SET del_yn = 'Y', updated_at = NOW() WHERE comment_no = ?
    `, [commentId]);

    return NextResponse.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
