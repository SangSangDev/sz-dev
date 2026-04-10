import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import redis from '@/lib/redis';

export async function GET(request: Request, context: { params: Promise<{ boardId: string }> }) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { boardId } = await context.params;

  // We must create a new Redis connection strictly for subscribing
  const subscriber = redis.duplicate();

  subscriber.on('error', (err) => {
    console.error(`[Redis] Subscriber error for board ${boardId}:`, err);
    subscriber.quit();
  });

  await subscriber.subscribe(`board:${boardId}:events`);

  const readableStream = new ReadableStream({
    start(controller) {
      // 1. Initial connection keep-alive ping
      controller.enqueue(new TextEncoder().encode(': connected\n\n'));

      // 2. Listen to published messages
      subscriber.on('message', (channel, message) => {
        if (channel === `board:${boardId}:events`) {
          // Send SSE formatted data
          const dataFrame = `data: ${message}\n\n`;
          try {
            controller.enqueue(new TextEncoder().encode(dataFrame));
          } catch (e) {
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
    },
  });
}
