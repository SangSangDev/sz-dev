import { cookies } from 'next/headers';
import { redis } from './redis';
import crypto from 'crypto';

export type MenuInfo = {
  menu_no: string;
  menu_name: string;
  url: string;
  is_board: string;
  board_code: string | null;
  is_public: string;
  can_write?: boolean;
  has_new?: boolean;
};

export type SessionUser = {
  user_no: string;
  user_id: string;
  user_name: string;
  menus: MenuInfo[];
};

const SESSION_COOKIE_NAME = 'sz_session';
const SESSION_EXPIRY = 60 * 60 * 24 * 7; // 7 days in seconds

export async function createSession(user: SessionUser) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  
  // 1. Kickout previous active session
  const oldSessionId = await redis.get(`user_session_map:${user.user_id}`);
  if (oldSessionId) {
    // Destroy the old session data
    await redis.del(`session:${oldSessionId}`);
    // Broadcast a KICKOUT message to that specific user across all clients
    await redis.publish(`chat:user:${user.user_id}`, JSON.stringify({ type: 'KICKOUT' }));
  }

  // 2. Set the newly created session id into the map
  await redis.set(`user_session_map:${user.user_id}`, sessionId, 'EX', SESSION_EXPIRY);
  
  // 3. Save standard session data
  await redis.set(`session:${sessionId}`, JSON.stringify(user), 'EX', SESSION_EXPIRY);
  
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    // secure: process.env.NODE_ENV === 'production', // [개발용 HTTP 임시 주석처리] 추후 HTTPS 도입 시 이 줄을 살리고 아래를 지우세요.
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_EXPIRY,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const sessionData = await redis.get(`session:${sessionId}`);
  if (!sessionData) {
    return null;
  }

  return JSON.parse(sessionData) as SessionUser;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    const sessionData = await redis.get(`session:${sessionId}`);
    if (sessionData) {
      try {
        const user = JSON.parse(sessionData);
        // Clean up session map mapping only if it matches this dying session
        const currentMappedSession = await redis.get(`user_session_map:${user.user_id}`);
        if (currentMappedSession === sessionId) {
          await redis.del(`user_session_map:${user.user_id}`);
        }
      } catch (e) {
        console.error('Error parsing session data during destroy');
      }
    }
    await redis.del(`session:${sessionId}`);
  }
  
  cookieStore.delete(SESSION_COOKIE_NAME);
}
