import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> | { userId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { userId } = resolvedParams;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Auth check
    const [roles] = await db.query<RowDataPacket[]>(`
      SELECT 1 FROM T_USER_ROLE ur
      JOIN T_ROLE_MENU rm ON ur.role_no = rm.role_no
      JOIN T_MENU m ON rm.menu_no = m.menu_no
      WHERE ur.user_id = ? AND m.url LIKE '/user/user-admin%' AND rm.can_write = 1
    `, [session.user_id]);

    if (roles.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Toggle lock status based on user_no
    // First, find the user
    const [users] = await db.query<RowDataPacket[]>(
      'SELECT user_no, is_locked FROM T_USER WHERE user_no = ?',
      [userId] // Note: userId is actually user_no in my route params based on what the frontend passes usually, let's accept user_no as the param.
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentLockStatus = users[0].is_locked;
    const newLockStatus = currentLockStatus === 1 ? 0 : 1;

    // Do not allow locking oneself
    if (users[0].user_no === session.user_no) {
      return NextResponse.json({ error: 'Cannot lock yourself' }, { status: 400 });
    }

    await db.query(
      'UPDATE T_USER SET is_locked = ? WHERE user_no = ?',
      [newLockStatus, userId]
    );

    return NextResponse.json({ 
      message: newLockStatus === 1 ? '계정이 잠겼습니다.' : '계정 잠금이 해제되었습니다.',
      is_locked: newLockStatus === 1
    }, { status: 200 });

  } catch (error) {
    console.error('Lock user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
