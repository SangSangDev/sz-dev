import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import redis from '@/lib/redis';

export async function POST(request: Request) {
  const connection = await db.getConnection();
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { roomName, userIds } = await request.json();
    
    if (!roomName || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const members = Array.from(new Set([...userIds, session.user_id]));

    await connection.beginTransaction();

    // 1. Generate Room ID and Insert
    // Use MySQL CONV(UUID_SHORT(), 10, 36) manually or use a simple random string for JS since we are not in pure SQL.
    // Wait, the FN_GEN_ID() is available in DB.
    const [[{ room_no }]] = await connection.query<any>('SELECT FN_GEN_ID() as room_no');

    await connection.query(
      `INSERT INTO T_CHAT_ROOM (room_no, room_name, room_type, created_by) VALUES (?, ?, 'PUBLIC', ?)`,
      [room_no, roomName, session.user_id]
    );

    // 2. Insert Members
    const memberValues = members.map(uid => [room_no, uid]);
    await connection.query(
      `INSERT INTO T_CHAT_MEMBER (room_no, user_id) VALUES ?`,
      [memberValues]
    );

    await connection.commit();

    // Broadcast new room event to other members
    const invitedMembers = members.filter(uid => uid !== session.user_id);
    if (invitedMembers.length > 0) {
      try {
        const inviterName = session.user_name || session.user_id;

        // 1. Publish NEW_ROOM specifically for real-time unread chat count & toast
        const payload = JSON.stringify({
          type: 'NEW_ROOM',
          room_no,
          room_name: roomName,
          inviter: inviterName
        });
        
        const pipeline = redis.pipeline();
        invitedMembers.forEach(uid => {
          pipeline.publish(`chat:user:${uid}`, payload);
        });
        await pipeline.exec();

        // 2. Dispatch standardized notifications
        const { sendNotification } = await import('@/lib/notifications');
        const targetUrl = `/chats/${room_no}`;
        const message = `${inviterName}님이 '${roomName}' 그룹 채팅방에 초대했습니다.`;
        
        await Promise.all(
          invitedMembers.map(uid => 
            sendNotification(session.user_id, uid, 'CHAT_INVITE', targetUrl, message)
          )
        );

      } catch (redisErr) {
        console.error('Failed to broadcast new room or push notifications:', redisErr);
        // We do not fail the request if redis broadcast fails
      }
    }

    return NextResponse.json({ room_no });
  } catch (error) {
    await connection.rollback();
    console.error('Failed to create chat room:', error);
    return NextResponse.json({ error: 'Failed to create chat room' }, { status: 500 });
  } finally {
    connection.release();
  }
}
