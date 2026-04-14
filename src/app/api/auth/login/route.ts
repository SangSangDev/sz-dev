import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { createSession } from '@/lib/session';
import crypto from 'crypto';
import { RowDataPacket } from 'mysql2';
import { decryptDeterministic } from '@/lib/encryption';

export async function POST(request: Request) {
  try {
    const { user_id, password } = await request.json();

    if (!user_id || !password) {
      return NextResponse.json({ error: '아이디와 비밀번호를 모두 입력해주세요.' }, { status: 400 });
    }

    // Passwords in the db are hashed via SHA-256
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT user_no, user_id, email, user_name, is_locked FROM T_USER WHERE user_id = ? AND password = ?',
      [user_id, hashedPassword]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    const startUser = rows[0];

    if (startUser.is_locked === 1) {
      return NextResponse.json({ error: '관리자에 의해 접속이 차단된 계정입니다.' }, { status: 403 });
    }

    // Fetch user's menus based on their roles
    const [menuRows] = await db.query<RowDataPacket[]>(`
      SELECT m.menu_no, MAX(m.menu_name) as menu_name, MAX(m.url) as url, MAX(m.is_board) as is_board, 
             MAX(m.board_code) as board_code, MAX(m.is_public) as is_public, MAX(m.sort_order) as sort_order,
             MAX(rm.can_write) as can_write
      FROM T_USER_ROLE ur
      JOIN T_ROLE_MENU rm ON ur.role_no = rm.role_no
      JOIN T_MENU m ON rm.menu_no = m.menu_no
      WHERE ur.user_id = ? AND m.use_yn = 'Y' AND m.del_yn = 'N' AND rm.can_read = 1
      GROUP BY m.menu_no
      ORDER BY MAX(m.sort_order) ASC
    `, [startUser.user_id]);

    const user = {
      user_no: startUser.user_no,
      user_id: startUser.user_id,
      email: decryptDeterministic(startUser.email),
      user_name: startUser.user_name,
      menus: menuRows.map(m => ({
        menu_no: m.menu_no,
        menu_name: m.menu_name,
        url: m.url,
        is_board: m.is_board,
        board_code: m.board_code,
        is_public: m.is_public || 'Y',
        can_write: m.can_write === 1,
      })),
    };

    await createSession(user);

    // Update last_login_at
    await db.query(
      'UPDATE T_USER SET last_login_at = NOW() WHERE user_no = ?',
      [startUser.user_no]
    );

    return NextResponse.json({ user, message: 'Logged in successfully' }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
