import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/session';
import { RowDataPacket } from 'mysql2';
import { decryptMessage } from '@/lib/encryption';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = session.user_id;

    // Fetch the rooms the user is in, formatting unread counts and total members
    const [rooms] = await db.query<RowDataPacket[]>(
      `SELECT 
         cr.room_no, 
         IF(cr.room_type = 'PRIVATE',
            COALESCE((SELECT u.user_name FROM T_CHAT_MEMBER m2 JOIN T_USER u ON m2.user_id = u.user_id WHERE m2.room_no = cr.room_no AND m2.user_id != ? LIMIT 1), cr.room_name),
            cr.room_name
         ) as room_name, 
         cr.room_type,
         cr.created_at,
         -- Count total members in the room
         (SELECT COUNT(*) FROM T_CHAT_MEMBER cm2 WHERE cm2.room_no = cr.room_no) as member_count,
         -- Count unread messages (messages created after last_read_time)
         (SELECT COUNT(*) 
          FROM T_CHAT_MESSAGE cmsg 
          WHERE cmsg.room_no = cr.room_no 
          AND cmsg.created_at > cm.last_read_time) as unread_count,
          -- Last message content to optionally display later
         (SELECT content FROM T_CHAT_MESSAGE cmsg2 WHERE cmsg2.room_no = cr.room_no ORDER BY created_at DESC LIMIT 1) as last_message,
         (SELECT created_at FROM T_CHAT_MESSAGE cmsg3 WHERE cmsg3.room_no = cr.room_no ORDER BY created_at DESC LIMIT 1) as last_message_time
       FROM T_CHAT_MEMBER cm
       JOIN T_CHAT_ROOM cr ON cm.room_no = cr.room_no
       WHERE cm.user_id = ?
       ORDER BY COALESCE(last_message_time, cr.created_at) DESC`,
      [userId, userId]
    );

    // Decrypt the last message for display
    const decryptedRooms = rooms.map(room => ({
      ...room,
      last_message: room.last_message ? decryptMessage(room.last_message) : null
    }));

    return NextResponse.json(decryptedRooms);
  } catch (error) {
    console.error('Failed to fetch my chat rooms:', error);
    return NextResponse.json({ error: 'Failed to fetch my chat rooms' }, { status: 500 });
  }
}
