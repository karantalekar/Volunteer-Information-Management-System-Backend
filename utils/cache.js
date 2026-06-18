import { getRedisClient } from "../config/redis.js";

const CACHE_KEYS = {
  adminStats: "stats:admin",
};

const getCache = async (key) => {
  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error(`Cache read failed for ${key}:`, error.message);
    return null;
  }
};

const setCache = async (key, value, ttlSeconds = 60) => {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    await redis.set(key, JSON.stringify(value), {
      EX: ttlSeconds,
    });
  } catch (error) {
    console.error(`Cache write failed for ${key}:`, error.message);
  }
};

const deleteCache = async (...keys) => {
  const redis = await getRedisClient();
  if (!redis || keys.length === 0) return;

  try {
    await redis.del(keys);
  } catch (error) {
    console.error("Cache delete failed:", error.message);
  }
};

const clearStatsCache = async () => {
  await deleteCache(CACHE_KEYS.adminStats);
};

export { CACHE_KEYS, clearStatsCache, getCache, setCache };
