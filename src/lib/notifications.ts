import db from '@/lib/db';
import redisClient from '@/lib/redis';
import { RowDataPacket } from 'mysql2';

/**
 * Sends a real-time notification to a specific user.
 * 
 * @param actorId The ID of the user performing the action.
 * @param userId The ID of the user receiving the notification. If actorId === userId, the notification is NOT sent.
 * @param type The type of notification (e.g., 'POST_COMMENT', 'POST_REACTION', 'COMMENT_REACTION')
 * @param targetUrl The frontend URL to navigate to when the notification is clicked.
 * @param message The text content of the notification.
 */
export async function sendNotification(
  actorId: string,
  userId: string,
  type: string,
  targetUrl: string,
  message: string
) {
  try {
    // 1. Do not notify if the actor is the same as the target user
    if (actorId === userId) {
      return;
    }

    // 2. Generate new notification ID
    const [[{ notif_id }]] = await db.query<RowDataPacket[]>('SELECT FN_GEN_ID() AS notif_id');

    // 3. Insert notification into MySQL
    await db.query(`
      INSERT INTO T_NOTIFICATION (notif_no, user_id, actor_id, type, target_url, message, is_read)
      VALUES (?, ?, ?, ?, ?, ?, 'N')
    `, [notif_id, userId, actorId, type, targetUrl, message]);

    // 4. Publish real-time event to Redis
    const channel = `chat:user:${userId}`;
    await redisClient.publish(channel, JSON.stringify({ type: 'NEW_NOTIFICATION' }));
    
  } catch (err) {
    console.error('Failed to send notification via common utility:', err);
  }
}
