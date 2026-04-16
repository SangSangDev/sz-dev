export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [[row]] = await db.query<RowDataPacket[]>(`
        SELECT COUNT(*) as count 
        FROM T_NOTIFICATION 
        WHERE user_id = ? AND is_read = 'N' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, [session.user_id]);

    return NextResponse.json({ count: row.count });
  } catch (error) {
    console.error('Fetch notifications unread count error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
