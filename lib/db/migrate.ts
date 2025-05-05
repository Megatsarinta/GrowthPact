/**
 * Database migration utility
 *
 * This file provides functions to run database migrations
 * using Drizzle ORM's migration tools.
 */

import { migrate } from "drizzle-orm/node-postgres/migrator"
import { db } from "./index"

// Function to run migrations
export async function runMigrations() {
  try {
    console.log("Running migrations...")

    // Run migrations from the specified directory
    await migrate(db, { migrationsFolder: "drizzle/migrations" })

    console.log("Migrations completed successfully")
  } catch (error) {
    console.error("Error running migrations:", error)
    throw error
  }
}

// If this file is executed directly, run migrations
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Migration failed:", error)
      process.exit(1)
    })
}
