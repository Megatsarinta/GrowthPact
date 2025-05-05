type LogLevel = "debug" | "info" | "warn" | "error"

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
}

class Logger {
  private logs: LogEntry[] = []
  private readonly maxLogs: number = 1000 // Limit the number of logs stored in memory

  constructor() {
    // Initialize logger
  }

  private log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    }

    // Add to in-memory logs (with limit)
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift() // Remove oldest log
    }

    // Log to console in development
    if (process.env.NODE_ENV !== "production") {
      const consoleMethod = level === "debug" ? "log" : level
      console[consoleMethod as "log" | "info" | "warn" | "error"](
        `[${entry.timestamp}] [${level.toUpperCase()}] ${message}`,
        data || "",
      )
    }

    // In a real application, you might want to send logs to a service like Sentry, Logtail, etc.
    // This would be implemented here
  }

  debug(message: string, data?: any) {
    this.log("debug", message, data)
  }

  info(message: string, data?: any) {
    this.log("info", message, data)
  }

  warn(message: string, data?: any) {
    this.log("warn", message, data)
  }

  error(message: string, data?: any) {
    this.log("error", message, data)
  }

  // Get recent logs (useful for admin panel)
  getRecentLogs(count = 100, level?: LogLevel) {
    let filteredLogs = this.logs
    if (level) {
      filteredLogs = filteredLogs.filter((log) => log.level === level)
    }
    return filteredLogs.slice(-count).reverse() // Return most recent logs first
  }
}

// Export a singleton instance
export const logger = new Logger()
