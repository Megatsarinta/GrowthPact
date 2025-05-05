/**
 * Password utility functions
 *
 * This module provides functions for hashing and verifying passwords
 * using bcrypt with configurable salt rounds.
 */

import bcrypt from "bcrypt"
import { BCRYPT_SALT_ROUNDS } from "@/app/api/env-config"

/**
 * Hash a password using bcrypt
 *
 * @param password - The plain text password to hash
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 *
 * @param password - The plain text password to verify
 * @param hash - The hashed password to compare against
 * @returns True if the password matches the hash, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
