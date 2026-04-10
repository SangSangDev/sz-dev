import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import ChatRoomClient from './ChatRoomClient';
import db from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export default async function ChatRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }

  const { roomId } = await params;

  // Fetch the room name (with override for PRIVATE chats)
  const [rooms] = await db.query<RowDataPacket[]>(
    `SELECT 
       IF(room_type = 'PRIVATE',
          COALESCE((SELECT u.user_name FROM T_CHAT_MEMBER m JOIN T_USER u ON m.user_id = u.user_id WHERE m.room_no = ? AND m.user_id != ? LIMIT 1), room_name),
          room_name
       ) as room_name,
       room_type,
       created_by
     FROM T_CHAT_ROOM 
     WHERE room_no = ?`, 
    [roomId, session.user_id, roomId]
  );
  
  const room = rooms[0];
  const roomName = room ? room.room_name : '알 수 없는 대화방';
  const roomType = room ? room.room_type : 'PUBLIC';
  const createdBy = room ? room.created_by : null;

  return <ChatRoomClient roomId={roomId} roomName={roomName} roomType={roomType} createdBy={createdBy} currentUser={{ user_id: session.user_id, user_name: session.user_name }} />;
}
