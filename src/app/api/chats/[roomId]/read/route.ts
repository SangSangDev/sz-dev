import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { roomId } = await context.params;
    const userId = session.user_id;

    await db.query(
      `UPDATE T_CHAT_MEMBER SET last_read_time = CURRENT_TIMESTAMP WHERE room_no = ? AND user_id = ?`,
      [roomId, userId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update read status:', error);
    return NextResponse.json({ error: 'Failed to update read status' }, { status: 500 });
  }
}
