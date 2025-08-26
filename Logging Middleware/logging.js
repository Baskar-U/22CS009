const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// External logging API configuration
const LOG_API_URL = 'http://20.244.56.144/evaluation-service/logs';

class Logger {
    constructor() {
        this.logFile = path.join(logsDir, `app-${new Date().toISOString().split('T')[0]}.log`);
    }

    // Send log to external API
    async sendToExternalAPI(stack, level, pkg, message) {
        const logData = {
            stack: stack.toLowerCase(),
            level: level.toLowerCase(),
            package: pkg.toLowerCase(),
            message: message
        };

        return new Promise((resolve, reject) => {
            const url = new URL(LOG_API_URL);
            const isHttps = url.protocol === 'https:';
            const client = isHttps ? https : http;

            const postData = JSON.stringify(logData);
            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJiYXNrYXIuMjZjc2FAbGljZXQuYWMuaW4iLCJleHAiOjE3NTYyMDE3MjksImlhdCI6MTc1NjIwMDgyOSwiaXNzIjoiQWZmb3JkIE1lZGljYWwgVGVjaG5vbG9naWVzIFByaXZhdGUgTGltaXRlZCIsImp0aSI6ImE3OWMxOWM1LWNiZDItNDI5YS04NzhlLWNiNjUyOTNlZjc0ZSIsImxvY2FsZSI6ImVuLUlOIiwibmFtZSI6ImJhc2thciB1Iiwic3ViIjoiYTcyOTlhYzAtYWI5MC00NDIzLTllMGQtYWVkNjZmNjQwMjllIn0sImVtYWlsIjoiYmFza2FyLjI2Y3NhQGxpY2V0LmFjLmluIiwibmFtZSI6ImJhc2thciB1Iiwicm9sbE5vIjoiMjJjczAwOSIsImFjY2Vzc0NvZGUiOiJZQ1ZzU3kiLCJjbGllbnRJRCI6ImE3Mjk5YWMwLWFiOTAtNDQyMy05ZTBkLWFlZDY2ZjY0MDI5ZSIsImNsaWVudFNlY3JldCI6InpzdnFIZ0VUd1BBc1RHZEUifQ.CiAgwToEjTKRqKmI-VBTrY8eucHEg7d3nSzbjYoD0Gc'
                }
            };

            const req = client.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(postData);
            req.end();
        });
    }

    // Log function that matches the required structure
    async Log(stack, level, pkg, message) {
        try {
            // Truncate message to 48 characters to meet API requirements
            const truncatedMessage = message.length > 48 ? message.substring(0, 45) + '...' : message;
            
            // Send to external API
            await this.sendToExternalAPI(stack, level, pkg, truncatedMessage);
            
            // Also log locally for debugging (full message)
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] ${level.toUpperCase()}: ${message} (${stack}/${pkg})`);
            
        } catch (error) {
            // Fallback to local logging if external API fails
            const timestamp = new Date().toISOString();
            console.error(`[${timestamp}] ERROR: Failed to send log to external API:`, error.message);
            console.log(`[${timestamp}] ${level.toUpperCase()}: ${message} (${stack}/${pkg})`);
        }
    }

    log(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            ...meta
        };

        const logString = JSON.stringify(logEntry) + '\n';
        
        // Write to file
        fs.appendFileSync(this.logFile, logString);
        
        // Also log to console for development
        console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, meta);
    }

    info(message, meta = {}) {
        this.log('info', message, meta);
    }

    error(message, meta = {}) {
        this.log('error', message, meta);
    }

    warn(message, meta = {}) {
        this.log('warn', message, meta);
    }

    debug(message, meta = {}) {
        this.log('debug', message, meta);
    }
}

const logger = new Logger();

// Express middleware for logging all requests
const loggingMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    // Log request using external API
    logger.Log('backend', 'info', 'handler', `Incoming ${req.method} request to ${req.url} from ${req.ip}`);

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        
        // Log response using external API
        const level = res.statusCode >= 400 ? 'error' : 'info';
        logger.Log('backend', level, 'handler', `${req.method} ${req.url} completed with status ${res.statusCode} in ${duration}ms`);

        originalEnd.call(this, chunk, encoding);
    };

    next();
};

module.exports = { logger, loggingMiddleware };
