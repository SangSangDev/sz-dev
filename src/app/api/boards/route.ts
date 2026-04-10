import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const boardCode = url.searchParams.get('boardCode');

    // Pagination (Default: 10 per page)
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = 10;
    const offset = (page - 1) * limit;

    let queryStr = `
      SELECT b.board_no, b.board_code, b.title, b.content, b.user_id, b.created_at, b.updated_at, u.user_name,
             (SELECT COUNT(*) FROM T_COMMENT c WHERE c.board_no = b.board_no AND c.del_yn = 'N') as comment_count,
             (SELECT COUNT(*) FROM T_REACTION r WHERE r.target_type = 'BOARD' AND r.target_no = b.board_no) as reaction_count
      FROM T_BOARD b
      JOIN T_USER u ON b.user_id = u.user_id
      WHERE b.del_yn = 'N' 
        AND b.board_code IN (
            SELECT m.board_code
            FROM T_USER_ROLE ur
            JOIN T_ROLE_MENU rm ON ur.role_no = rm.role_no
            JOIN T_MENU m ON rm.menu_no = m.menu_no
            WHERE ur.user_id = ? AND m.is_board = 'Y' AND m.use_yn = 'Y' AND rm.can_read = 1
        )
    `;
    const queryParams: any[] = [session.user_id];

    if (boardCode) {
      queryStr += ` AND b.board_code = ?`;
      queryParams.push(boardCode);
    }

    queryStr += ` ORDER BY b.created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [rows] = await db.query<RowDataPacket[]>(queryStr, queryParams);

    // If fetching the first page of a specific board, update read history silently
    if (boardCode && page === 1) {
      await db.query(`
        INSERT INTO T_BOARD_READ_HISTORY (user_id, board_code, last_read_time)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE last_read_time = NOW()
      `, [session.user_id, boardCode]).catch(err => {
        // Silently ignore errors (e.g. if the user hasn't created the table yet)
      });
    }

    return NextResponse.json({ boards: rows, page, limit });
  } catch (error) {
    console.error('Fetch boards error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, content, boardCode } = await request.json();
    if (!title || !content || !boardCode) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const [[{ new_id }]] = await db.query<RowDataPacket[]>('SELECT FN_GEN_ID() AS new_id');

    await db.query(`
      INSERT INTO T_BOARD (board_no, board_code, title, content, user_id, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `, [new_id, boardCode, title, content, session.user_id]);

    return NextResponse.json({ message: 'Board created', board_no: new_id }, { status: 201 });
  } catch (error) {
    console.error('Create board error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
