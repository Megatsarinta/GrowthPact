/**
 * Database connection module
 *
 * This file sets up the database connection using Drizzle ORM
 * and exports the database client for use throughout the application.
 */

import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"
import { DATABASE_URL } from "@/app/api/env-config"

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
})

// Create a Drizzle ORM instance with the schema
export const db = drizzle(pool, { schema })

// Export the schema for use in other modules
export * from "./schema"
