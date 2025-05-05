export const productionConfig = {
  // Database configuration
  database: {
    connectionPoolSize: 20,
    statementTimeout: 30000, // 30 seconds
    idleTimeout: 30000, // 30 seconds
  },

  // Redis configuration
  redis: {
    maxConnections: 50,
    connectTimeout: 10000, // 10 seconds
    commandTimeout: 5000, // 5 seconds
  },

  // API rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
  },

  // Security settings
  security: {
    jwtExpiresIn: "1d", // 1 day
    jwtRefreshExpiresIn: "7d", // 7 days
    bcryptSaltRounds: 12,
  },

  // Logging
  logging: {
    level: "info", // 'debug', 'info', 'warn', 'error'
    enableFileLogging: true,
    logFilePath: "/var/log/investsafe/app.log",
  },

  // Monitoring
  monitoring: {
    enablePerformanceMetrics: true,
    sampleRate: 0.1, // Sample 10% of requests for detailed performance monitoring
  },
}
