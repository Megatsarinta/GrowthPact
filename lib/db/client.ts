/**
 * Database client for server components
 *
 * This file provides a cached database client for use in server components
 * to prevent creating multiple database connections.
 */

import { db } from "./index"
import { cache } from "react"

// Create a cached database client for server components
export const getDbClient = cache(() => {
  return db
})

// Export a function to get the database client
export function getDb() {
  return getDbClient()
}
