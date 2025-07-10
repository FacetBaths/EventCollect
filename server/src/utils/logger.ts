import fs from "fs";
import path from "path";

// Ensure logs directory exists
const logsDir = path.dirname(process.env.LOG_FILE_PATH || "./logs/server.log");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

type LogLevel =
  | "error"
  | "warn"
  | "info"
  | "http"
  | "verbose"
  | "debug"
  | "silly";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private logLevel: LogLevel;
  private logFilePath: string;

  constructor() {
    this.logLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
    this.logFilePath = process.env.LOG_FILE_PATH || "./logs/server.log";
  }

  private getLogLevelNumber(level: LogLevel): number {
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      verbose: 4,
      debug: 5,
      silly: 6,
    };
    return levels[level];
  }

  private shouldLog(level: LogLevel): boolean {
    return (
      this.getLogLevelNumber(level) <= this.getLogLevelNumber(this.logLevel)
    );
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = { timestamp, level, message, data };
    return JSON.stringify(logEntry);
  }

  private writeLog(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, data);

    // Console output with colors
    const colors = {
      error: "\x1b[31m", // Red
      warn: "\x1b[33m", // Yellow
      info: "\x1b[36m", // Cyan
      http: "\x1b[35m", // Magenta
      verbose: "\x1b[37m", // White
      debug: "\x1b[32m", // Green
      silly: "\x1b[90m", // Gray
    };

    const resetColor = "\x1b[0m";
    const coloredLevel = `${colors[level]}${level.toUpperCase()}${resetColor}`;

    console.log(
      `[${new Date().toISOString()}] ${coloredLevel}: ${message}${data ? ` ${JSON.stringify(data)}` : ""}`,
    );

    // File output
    try {
      fs.appendFileSync(this.logFilePath, formattedMessage + "\n");
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  error(message: string, data?: any): void {
    this.writeLog("error", message, data);
  }

  warn(message: string, data?: any): void {
    this.writeLog("warn", message, data);
  }

  info(message: string, data?: any): void {
    this.writeLog("info", message, data);
  }

  http(message: string, data?: any): void {
    this.writeLog("http", message, data);
  }

  verbose(message: string, data?: any): void {
    this.writeLog("verbose", message, data);
  }

  debug(message: string, data?: any): void {
    this.writeLog("debug", message, data);
  }

  silly(message: string, data?: any): void {
    this.writeLog("silly", message, data);
  }
}

export const logger = new Logger();
