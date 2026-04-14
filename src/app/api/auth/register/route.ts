import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';
import { RowDataPacket } from 'mysql2';
import { encryptDeterministic } from '@/lib/encryption';

export async function POST(request: Request) {
  try {
    const { user_id, email, password, user_name } = await request.json();

    if (!user_id || !email || !password || !user_name) {
      return NextResponse.json({ error: '모든 필드를 입력해야 합니다.' }, { status: 400 });
    }

    // Check if email is verified using encrypted email
    const encryptedEmail = encryptDeterministic(email);

    const [verificationRows] = await db.query<RowDataPacket[]>(
      'SELECT is_verified FROM T_EMAIL_VERIFICATION WHERE email = ?',
      [encryptedEmail]
    );

    if (verificationRows.length === 0 || verificationRows[0].is_verified !== 1) {
      return NextResponse.json({ error: '이메일 인증이 완료되지 않았습니다.' }, { status: 400 });
    }

    // Check duplicate user_id
    const [idCheck] = await db.query<RowDataPacket[]>(
      'SELECT user_no FROM T_USER WHERE user_id = ?',
      [user_id]
    );

    if (idCheck.length > 0) {
      return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 400 });
    }

    // Check duplicate email (just in case, though handled mostly by verification layer)
    const [emailCheck] = await db.query<RowDataPacket[]>(
      'SELECT user_no FROM T_USER WHERE email = ?',
      [encryptedEmail]
    );

    if (emailCheck.length > 0) {
      return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

    // Create User
    const [[{ new_id }]] = await db.query<RowDataPacket[]>('SELECT FN_GEN_ID() AS new_id');
    const user_no = new_id;

    await db.query(
      'INSERT INTO T_USER (user_no, user_id, email, password, user_name, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [user_no, user_id, encryptedEmail, hashedPassword, user_name]
    );

    // Assign Default Role (ROLE_USER)
    const [roles] = await db.query<RowDataPacket[]>("SELECT role_no FROM T_ROLE WHERE role_name = 'ROLE_USER'");
    if (roles.length > 0) {
      const role_no = roles[0].role_no;
      await db.query(
        'INSERT INTO T_USER_ROLE (user_id, role_no) VALUES (?, ?)',
        [user_id, role_no] // Note: T_USER_ROLE associates via user_id according to previous logic
      );
    }

    // Clean up verification record
    await db.query('DELETE FROM T_EMAIL_VERIFICATION WHERE email = ?', [encryptedEmail]);

    return NextResponse.json({ message: '회원가입이 완료되었습니다.' }, { status: 200 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
