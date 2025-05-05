import "./conversion-worker"
import "./withdrawal-worker"
import "./interest-accrual-worker"
import { initScheduler } from "./scheduler"

// Initialize the scheduler
initScheduler()
  .then(() => console.log("Scheduler initialized"))
  .catch((error) => console.error("Scheduler initialization failed:", error))

console.log("Workers started")

// Keep the process running
process.on("SIGTERM", () => {
  console.log("Workers shutting down")
  process.exit(0)
})
