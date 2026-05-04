import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../../shared/env.js";

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true
});
export const redisConnection = redis;

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000
  },
  removeOnComplete: true
};

export const workflowQueue = new Queue("workflow-jobs", {
  connection: redis,
  defaultJobOptions
});

export const leadImportQueue = new Queue("lead-import-jobs", {
  connection: redis,
  defaultJobOptions
});

export const uploadQueue = new Queue("upload-processing", {
  connection: redis,
  defaultJobOptions
});

export const deadLetterQueue = new Queue("workflow-dead-letter-jobs", {
  connection: redis
});
