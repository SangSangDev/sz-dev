import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: '새 비밀번호는 특수 문자를 포함하여 더욱 안전하게 설정해주세요.' }, { status: 400 });
    }

    // Hash current password to compare
    const hashedCurrentPassword = crypto.createHash('sha256').update(currentPassword).digest('hex');

    // Get user from DB
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT password FROM T_USER WHERE user_id = ? AND password = ?',
      [session.user_id, hashedCurrentPassword]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: '현재 비밀번호가 일치하지 않습니다.' }, { status: 401 });
    }

    // Hash new password
    const hashedNewPassword = crypto.createHash('sha256').update(newPassword).digest('hex');

    // Update DB
    await db.query(
      'UPDATE T_USER SET password = ? WHERE user_id = ?',
      [hashedNewPassword, session.user_id]
    );

    return NextResponse.json({ message: '비밀번호가 성공적으로 변경되었습니다.' }, { status: 200 });

  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
