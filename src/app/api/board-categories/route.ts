export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const ownBoardsOnly = url.searchParams.get('ownBoardsOnly') === 'true';

    let queryStr = `
      SELECT m.menu_no, m.menu_name, m.board_code, m.is_public, m.created_at, m.board_sort,
             (CASE WHEN rm.can_read = 1 THEN 1 ELSE 0 END) as has_access,
             (SELECT COUNT(*) FROM T_BOARD b WHERE b.board_code = m.board_code AND b.del_yn = 'N') as post_count,
             (SELECT COUNT(*) > 0 
              FROM T_BOARD b 
              WHERE b.board_code = m.board_code 
                AND b.created_at > COALESCE((
                  SELECT last_read_time 
                  FROM T_BOARD_READ_HISTORY brh 
                  WHERE brh.user_id = ? AND brh.board_code = m.board_code
                ), '1970-01-01')
             ) as has_new
      FROM T_MENU m
      LEFT JOIN T_ROLE_MENU rm ON m.menu_no = rm.menu_no
      LEFT JOIN T_USER_ROLE ur ON rm.role_no = ur.role_no AND ur.user_id = ?
      WHERE m.is_board = 'Y' AND m.use_yn = 'Y' AND m.del_yn = 'N'
    `;

    const queryParams: any[] = [session.user_id, session.user_id];

    if (ownBoardsOnly) {
      queryStr += ` AND (m.is_public = 'Y' OR (m.is_public = 'N' AND m.created_by = ?))`;
      queryParams.push(session.user_no);
    }

    queryStr += `
      GROUP BY m.menu_no, m.menu_name, m.board_code, m.is_public, m.created_at, m.board_sort, rm.can_read, m.created_by
      ORDER BY m.board_sort ASC, m.created_at DESC
    `;

    const [rows] = await db.query<RowDataPacket[]>(queryStr, queryParams);

    // Deduplicate: prefer has_access = 1 if multiple roles give access
    const uniqueBoards = new Map();
    rows.forEach(r => {
      const entry = uniqueBoards.get(r.menu_no);
      if (!entry || r.has_access === 1) {
        uniqueBoards.set(r.menu_no, {
          menu_no: r.menu_no,
          menu_name: r.menu_name,
          board_code: r.board_code,
          is_public: r.is_public,
          created_at: r.created_at,
          board_sort: r.board_sort,
          has_access: r.has_access === 1,
          post_count: Number(r.post_count) || 0,
          has_new: r.has_new === 1,
        });
      }
    });

    return NextResponse.json({ categories: Array.from(uniqueBoards.values()) }, { status: 200 });
  } catch (error) {
    console.error('Board categories error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
