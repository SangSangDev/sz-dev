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

    const { role_no } = await request.json();
    if (!role_no) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    const resolvedParams = await params;
    const { userId: user_no } = resolvedParams;
    if (!user_no) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Auth check: verify caller is an admin capable of user-admin writes
    const [authRoles] = await db.query<RowDataPacket[]>(`
      SELECT 1 FROM T_USER_ROLE ur
      JOIN T_ROLE_MENU rm ON ur.role_no = rm.role_no
      JOIN T_MENU m ON rm.menu_no = m.menu_no
      WHERE ur.user_id = ? AND m.url LIKE '/user/user-admin%' AND rm.can_write = 1
    `, [session.user_id]);

    if (authRoles.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify user exists and get user_id because T_USER_ROLE uses user_id
    const [users] = await db.query<RowDataPacket[]>(
      'SELECT user_id FROM T_USER WHERE user_no = ?',
      [user_no]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const targetUserId = users[0].user_id;

    // Verify role exists
    const [validRoles] = await db.query<RowDataPacket[]>(
      'SELECT role_no FROM T_ROLE WHERE role_no = ?',
      [role_no]
    );

    if (validRoles.length === 0) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Since our system design associates multiple roles but typically manages one for simple apps,
    // we will completely replace any existing roles with this new role for this user.
    await db.query('DELETE FROM T_USER_ROLE WHERE user_id = ?', [targetUserId]);
    await db.query('INSERT INTO T_USER_ROLE (user_id, role_no) VALUES (?, ?)', [targetUserId, role_no]);

    return NextResponse.json({ message: '사용자 역할이 변경되었습니다.' }, { status: 200 });

  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
