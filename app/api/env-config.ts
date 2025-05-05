/**
 * Environment configuration module
 *
 * This file centralizes all environment variable access and provides
 * validation to ensure all required variables are present.
 */

// Function to get and validate required environment variables
function getRequiredEnvVar(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Required environment variable ${key} is missing`)
  }
  return value
}

// Function to get optional environment variables with defaults
function getOptionalEnvVar(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

// Database configuration
export const DATABASE_URL = getRequiredEnvVar("DATABASE_URL")

// Authentication configuration
export const JWT_SECRET = getRequiredEnvVar("JWT_SECRET")
export const JWT_EXPIRES_IN = getOptionalEnvVar("JWT_EXPIRES_IN", "7d")
export const BCRYPT_SALT_ROUNDS = Number.parseInt(getOptionalEnvVar("BCRYPT_SALT_ROUNDS", "10"))
export const REFRESH_TOKEN_EXPIRES_IN = getOptionalEnvVar("REFRESH_TOKEN_EXPIRES_IN", "30d")

// Payment gateway configuration
export const COINBASE_COMMERCE_API_KEY = getRequiredEnvVar("COINBASE_COMMERCE_API_KEY")
export const COINBASE_COMMERCE_API_SECRET = getRequiredEnvVar("COINBASE_COMMERCE_API_SECRET")
export const COINBASE_COMMERCE_WEBHOOK_SECRET = getRequiredEnvVar("COINBASE_COMMERCE_WEBHOOK_SECRET")

// External API configuration
export const COINGECKO_API_URL = getOptionalEnvVar("COINGECKO_API_URL", "https://api.coingecko.com/api/v3")

// Notification services
export const SENDGRID_API_KEY = getRequiredEnvVar("SENDGRID_API_KEY")
export const SENDGRID_FROM_EMAIL = getRequiredEnvVar("SENDGRID_FROM_EMAIL")
export const TWILIO_ACCOUNT_SID = getRequiredEnvVar("TWILIO_ACCOUNT_SID")
export const TWILIO_AUTH_TOKEN = getRequiredEnvVar("TWILIO_AUTH_TOKEN")
export const TWILIO_PHONE_NUMBER = getRequiredEnvVar("TWILIO_PHONE_NUMBER")

// KYC provider
export const KYC_PROVIDER_KEY = getRequiredEnvVar("KYC_PROVIDER_KEY")
export const KYC_PROVIDER_URL = getRequiredEnvVar("KYC_PROVIDER_URL")

// Monitoring and error tracking
export const SENTRY_DSN = getRequiredEnvVar("SENTRY_DSN")
export const NODE_ENV = getOptionalEnvVar("NODE_ENV", "development")
export const LOG_LEVEL = getOptionalEnvVar("LOG_LEVEL", NODE_ENV === "production" ? "info" : "debug")

// Redis configuration for caching and job queues
export const REDIS_URL = getRequiredEnvVar("REDIS_URL")

// Application configuration
export const PORT = Number.parseInt(getOptionalEnvVar("PORT", "3000"))
export const API_BASE_URL = getOptionalEnvVar("API_BASE_URL", `http://localhost:${PORT}`)
export const FRONTEND_URL = getRequiredEnvVar("FRONTEND_URL")
