import Redis from 'ioredis';

function parseIntEnv(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const redisPort = parseIntEnv(process.env.REDIS_PORT, 6379);
const redisPassword = process.env.REDIS_PASSWORD;

const isProd = process.env.NODE_ENV === 'production';
const isRedisConfigured = Boolean(redisUrl || redisHost);

function createNoopRedis(): Redis {
  const pipeline = () => {
    const chain: any = {
      del: () => chain,
      get: () => chain,
      set: () => chain,
      incr: () => chain,
      decr: () => chain,
      expire: () => chain,
      sadd: () => chain,
      srem: () => chain,
      smembers: () => chain,
      sismember: () => chain,
      exists: () => chain,
      hgetall: () => chain,
      hset: () => chain,
      exec: async () => [],
    };
    return chain;
  };

  const noop: any = {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 0,
    incr: async () => 1,
    decr: async () => 0,
    expire: async () => 0,
    sadd: async () => 0,
    srem: async () => 0,
    smembers: async () => [],
    sismember: async () => 0,
    exists: async () => 0,
    hgetall: async () => ({}),
    hset: async () => 0,
    flushall: async () => 'OK',
    pipeline,
    on: () => noop,
  };

  return noop as Redis;
}

export const redis: Redis = (() => {
  // In production (Render), don't even attempt Redis unless explicitly configured.
  // This avoids 5s connect timeouts on every request when Redis isn't present.
  if (isProd && !isRedisConfigured) {
    return createNoopRedis();
  }

  const host = redisHost || '127.0.0.1';
  const client = redisUrl
    ? new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        connectTimeout: 1500,
      })
    : new Redis({
        host,
        port: redisPort,
        password: redisPassword,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        connectTimeout: 1500,
      });

  client.on('error', (err) => {
    // Avoid crashing the app on transient Redis failures.
    // Call sites that treat Redis as a cache should handle failures gracefully.
    const message = err instanceof Error ? err.message : String(err);
    console.error('[redis] error', message);
  });

  return client;
})();
