import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';
import redis from '@/lib/redis';
import { encryptMessage } from '@/lib/encryption';

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { roomId } = await context.params;

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT room_no, room_name, room_type, created_by, created_at FROM T_CHAT_ROOM WHERE room_no = ?`,
      [roomId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Chat room not found' }, { status: 404 });
    }

    return NextResponse.json({ room: rows[0] });
  } catch (error) {
    console.error('Failed to fetch chat room:', error);
    return NextResponse.json({ error: 'Failed to fetch chat room' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { roomId } = await context.params;
    const { roomName } = await request.json();

    if (!roomName || !roomName.trim()) {
      return NextResponse.json({ error: 'Bad Request: roomName required' }, { status: 400 });
    }

    await db.query(
      `UPDATE T_CHAT_ROOM SET room_name = ? WHERE room_no = ?`,
      [roomName.trim(), roomId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update chat room:', error);
    return NextResponse.json({ error: 'Failed to update chat room' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ roomId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = session.user_id;
    const { roomId } = await context.params;

    // 1. User leaves the room
    await db.query(`DELETE FROM T_CHAT_MEMBER WHERE room_no = ? AND user_id = ?`, [roomId, userId]);

    // 2. Check if there are any remaining members
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM T_CHAT_MEMBER WHERE room_no = ?`, 
      [roomId]
    );

    const remainingMembers = rows[0].count;

    // 3. If no members left, completely destroy the room
    if (remainingMembers === 0) {
      await db.query(`DELETE FROM T_CHAT_MESSAGE WHERE room_no = ?`, [roomId]);
      await db.query(`DELETE FROM T_CHAT_ROOM WHERE room_no = ?`, [roomId]);
    } else {
      // 4. Send SYSTEM message so others know this user left
      const sysMsg = `${session.user_name}님이 나갔습니다.`;
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

      await redis.publish(`chat:room:${roomId}`, JSON.stringify(fullMessage));

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
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chat room:', error);
    return NextResponse.json({ error: 'Failed to delete chat room' }, { status: 500 });
  }
}
