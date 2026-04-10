import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const searchTerm = `%${query}%`;

    // In current T_USER schema, user_id serves as the main business identifier (and login ID).
    // The query excludes the current user themselves from the invitation list
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT user_id, user_name, user_id as login_id 
       FROM T_USER 
       WHERE user_id != ? AND (user_name LIKE ? OR user_id LIKE ?)
       ORDER BY user_name ASC`,
      [session.user_id, searchTerm, searchTerm]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
