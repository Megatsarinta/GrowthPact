/**
 * Database seeding script
 *
 * This script seeds the database with initial data for development and testing.
 * Run with: npm run seed
 */

import { seedDatabase } from "../lib/db/seed-data"

async function main() {
  try {
    await seedDatabase()
    process.exit(0)
  } catch (error) {
    console.error("Error running seed script:", error)
    process.exit(1)
  }
}

main()
