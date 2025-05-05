import { exec } from "child_process"
import { promisify } from "util"
import { logger } from "../lib/logger"

const execAsync = promisify(exec)

async function deploy() {
  try {
    logger.info("Starting deployment process...")

    // Run database migrations
    logger.info("Running database migrations...")
    await execAsync("npx drizzle-kit push:pg")

    // Build the application
    logger.info("Building the application...")
    await execAsync("npm run build")

    // Run tests
    logger.info("Running tests...")
    await execAsync("npm test")

    logger.info("Deployment preparation completed successfully!")
    logger.info("Ready to deploy to Vercel. Run 'vercel --prod' to deploy.")
  } catch (error) {
    logger.error("Deployment failed:", error)
    process.exit(1)
  }
}

deploy()
