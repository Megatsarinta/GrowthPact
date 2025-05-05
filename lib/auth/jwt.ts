/**
 * JWT utility functions
 *
 * This module provides functions for creating and verifying JWT tokens
 * used for authentication and email verification.
 */

import jwt from "jsonwebtoken"
import { JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from "@/app/api/env-config"

// Define the JWT payload type
export interface JwtPayload {
  userId: number
  email: string
  role: string
  twoFactorVerified?: boolean
}

/**
 * Create a JWT token
 *
 * @param payload - The data to encode in the token
 * @param expiresIn - Token expiration time (default from config)
 * @returns The signed JWT token
 */
export function createJwtToken(payload: JwtPayload, expiresIn = JWT_EXPIRES_IN): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

/**
 * Create a refresh token with longer expiration
 *
 * @param userId - The user ID to encode in the token
 * @returns The signed refresh token
 */
export function createRefreshToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN })
}

/**
 * Create an email verification token
 *
 * @param userId - The user ID to encode in the token
 * @param email - The user's email address
 * @returns The signed verification token
 */
export function createEmailVerificationToken(userId: number, email: string): string {
  return jwt.sign({ userId, email, purpose: "email-verification" }, JWT_SECRET, { expiresIn: "24h" })
}

/**
 * Verify a JWT token
 *
 * @param token - The token to verify
 * @returns The decoded token payload
 * @throws Error if the token is invalid
 */
export async function verifyJwtToken(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        reject(err)
      } else {
        resolve(decoded as JwtPayload)
      }
    })
  })
}

/**
 * Verify an email verification token
 *
 * @param token - The token to verify
 * @returns The decoded token payload if valid and for email verification
 * @throws Error if the token is invalid or not for email verification
 */
export async function verifyEmailToken(token: string): Promise<{ userId: number; email: string }> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
      if (err) {
        reject(err)
      } else if (decoded.purpose !== "email-verification") {
        reject(new Error("Invalid token purpose"))
      } else {
        resolve({
          userId: decoded.userId,
          email: decoded.email,
        })
      }
    })
  })
}
