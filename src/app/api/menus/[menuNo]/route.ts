import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request, { params }: { params: Promise<{ menuNo: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { menuNo } = await params;

    const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM T_MENU WHERE menu_no = ? OR board_code = ?', [menuNo, menuNo]);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 });
    }

    return NextResponse.json({ menu: rows[0] });
  } catch (error) {
    console.error('Failed to get menu:', error);
    return NextResponse.json({ error: 'Failed to get menu' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ menuNo: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { menuNo } = await params;
    const body = await request.json();
    const { menuName, isPublic } = body;

    if (!menuName) {
      return NextResponse.json({ error: 'Menu name is required' }, { status: 400 });
    }

    await db.query(
      'UPDATE T_MENU SET menu_name = ?, is_public = ? WHERE menu_no = ? OR board_code = ?',
      [menuName, isPublic === 'Y' ? 'Y' : 'N', menuNo, menuNo]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update menu:', error);
    return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 });
  }
}
