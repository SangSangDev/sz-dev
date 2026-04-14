export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [menuRows] = await db.query<RowDataPacket[]>(`
      SELECT DISTINCT 
        m.menu_no, m.menu_name, m.url, m.parent_no, m.is_board, m.board_code, m.is_public, m.sort_order,
        CASE WHEN m.is_board = 'Y' THEN (
          SELECT COUNT(*) > 0 
          FROM T_BOARD b 
          WHERE b.board_code = m.board_code 
            AND b.created_at > COALESCE((
              SELECT last_read_time 
              FROM T_BOARD_READ_HISTORY brh 
              WHERE brh.user_id = ? AND brh.board_code = m.board_code
            ), '1970-01-01')
        ) ELSE 0 END AS has_new
      FROM T_USER_ROLE ur
      JOIN T_ROLE_MENU rm ON ur.role_no = rm.role_no
      JOIN T_MENU m ON rm.menu_no = m.menu_no
      WHERE ur.user_id = ? 
        AND m.use_yn = 'Y' 
        AND m.del_yn = 'N' 
        AND rm.can_read = 1
        AND (m.is_board = 'N' OR (m.is_board = 'Y' AND (m.is_public = 'Y' OR (m.is_public = 'N' AND m.created_by = ?))))
      ORDER BY m.sort_order ASC
    `, [session.user_id, session.user_id, session.user_no]);

    const menus = menuRows.map(r => ({
      ...r,
      has_new: r.has_new === 1
    }));

    return NextResponse.json({ menus }, { status: 200 });
  } catch (error) {
    console.error('Fetch menus error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
