import winston from 'winston';
import { logLevel } from '../config/index.js';
import { mkdirSync } from 'fs';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Create logs directory
try {
  mkdirSync('logs', { recursive: true });
} catch {
  // Directory already exists
}

/**
 * Custom log format
 */
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

/**
 * Winston logger instance
 */
export const logger = winston.createLogger({
  level: logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat
      ),
    }),
    // Single file for all logs (as per user preference)
    new winston.transports.File({
      filename: 'logs/app.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

export default logger;
