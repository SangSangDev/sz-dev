export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';
import { decryptDeterministic } from '@/lib/encryption';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optionally check if the user is an admin.
    // Assuming for now that only authorized menus are accessible, we can add a check if needed.
    // Let's rely on the menu access rules, but it's safe to allow reading basic user info for admins.
    
    // Check if the user really has access to the user-admin menu
    const [roles] = await db.query<RowDataPacket[]>(`
      SELECT 1 FROM T_USER_ROLE ur
      JOIN T_ROLE_MENU rm ON ur.role_no = rm.role_no
      JOIN T_MENU m ON rm.menu_no = m.menu_no
      WHERE ur.user_id = ? AND m.url LIKE '/user/user-admin%' AND rm.can_read = 1
    `, [session.user_id]);

    if (roles.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [users] = await db.query<RowDataPacket[]>(`
      SELECT user_no, user_id, email, user_name, is_locked, last_login_at, created_at
      FROM T_USER
      ORDER BY created_at DESC
    `);

    const decryptedUsers = users.map(u => ({
      ...u,
      email: decryptDeterministic(u.email),
      is_locked: u.is_locked === 1
    }));

    return NextResponse.json({ users: decryptedUsers }, { status: 200 });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
