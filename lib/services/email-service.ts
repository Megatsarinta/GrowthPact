/**
 * Email service
 *
 * This module provides functions for sending emails using SendGrid,
 * including email verification and notification emails.
 */

import sgMail from "@sendgrid/mail"
import { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, FRONTEND_URL } from "@/app/api/env-config"

// Initialize SendGrid with API key
sgMail.setApiKey(SENDGRID_API_KEY)

/**
 * Send an email verification link
 *
 * @param to - The recipient's email address
 * @param token - The verification token
 * @returns The SendGrid response
 */
export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verificationLink = `${FRONTEND_URL}/auth/verify-email?token=${token}`

  const msg = {
    to,
    from: SENDGRID_FROM_EMAIL,
    subject: "Verify your InvestSafe account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to InvestSafe!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
        <p>
          <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">
            Verify Email Address
          </a>
        </p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
        <p>Best regards,<br>The InvestSafe Team</p>
      </div>
    `,
  }

  try {
    await sgMail.send(msg)
  } catch (error) {
    console.error("Error sending verification email:", error)
    throw new Error("Failed to send verification email")
  }
}

/**
 * Send a welcome email after verification
 *
 * @param to - The recipient's email address
 * @param name - The recipient's name
 * @returns The SendGrid response
 */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const loginLink = `${FRONTEND_URL}/auth/login`

  const msg = {
    to,
    from: SENDGRID_FROM_EMAIL,
    subject: "Welcome to InvestSafe!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to InvestSafe, ${name}!</h2>
        <p>Your email has been verified successfully.</p>
        <p>You can now log in to your account and start exploring our investment plans.</p>
        <p>
          <a href="${loginLink}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">
            Log In to Your Account
          </a>
        </p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The InvestSafe Team</p>
      </div>
    `,
  }

  try {
    await sgMail.send(msg)
  } catch (error) {
    console.error("Error sending welcome email:", error)
    throw new Error("Failed to send welcome email")
  }
}

/**
 * Send a notification about successful 2FA setup
 *
 * @param to - The recipient's email address
 * @returns The SendGrid response
 */
export async function send2FASetupEmail(to: string): Promise<void> {
  const msg = {
    to,
    from: SENDGRID_FROM_EMAIL,
    subject: "Two-Factor Authentication Enabled",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Two-Factor Authentication Enabled</h2>
        <p>Two-factor authentication has been successfully set up for your InvestSafe account.</p>
        <p>Your account is now more secure. You will need to enter a verification code from your authenticator app each time you log in.</p>
        <p>If you did not enable two-factor authentication, please contact our support team immediately.</p>
        <p>Best regards,<br>The InvestSafe Team</p>
      </div>
    `,
  }

  try {
    await sgMail.send(msg)
  } catch (error) {
    console.error("Error sending 2FA setup email:", error)
    throw new Error("Failed to send 2FA setup email")
  }
}
