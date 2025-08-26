const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { loggingMiddleware, logger } = require('./middleware/logging');
const urlRoutes = require('./routes/urlRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests',
        message: 'Please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Mandatory logging middleware
app.use(loggingMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'URL Shortener Microservice',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API routes
app.use('/', urlRoutes);

// 404 handler
app.use('*', (req, res) => {
    logger.Log('backend', 'warn', 'handler', `Route not found: ${req.method} ${req.originalUrl} from ${req.ip}`);
    
    res.status(404).json({
        error: 'Route not found',
        message: 'The requested endpoint does not exist'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    logger.Log('backend', 'fatal', 'handler', `Unhandled error: ${error.message} in ${req.method} ${req.url} from ${req.ip}`);

    res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
    });
});

// Start server
app.listen(PORT, () => {
    logger.Log('backend', 'info', 'service', `Server started successfully on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    
    console.log(`🚀 URL Shortener Microservice running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API Documentation:`);
    console.log(`   POST /shorturls - Create short URL`);
    console.log(`   GET /shorturls/:shortcode - Get statistics`);
    console.log(`   GET /:shortcode - Redirect to original URL`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.Log('backend', 'info', 'service', 'SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.Log('backend', 'info', 'service', 'SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;
