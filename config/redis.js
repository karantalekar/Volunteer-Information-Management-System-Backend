import { createClient } from "redis";

let redisClient;
let redisReady = false;
let redisUnavailable = false;
let loggedRedisDisabled = false;

const getRedisClient = async () => {
  if (process.env.REDIS_ENABLED === "false") {
    if (!loggedRedisDisabled) {
      console.log("Redis cache disabled by REDIS_ENABLED=false");
      loggedRedisDisabled = true;
    }
    return null;
  }

  if (!process.env.REDIS_URL) {
    if (!loggedRedisDisabled) {
      console.log("Redis cache disabled. Set REDIS_URL to enable it.");
      loggedRedisDisabled = true;
    }
    return null;
  }

  if (redisUnavailable) {
    return null;
  }

  if (redisClient) {
    return redisReady ? redisClient : null;
  }

  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: false,
    },
  });

  redisClient.on("error", (error) => {
    redisReady = false;
    redisUnavailable = true;
    console.error("Redis cache unavailable:", error?.message || error?.code || "connection failed");
  });

  redisClient.on("ready", () => {
    redisReady = true;
    console.log("Redis connected");
  });

  redisClient.on("end", () => {
    redisReady = false;
  });

  try {
    await redisClient.connect();
  } catch (error) {
    redisReady = false;
    redisUnavailable = true;
    console.error("Redis connection skipped:", error?.message || error?.code || "connection failed");
    return null;
  }

  return redisReady ? redisClient : null;
};

export { getRedisClient };
