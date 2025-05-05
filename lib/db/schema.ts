/**
 * Database schema definitions
 *
 * This file defines the database schema using Drizzle ORM.
 * It includes all tables and relationships for the investment platform.
 */

import { pgTable, serial, text, timestamp, boolean, integer, decimal, pgEnum } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "support"])
export const kycStatusEnum = pgEnum("kyc_status", ["pending", "approved", "rejected"])
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "processing", "completed", "failed"])
export const currencyEnum = pgEnum("currency", ["INR", "USDT", "BTC", "ETH"])

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  isVerified: boolean("is_verified").default(false).notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  balanceInr: decimal("balance_inr", { precision: 18, scale: 2 }).default("0").notNull(),
  referralCode: text("referral_code").unique(),
  referredBy: integer("referred_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// User relations
export const usersRelations = relations(users, ({ many, one }) => ({
  deposits: many(deposits),
  withdrawals: many(withdrawals),
  investments: many(userInvestments),
  kycRecords: many(kycRecords),
  interestAccruals: many(interestAccruals),
  referrer: one(users, {
    fields: [users.referredBy],
    references: [users.id],
  }),
  referrals: many(users, {
    relationName: "referrer",
  }),
}))

// Investment projects table
export const investmentProjects = pgTable("investment_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  sector: text("sector").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Investment projects relations
export const investmentProjectsRelations = relations(investmentProjects, ({ many }) => ({
  plans: many(investmentPlans),
}))

// Investment plans table
export const investmentPlans = pgTable("investment_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  dailyInterest: decimal("daily_interest", { precision: 5, scale: 2 }).notNull(),
  minAmount: decimal("min_amount", { precision: 18, scale: 2 }).notNull(),
  maxAmount: decimal("max_amount", { precision: 18, scale: 2 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  projectId: integer("project_id")
    .references(() => investmentProjects.id)
    .notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Investment plans relations
export const investmentPlansRelations = relations(investmentPlans, ({ one, many }) => ({
  project: one(investmentProjects, {
    fields: [investmentPlans.projectId],
    references: [investmentProjects.id],
  }),
  userInvestments: many(userInvestments),
}))

// User investments table
export const userInvestments = pgTable("user_investments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  planId: integer("plan_id")
    .references(() => investmentPlans.id)
    .notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  totalInterestEarned: decimal("total_interest_earned", { precision: 18, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// User investments relations
export const userInvestmentsRelations = relations(userInvestments, ({ one, many }) => ({
  user: one(users, {
    fields: [userInvestments.userId],
    references: [users.id],
  }),
  plan: one(investmentPlans, {
    fields: [userInvestments.planId],
    references: [investmentPlans.id],
  }),
  interestAccruals: many(interestAccruals),
}))

// Deposits table
export const deposits = pgTable("deposits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  currency: currencyEnum("currency").notNull(),
  amountCrypto: decimal("amount_crypto", { precision: 18, scale: 8 }).notNull(),
  amountInr: decimal("amount_inr", { precision: 18, scale: 2 }),
  status: transactionStatusEnum("status").default("pending").notNull(),
  txReference: text("tx_reference"),
  paymentUrl: text("payment_url"),
  conversionRate: decimal("conversion_rate", { precision: 18, scale: 8 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Deposits relations
export const depositsRelations = relations(deposits, ({ one }) => ({
  user: one(users, {
    fields: [deposits.userId],
    references: [users.id],
  }),
}))

// Withdrawals table
export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  currency: currencyEnum("currency").notNull(),
  amountInr: decimal("amount_inr", { precision: 18, scale: 2 }).notNull(),
  fee: decimal("fee", { precision: 18, scale: 2 }).default("0").notNull(),
  amountCrypto: decimal("amount_crypto", { precision: 18, scale: 8 }),
  status: transactionStatusEnum("status").default("pending").notNull(),
  txReference: text("tx_reference"),
  walletAddress: text("wallet_address"),
  conversionRate: decimal("conversion_rate", { precision: 18, scale: 8 }),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Withdrawals relations
export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  user: one(users, {
    fields: [withdrawals.userId],
    references: [users.id],
  }),
}))

// KYC records table
export const kycRecords = pgTable("kyc_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  status: kycStatusEnum("status").default("pending").notNull(),
  providerReference: text("provider_reference"),
  idDocumentFront: text("id_document_front"),
  idDocumentBack: text("id_document_back"),
  selfieDocument: text("selfie_document"),
  addressDocument: text("address_document"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// KYC records relations
export const kycRecordsRelations = relations(kycRecords, ({ one }) => ({
  user: one(users, {
    fields: [kycRecords.userId],
    references: [users.id],
  }),
}))

// Interest accruals table
export const interestAccruals = pgTable("interest_accruals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  investmentId: integer("investment_id")
    .references(() => userInvestments.id)
    .notNull(),
  date: timestamp("date").defaultNow().notNull(),
  interestAmount: decimal("interest_amount", { precision: 18, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Interest accruals relations
export const interestAccrualsRelations = relations(interestAccruals, ({ one }) => ({
  user: one(users, {
    fields: [interestAccruals.userId],
    references: [users.id],
  }),
  investment: one(userInvestments, {
    fields: [interestAccruals.investmentId],
    references: [userInvestments.id],
  }),
}))

// Referrals table
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  referrerId: integer("referrer_id")
    .references(() => users.id)
    .notNull(),
  level: integer("level").default(1).notNull(),
  bonusAmount: decimal("bonus_amount", { precision: 18, scale: 2 }).default("0").notNull(),
  isPaid: boolean("is_paid").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Referrals relations
export const referralsRelations = relations(referrals, ({ one }) => ({
  user: one(users, {
    fields: [referrals.userId],
    references: [users.id],
  }),
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
  }),
}))

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  metadata: text("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
})

// Audit logs relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}))

// Refresh tokens table
export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Refresh tokens relations
export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}))
