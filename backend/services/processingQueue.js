import PQueue from 'p-queue';
import os from 'os';

const calculateOptimalConcurrency = () => {
  const cpuCount = os.cpus().length;
  const memoryGB = Math.floor(os.totalmem() / (1024 * 1024 * 1024));
  const cpuBasedLimit = Math.max(1, cpuCount - 1); 
  const memoryBasedLimit = Math.max(1, Math.floor(memoryGB / 2)); 
  
  return Math.min(cpuBasedLimit, memoryBasedLimit, 4); // Cap at 4 concurrent processes
};

// Create processing queue with dynamic concurrency
const processingQueue = new PQueue({
  concurrency: calculateOptimalConcurrency(),
  timeout: 30 * 60 * 1000, // 30 minute timeout per job
  throwOnTimeout: false
});

// Add monitoring for queue events
processingQueue.on('active', () => {
  console.log(`Queue size: ${processingQueue.size}, Pending: ${processingQueue.pending}`);
});

processingQueue.on('idle', () => {
  console.log('Processing queue is empty');
});

export const queueVideoProcessing = async (processFunc, ...args) => {
  return processingQueue.add(
    () => processFunc(...args),
    {
      priority: 0,
      retry: {
        retries: 2,
        minTimeout: 1000,
        maxTimeout: 60000,
        onFailedAttempt: error => {
          console.error(
            `Video processing attempt ${error.attemptNumber} failed. ` +
            `${error.retriesLeft} retries left.`
          );
        }
      }
    }
  );
};

export const getQueueStatus = () => {
  return {
    size: processingQueue.size,
    pending: processingQueue.pending,
    isPaused: processingQueue.isPaused,
    concurrency: processingQueue.concurrency
  };
};

// Pause queue (e.g., during high system load)
export const pauseQueue = () => processingQueue.pause();

// Resume queue
export const resumeQueue = () => processingQueue.start();

// Clear queue (emergency stop)
export const clearQueue = () => {
  processingQueue.clear();
  return {
    message: 'Queue cleared',
    remainingSize: processingQueue.size
  };
};