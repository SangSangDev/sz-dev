import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import redis from '@/lib/redis';
import { encryptMessage } from '@/lib/encryption';
import { RowDataPacket } from 'mysql2';

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { roomId } = await context.params;
    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Valid userIds array is required' }, { status: 400 });
    }

    // Process new members
    let newMembersCount = 0;
    const addedUserNames: string[] = [];

    // Retrieve usernames for the invited users (to create the system message)
    const placeholders = userIds.map(() => '?').join(',');
    const [users] = await db.query<RowDataPacket[]>(
      `SELECT user_id, user_name FROM T_USER WHERE user_id IN (${placeholders})`,
      userIds
    );

    const userMap = new Map();
    users.forEach(u => userMap.set(u.user_id, u.user_name));

    for (const userId of userIds) {
      // Use INSERT IGNORE to prevent duplicate error if they are already in the room
      const [result] = await db.query<any>(
        `INSERT IGNORE INTO T_CHAT_MEMBER (room_no, user_id) VALUES (?, ?)`,
        [roomId, userId]
      );
      if (result.affectedRows > 0) {
        newMembersCount++;
        if (userMap.has(userId)) {
          addedUserNames.push(userMap.get(userId));
        }
      }
    }

    if (newMembersCount === 0) {
      return NextResponse.json({ success: true, message: 'No new members were added (they might already be in the room).' });
    }

    // Generate System Message
    // e.g. "Hong님이 John님, Jane님을 초대했습니다."
    const inviteeNames = addedUserNames.join(', ');
    const sysMsg = `${session.user_name}님이 ${inviteeNames}님을 초대했습니다.`;
    const encryptedMsg = encryptMessage(sysMsg);

    const [insertRes] = await db.query<any>(
      `INSERT INTO T_CHAT_MESSAGE (room_no, user_id, content) VALUES (?, 'SYSTEM', ?)`,
      [roomId, encryptedMsg]
    );

    const fullMessage = {
      msg_no: insertRes.insertId,
      room_no: roomId,
      user_id: 'SYSTEM',
      user_name: '시스템',
      content: sysMsg,
      created_at: new Date().toISOString()
    };

    // Publish to the room
    await redis.publish(`chat:room:${roomId}`, JSON.stringify(fullMessage));

    // Also notify all members in the room so the new users' room list updates in real-time
    const [memberRows] = await db.query<RowDataPacket[]>(
      `SELECT user_id FROM T_CHAT_MEMBER WHERE room_no = ?`,
      [roomId]
    );

    const publishPromises = memberRows.map(row => 
      redis.publish(`chat:user:${row.user_id}`, JSON.stringify({
        type: 'NEW_MESSAGE',
        room_no: roomId,
        message: fullMessage
      }))
    );
    await Promise.all(publishPromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to add members:', error);
    return NextResponse.json({ error: 'Failed to add members' }, { status: 500 });
  }
}
