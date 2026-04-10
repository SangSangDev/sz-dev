export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';

export async function PATCH(request: Request, context: unknown) {
  const resolvedParams = await (context as { params: Promise<{ notifNo: string }> }).params;
  const notifNo = resolvedParams.notifNo;

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (notifNo === 'all') {
      await db.query(`
        UPDATE T_NOTIFICATION
        SET is_read = 'Y'
        WHERE user_id = ?
      `, [session.user_id]);
    } else {
      await db.query(`
        UPDATE T_NOTIFICATION
        SET is_read = 'Y'
        WHERE notif_no = ? AND user_id = ?
      `, [notifNo, session.user_id]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Read notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
