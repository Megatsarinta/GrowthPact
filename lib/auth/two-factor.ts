/**
 * Two-factor authentication utility functions
 *
 * This module provides functions for generating and verifying TOTP codes
 * using the speakeasy library.
 */

import speakeasy from "speakeasy"
import QRCode from "qrcode"

/**
 * Generate a new TOTP secret
 *
 * @param email - The user's email address
 * @returns Object containing the secret and QR code data URL
 */
export async function generateTOTPSecret(email: string): Promise<{
  secret: string
  otpauth_url: string
  qrCodeDataURL: string
}> {
  // Generate a new secret
  const secret = speakeasy.generateSecret({
    name: `InvestSafe:${email}`,
  })

  // Generate QR code data URL
  const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url || "")

  return {
    secret: secret.base32,
    otpauth_url: secret.otpauth_url || "",
    qrCodeDataURL,
  }
}

/**
 * Verify a TOTP token
 *
 * @param token - The token to verify
 * @param secret - The user's TOTP secret
 * @returns True if the token is valid, false otherwise
 */
export function verifyTOTP(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1, // Allow 1 step before/after for clock drift
  })
}
