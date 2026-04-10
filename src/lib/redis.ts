import DefaultRedis from 'ioredis';
import { config } from '@/config';

const globalForRedis = global as unknown as { redis: DefaultRedis };

export const redis =
  globalForRedis.redis ||
  new DefaultRedis(config.redis.url, {
    retryStrategy: (times) => {
      // 좀비 방지를 위해 처음엔 1초 단위로 재시도하다가, 
      // 실패가 누적되면 최대 10초에 한 번씩만 차분하게 재시도합니다. (기관총 이슈 방지)
      // null을 반환하여 영구적으로 연결을 끊는 대신, 이렇게 하면 레디스가 돌아왔을 때 서버 재시작 없이 자동 복구됩니다!
      return Math.min(times * 1000, 10000); 
    },
    maxRetriesPerRequest: 1
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
