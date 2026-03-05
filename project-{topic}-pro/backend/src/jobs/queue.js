const { Queue, Worker, QueueScheduler } = require('bullmq');
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

// Connect to Redis for BullMQ
const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

connection.on('error', (err) => logger.error('BullMQ Redis connection error:', err));
connection.on('connect', () => logger.info('BullMQ Redis connected!'));

// Create a queue
const scrapeQueue = new Queue(config.queue.name, { connection });

// Optional: Scheduler for repeating jobs (e.g., cron)
const scrapeQueueScheduler = new QueueScheduler(config.queue.name, { connection });

logger.info(`BullMQ Queue '${config.queue.name}' initialized.`);

module.exports = {
  scrapeQueue,
  connection, // Export connection for worker/scheduler
};