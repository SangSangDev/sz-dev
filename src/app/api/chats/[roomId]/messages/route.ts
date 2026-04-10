import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import redis from '@/lib/redis';
import { RowDataPacket } from 'mysql2';
import { encryptMessage, decryptMessage } from '@/lib/encryption';

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { roomId } = await context.params;

    // Retrieve the last 50 messages from the database
    const [messages] = await db.query<RowDataPacket[]>(
      `SELECT m.msg_no, m.room_no, m.user_id, m.content, m.created_at, u.user_name
       FROM T_CHAT_MESSAGE m
       LEFT JOIN T_USER u ON m.user_id = u.user_id
       WHERE m.room_no = ?
       ORDER BY m.created_at ASC
       LIMIT 50`,
      [roomId]
    );

    // Decrypt messages securely
    const decryptedMessages = messages.map(m => ({
      ...m,
      content: decryptMessage(m.content)
    }));

    return NextResponse.json(decryptedMessages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { roomId } = await context.params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content implies empty' }, { status: 400 });
    }

    const userId = session.user_id;

    // 1. Encrypt message securely before inserting to DB
    const encryptedContent = encryptMessage(content);

    // 2. Insert message to DB
    const [result] = await db.query<any>(
      `INSERT INTO T_CHAT_MESSAGE (room_no, user_id, content) VALUES (?, ?, ?)`,
      [roomId, userId, encryptedContent]
    );

    const msgNo = result.insertId;

    // 2. Fetch constructed message to get exact timestamp and user_name
    const [msgRow] = await db.query<RowDataPacket[]>(
      `SELECT m.msg_no, m.room_no, m.user_id, m.content, m.created_at, u.user_name
       FROM T_CHAT_MESSAGE m
       LEFT JOIN T_USER u ON m.user_id = u.user_id
       WHERE m.msg_no = ?`,
      [msgNo]
    );

    const fullMessage = msgRow[0];
    
    // Decrypt the content for Redis broadcast (messages over WebSocket don't need rest-encryption wrapper if SSL is used, but DB storage must be encrypted)
    fullMessage.content = decryptMessage(fullMessage.content);

    // 3. Publish to Room channel so users inside the room chat view receive it
    await redis.publish(`chat:room:${roomId}`, JSON.stringify(fullMessage));

    // 4. Fetch all members in this room to broadcast to their global list view feeds
    const [memberRows] = await db.query<RowDataPacket[]>(
      `SELECT user_id FROM T_CHAT_MEMBER WHERE room_no = ?`,
      [roomId]
    );

    // Publish to each member's personal channel
    const publishPromises = memberRows.map(row => 
      redis.publish(`chat:user:${row.user_id}`, JSON.stringify({
        type: 'NEW_MESSAGE',
        room_no: roomId,
        message: fullMessage
      }))
    );
    await Promise.all(publishPromises);

    // Optimistically update sender's last_read_time to now
    await db.query(`UPDATE T_CHAT_MEMBER SET last_read_time = CURRENT_TIMESTAMP WHERE room_no = ? AND user_id = ?`, [roomId, userId]);

    return NextResponse.json({ success: true, message: fullMessage });
  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
