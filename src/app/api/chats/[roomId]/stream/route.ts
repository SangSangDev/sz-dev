import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import redis from '@/lib/redis';

export async function GET(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { roomId } = await context.params;

  // We must create a new Redis connection strictly for subscribing, because a Redis
  // client in "subscriber" mode cannot issue normal commands (like get, set, etc).
  const subscriber = redis.duplicate();

  subscriber.on('error', (err) => {
    console.error(`[Redis] Subscriber error for room ${roomId}:`, err);
    subscriber.quit();
  });

  await subscriber.subscribe(`chat:room:${roomId}`);

  const readableStream = new ReadableStream({
    start(controller) {
      // 1. Initial connection keep-alive headers/ping
      controller.enqueue(new TextEncoder().encode(': connected\n\n'));

      // 2. Listen to published messages
      subscriber.on('message', (channel, message) => {
        if (channel === `chat:room:${roomId}`) {
          // Send SSE formatted data
          const dataFrame = `data: ${message}\n\n`;
          try {
            controller.enqueue(new TextEncoder().encode(dataFrame));
          } catch (e) {
            // controller might be close remotely
            subscriber.unsubscribe();
            subscriber.quit();
          }
        }
      });

      // Keep alive ping every 15s to prevent cloud timeouts
      const interval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'));
        } catch (e) {
          clearInterval(interval);
        }
      }, 15000);

      // 3. Cleanup when connection closes
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        subscriber.unsubscribe();
        subscriber.quit();
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      subscriber.unsubscribe();
      subscriber.quit();
    }
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Content-Encoding': 'none',
    },
  });
}
