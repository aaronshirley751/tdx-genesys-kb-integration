const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

// Add colors to winston
winston.addColors(colors);

// Create custom format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format
  })
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false
});

// Add request logging method
logger.logRequest = (req, res, responseTime) => {
  const message = `${req.method} ${req.originalUrl}`;
  const meta = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };

  if (res.statusCode >= 400) {
    logger.warn(message, meta);
  } else {
    logger.info(message, meta);
  }
};

// Add TDX-specific logging methods
logger.logTDXRequest = (method, url, params = {}) => {
  logger.info(`TDX API Request: ${method} ${url}`, {
    method,
    url,
    params,
    service: 'TDX'
  });
};

logger.logTDXResponse = (method, url, statusCode, responseTime) => {
  const message = `TDX API Response: ${method} ${url}`;
  const meta = {
    method,
    url,
    statusCode,
    responseTime: `${responseTime}ms`,
    service: 'TDX'
  };

  if (statusCode >= 400) {
    logger.warn(message, meta);
  } else {
    logger.info(message, meta);
  }
};

logger.logTDXError = (method, url, error) => {
  logger.error(`TDX API Error: ${method} ${url}`, {
    method,
    url,
    error: error.message,
    stack: error.stack,
    service: 'TDX'
  });
};

module.exports = logger;