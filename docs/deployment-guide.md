# Deployment Guide for InvestSafe Platform

This guide outlines the steps to deploy the InvestSafe investment platform to production using Vercel and Neon PostgreSQL.

## Prerequisites

- Vercel account
- Neon PostgreSQL account
- Node.js 18+ installed locally
- Git repository with your codebase

## Step 1: Database Setup with Neon

1. Create a new Neon PostgreSQL project
2. Create a new database named `investsafe`
3. Create a new role with appropriate permissions
4. Save the connection string for later use

## Step 2: Environment Variables

Set up the following environment variables in your Vercel project:

\`\`\`env
# Database
DATABASE_URL=postgres://username:password@hostname:port/database
POSTGRES_URL=postgres://username:password@hostname:port/database
POSTGRES_PRISMA_URL=postgres://username:password@hostname:port/database?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgres://username:password@hostname:port/database
POSTGRES_USER=username
POSTGRES_PASSWORD=password
POSTGRES_HOST=hostname
POSTGRES_DATABASE=database

# Authentication
JWT_SECRET=your-jwt-secret-key

# Coinbase Commerce
COINBASE_COMMERCE_API_KEY=your-coinbase-commerce-api-key
COINBASE_COMMERCE_WEBHOOK_SECRET=your-coinbase-commerce-webhook-secret

# Frontend URL
FRONTEND_URL=https://your-domain.com

# Redis (for queue)
REDIS_URL=redis://username:password@hostname:port

# CRON jobs
CRON_SECRET=your-cron-secret-key
\`\`\`

## Step 3: Database Migrations

Run the database migrations before deploying:

\`\`\`bash
npx drizzle-kit push:pg
\`\`\`

## Step 4: Deploy to Vercel

1. Connect your Git repository to Vercel
2. Configure the build settings:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
3. Add all environment variables from Step 2
4. Deploy the application

## Step 5: Set Up CRON Jobs

Set up CRON jobs to run scheduled tasks:

1. Create a Vercel Cron job for interest accrual:
   - Path: `/api/cron/interest-accrual`
   - Schedule: `0 0 * * *` (daily at midnight)
   - HTTP Method: POST
   - Headers: `Authorization: Bearer your-cron-secret-key`

## Step 6: Monitoring and Logging

1. Set up Vercel Analytics for basic monitoring
2. Consider integrating with a dedicated logging service like Logtail or Datadog

## Step 7: Scaling Considerations

- Neon PostgreSQL automatically scales with your needs
- Consider using Vercel Edge Functions for global distribution
- Set up proper connection pooling for database connections

## Troubleshooting

If you encounter issues during deployment:

1. Check Vercel build logs for errors
2. Verify environment variables are correctly set
3. Ensure database migrations have been applied
4. Check that Redis connection is working properly

## Production Checklist

- [ ] SSL/TLS enabled
- [ ] Database backups configured
- [ ] Rate limiting implemented
- [ ] Error monitoring set up
- [ ] Performance monitoring enabled
- [ ] Security headers configured
- [ ] CORS policies set
\`\`\`

Let's create a 500 error page:
