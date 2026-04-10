export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [rows] = await db.query<RowDataPacket[]>(`
      SELECT notif_no, user_id, actor_id, type, target_url, message, is_read, created_at
      FROM T_NOTIFICATION
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `, [session.user_id]);

    return NextResponse.json({ notifications: rows });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
