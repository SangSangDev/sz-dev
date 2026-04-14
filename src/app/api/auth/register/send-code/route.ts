import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import nodemailer from 'nodemailer';
import { encryptDeterministic } from '@/lib/encryption';
import redis from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: '이메일 주소를 입력해주세요.' }, { status: 400 });
    }

    // Rate Limiting (Daily limit to prevent billing/spam issues)
    const todayStr = new Date().toISOString().split('T')[0];
    const dailyLimitKey = `email_daily_limit_${todayStr}`;
    const currentCount = await redis.get(dailyLimitKey);
    
    if (currentCount && parseInt(currentCount, 10) >= 490) { // Safety buffer at 490
      return NextResponse.json({ error: '인증 문자(메일) 발송 한도가 초과되었습니다. 관리자에게 문의해주세요.' }, { status: 429 });
    }

    // Check if email already exists in T_USER
    const encryptedEmail = encryptDeterministic(email);
    
    const [existingUsers] = await db.query<RowDataPacket[]>(
      'SELECT user_no FROM T_USER WHERE email = ?',
      [encryptedEmail]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json({ error: '해당 이메일로 이미 가입된 계정이 존재합니다.' }, { status: 400 });
    }

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // UPSERT into T_EMAIL_VERIFICATION
    await db.query(`
      INSERT INTO T_EMAIL_VERIFICATION (email, code, expires_at, is_verified)
      VALUES (?, ?, ?, 0)
      ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at), is_verified = 0
    `, [encryptedEmail, code, expiresAt]);

    // Increase daily counter
    await redis.incr(dailyLimitKey);
    if (!currentCount) {
      await redis.expire(dailyLimitKey, 60 * 60 * 24 * 2); // Auto-delete after 2 days
    }

    // Send email via nodemailer (or mock)
    // If SMTP host is configured in .env, use it. Otherwise, log it.
    if (process.env.SMTP_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"SZ WORKS Registration" <${process.env.SMTP_FROM || 'no-reply@sz-works.com'}>`,
        to: email,
        subject: '[SZ WORKS] 회원가입 이메일 인증 번호',
        text: `인증 번호: ${code}\n\n5분 내에 입력해주세요.`,
        html: `
          <div style="font-family: sans-serif; padding: 2rem; background-color: #f7f9fc;">
            <div style="max-width: 500px; margin: 0 auto; background-color: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <h2 style="color: #333; margin-top: 0;">SZ WORKS 회원가입 인증</h2>
              <p style="color: #666; font-size: 1rem; margin-bottom: 2rem;">요청하신 메일 인증 번호입니다. 아래 6자리 숫자를 가입 화면에 입력해주세요.</p>
              <div style="background-color: #f0f2f5; padding: 1rem; border-radius: 0.5rem; text-align: center; font-size: 2rem; font-weight: bold; letter-spacing: 0.5rem; color: #5B5FC7;">
                ${code}
              </div>
              <p style="color: #999; font-size: 0.875rem; margin-top: 2rem;">* 본 인증 번호는 5분 후 만료됩니다.</p>
            </div>
          </div>
        `
      });
      console.log(`✅ Email sent to ${email}`);
    } else {
      // Mocking for Local Dev
      console.log('\n==============================================');
      console.log(`🚀 [MOCK EMAIL] To: ${email}`);
      console.log(`🔑 [VERIFICATION CODE]: ${code}`);
      console.log('==============================================\n');
    }

    return NextResponse.json({ message: '인증번호가 발송되었습니다.' }, { status: 200 });
  } catch (error) {
    console.error('Send verification code error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
