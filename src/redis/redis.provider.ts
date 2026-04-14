import Redis from 'ioredis';

function parseIntEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseIntEnv(process.env.REDIS_PORT, 6379);
const redisPassword = process.env.REDIS_PASSWORD;

export const redis = redisUrl
  ? new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      connectTimeout: 5000,
    })
  : new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      connectTimeout: 5000,
    });

redis.on('error', (err) => {
  // Avoid crashing the app on transient Redis failures.
  // Call sites that treat Redis as a cache should handle failures gracefully.
  const message = err instanceof Error ? err.message : String(err);
  console.error('[redis] error', message);
});
