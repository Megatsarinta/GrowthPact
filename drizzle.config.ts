import type { Config } from "drizzle-kit"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config()

// Drizzle configuration
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/investment_platform",
  },
  verbose: true,
  strict: true,
} satisfies Config
