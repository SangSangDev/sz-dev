import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Checking if the user has dashboard write permission
    // A quick check using the auth endpoint approach, or by verifying the '대시보드' menu permission.
    const [menus] = await db.query<any[]>(`
      SELECT rm.can_write 
      FROM T_MENU m
      JOIN T_ROLE_MENU rm ON m.menu_no = rm.menu_no
      JOIN T_USER_ROLE ur ON rm.role_no = ur.role_no
      WHERE m.menu_name = '대시보드' AND ur.user_id = ? AND rm.can_write = 1
    `, [session.user_id]);

    if (menus.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Update sort order for each menu
      for (const update of updates) {
        if (!update.menu_no || typeof update.board_sort !== 'number') continue;
        
        await conn.query(
          'UPDATE T_MENU SET board_sort = ? WHERE menu_no = ?',
          [update.board_sort, update.menu_no]
        );
      }

      await conn.commit();
      return NextResponse.json({ success: true }, { status: 200 });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('Save board sort error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
