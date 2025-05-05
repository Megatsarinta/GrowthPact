import { Queue } from "bullmq"
import { REDIS_URL } from "@/app/api/env-config"

// Define job types
export type JobTypes = {
  convertCrypto: {
    depositId: number
    userId: number
    amount: string
    currency: "BTC" | "ETH" | "USDT"
  }
}

// Create a map of queues
const queues: Record<string, Queue> = {}

// Function to get or create a queue
function getQueue<T extends keyof JobTypes>(name: T): Queue {
  if (!queues[name]) {
    queues[name] = new Queue(name, {
      connection: {
        host: new URL(REDIS_URL).hostname,
        port: Number.parseInt(new URL(REDIS_URL).port || "6379"),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    })
  }
  return queues[name]
}

// Function to add a job to a queue
export async function addJob<T extends keyof JobTypes>(
  queueName: T,
  data: JobTypes[T],
  options?: {
    delay?: number
    priority?: number
  },
) {
  const queue = getQueue(queueName)
  return queue.add(queueName, data, options)
}
