import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import redis from '@/lib/redis';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const userId = session.user_id;
  const subscriber = redis.duplicate();
  
  subscriber.on('error', (err) => {
    console.error(`[Redis] Subscriber error for user ${userId}:`, err);
    subscriber.quit();
  });

  await subscriber.subscribe(`chat:user:${userId}`);

  const readableStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(': connected\n\n'));

      subscriber.on('message', (channel, message) => {
        if (channel === `chat:user:${userId}`) {
          const dataFrame = `data: ${message}\n\n`;
          try {
            controller.enqueue(new TextEncoder().encode(dataFrame));
          } catch (e) {
            subscriber.unsubscribe();
            subscriber.quit();
          }
        }
      });

      const interval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'));
        } catch (e) {
          clearInterval(interval);
        }
      }, 15000);

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
