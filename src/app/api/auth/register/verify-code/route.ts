import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import { encryptDeterministic } from '@/lib/encryption';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ error: '이메일과 인증번호를 모두 입력해주세요.' }, { status: 400 });
    }

    const encryptedEmail = encryptDeterministic(email);

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM T_EMAIL_VERIFICATION WHERE email = ?',
      [encryptedEmail]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: '인증 번호를 요청한 내역이 없습니다.' }, { status: 400 });
    }

    const verificationRecord = rows[0];

    // Check expiration
    if (new Date() > new Date(verificationRecord.expires_at)) {
      return NextResponse.json({ error: '인증 코드가 만료되었습니다. 다시 요청해주세요.' }, { status: 400 });
    }

    // Check code match
    if (verificationRecord.code !== code) {
      return NextResponse.json({ error: '인증 코드가 일치하지 않습니다.' }, { status: 400 });
    }

    // Mark as verified
    await db.query(
      'UPDATE T_EMAIL_VERIFICATION SET is_verified = 1 WHERE email = ?',
      [encryptedEmail]
    );

    return NextResponse.json({ message: '이메일 인증이 완료되었습니다.' }, { status: 200 });
  } catch (error) {
    console.error('Verify email code error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
