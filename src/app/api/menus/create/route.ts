import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';


export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { menuName, isPublic } = body;

    if (!menuName) {
      return NextResponse.json({ error: 'Missing menu name' }, { status: 400 });
    }

    // Generate unique codes
    const boardCode = 'B_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const url = `/boards/${boardCode}`;

    // Get a unique menu_no
    const [idRows] = await db.query<RowDataPacket[]>('SELECT FN_GEN_ID() AS new_id');
    const menuNo = idRows[0].new_id;

    // Determine max sort_order
    const [sortRows] = await db.query<RowDataPacket[]>('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort FROM T_MENU');
    const sortOrder = sortRows[0].next_sort;

    // Insert new menu
    await db.query(`
      INSERT INTO T_MENU (menu_no, menu_name, url, sort_order, use_yn, del_yn, is_board, board_code, is_public, created_by)
      VALUES (?, ?, ?, ?, 'Y', 'N', 'Y', ?, ?, ?)
    `, [menuNo, menuName, url, sortOrder, boardCode, isPublic || 'Y', session.user_no]);

    // Grant read access to ALL roles for this new board menu
    const [allRoles] = await db.query<RowDataPacket[]>('SELECT role_no FROM T_ROLE');

    if (allRoles.length > 0) {
      const values = allRoles.map(r => [r.role_no, menuNo, 1, 0, 0]);
      await db.query(
        'INSERT IGNORE INTO T_ROLE_MENU (role_no, menu_no, can_read, can_write, can_delete) VALUES ?',
        [values]
      );

      // Additionally give the creator's role write & delete access
      const [creatorRoles] = await db.query<RowDataPacket[]>(
        'SELECT role_no FROM T_USER_ROLE WHERE user_id = ?',
        [session.user_id]
      );
      if (creatorRoles.length > 0) {
        for (const r of creatorRoles) {
          await db.query(
            'UPDATE T_ROLE_MENU SET can_write = 1, can_delete = 1 WHERE role_no = ? AND menu_no = ?',
            [r.role_no, menuNo]
          );
        }
      }
    }

    return NextResponse.json({ success: true, boardCode, url }, { status: 200 });
  } catch (error) {
    console.error('Menu create error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

