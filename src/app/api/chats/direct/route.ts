import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import redis from '@/lib/redis';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    const myUserId = session.user_id;

    if (myUserId === targetUserId) {
      return NextResponse.json({ error: 'Cannot create a direct chat with yourself' }, { status: 400 });
    }

    // 1. Find if a 1:1 room already exists between these two users
    // Criteria: room_type='PRIVATE', EXACTLY 2 members, and those members are myUserId and targetUserId.
    const [existing] = await db.query<RowDataPacket[]>(
      `SELECT r.room_no 
       FROM T_CHAT_MEMBER r
       JOIN (
           SELECT m.room_no, COUNT(*) as cnt
           FROM T_CHAT_MEMBER m
           JOIN T_CHAT_ROOM c ON m.room_no = c.room_no
           WHERE c.room_type = 'PRIVATE'
           GROUP BY m.room_no
           HAVING cnt = 2
       ) t ON r.room_no = t.room_no
       WHERE r.user_id IN (?, ?)
       GROUP BY r.room_no
       HAVING COUNT(*) = 2
       LIMIT 1`,
      [myUserId, targetUserId]
    );

    if (existing.length > 0) {
      // Direct room already exists, return it
      return NextResponse.json({ room_no: existing[0].room_no, isNew: false });
    }

    // 2. Fetch target user's name to set a default room name
    const [targetUserRows] = await db.query<RowDataPacket[]>(
      `SELECT user_name FROM T_USER WHERE user_id = ?`,
      [targetUserId]
    );

    if (targetUserRows.length === 0) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const targetUserName = targetUserRows[0].user_name;
    const defaultRoomName = `${session.user_name}, ${targetUserName}`;

    // 3. Create a new 1:1 Room
    const [[{ room_no: generatedRoomNo }]] = await db.query<any>('SELECT FN_GEN_ID() as room_no');
    
    await db.query<ResultSetHeader>(
      `INSERT INTO T_CHAT_ROOM (room_no, room_name, room_type, created_by) VALUES (?, ?, 'PRIVATE', ?)`,
      [generatedRoomNo, defaultRoomName, myUserId]
    );

    // 4. Insert both members
    await db.query(
      `INSERT INTO T_CHAT_MEMBER (room_no, user_id) VALUES (?, ?), (?, ?)`,
      [generatedRoomNo, myUserId, generatedRoomNo, targetUserId]
    );

    // 5. Notify both users via Redis to update their chat feeds
    const payload = JSON.stringify({
      type: 'NEW_ROOM',
      room_no: generatedRoomNo,
      room_name: defaultRoomName
    });

    await Promise.all([
      redis.publish(`chat:user:${myUserId}`, payload),
      redis.publish(`chat:user:${targetUserId}`, payload)
    ]);

    return NextResponse.json({ room_no: generatedRoomNo, isNew: true });
  } catch (err) {
    console.error('Failed to create or find direct chat:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
