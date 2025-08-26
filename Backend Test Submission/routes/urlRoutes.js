const express = require('express');
const urlService = require('../services/urlService');
const { logger } = require('../middleware/logging');

const router = express.Router();

// POST /shorturls - Create a new short URL
router.post('/shorturls', (req, res) => {
    try {
        const { url, validity, shortcode } = req.body;

        // Validate required fields
        if (!url) {
            logger.Log('backend', 'warn', 'handler', 'Missing URL in request body');
            return res.status(400).json({
                error: 'URL is required',
                message: 'Please provide a valid URL to shorten'
            });
        }

        // Validate validity (if provided)
        if (validity !== undefined && (typeof validity !== 'number' || validity <= 0)) {
            logger.Log('backend', 'warn', 'handler', `Invalid validity period: ${validity}`);
            return res.status(400).json({
                error: 'Invalid validity period',
                message: 'Validity must be a positive number representing minutes'
            });
        }

        // Create short URL
        const result = urlService.createShortUrl(url, validity, shortcode);

        logger.Log('backend', 'info', 'handler', `Short URL created successfully: ${result.shortLink.split('/').pop()} for ${url}`);

        res.status(201).json(result);

    } catch (error) {
        logger.Log('backend', 'error', 'handler', `Error creating short URL: ${error.message}`);

        // Handle specific error types
        if (error.message.includes('Invalid URL format')) {
            return res.status(400).json({
                error: 'Invalid URL format',
                message: 'Please provide a valid URL'
            });
        }

        if (error.message.includes('Invalid shortcode format')) {
            return res.status(400).json({
                error: 'Invalid shortcode format',
                message: 'Shortcode must be 3-20 alphanumeric characters'
            });
        }

        if (error.message.includes('Shortcode already exists')) {
            return res.status(409).json({
                error: 'Shortcode already exists',
                message: 'Please choose a different shortcode'
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to create short URL'
        });
    }
});

// GET /shorturls/:shortcode - Get statistics for a short URL
router.get('/shorturls/:shortcode', (req, res) => {
    try {
        const { shortcode } = req.params;

        if (!shortcode) {
            logger.Log('backend', 'warn', 'handler', 'Missing shortcode parameter');
            return res.status(400).json({
                error: 'Missing shortcode',
                message: 'Please provide a valid shortcode'
            });
        }

        const statistics = urlService.getStatistics(shortcode);

        logger.Log('backend', 'info', 'handler', `Statistics retrieved successfully for shortcode: ${shortcode}`);

        res.status(200).json(statistics);

    } catch (error) {
        logger.Log('backend', 'error', 'handler', `Error retrieving statistics for shortcode: ${req.params.shortcode} - ${error.message}`);

        if (error.message.includes('Shortcode not found')) {
            return res.status(404).json({
                error: 'Shortcode not found',
                message: 'The requested shortcode does not exist'
            });
        }

        if (error.message.includes('URL has expired')) {
            return res.status(410).json({
                error: 'URL expired',
                message: 'The requested URL has expired'
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to retrieve statistics'
        });
    }
});

// GET /:shortcode - Redirect to original URL
router.get('/:shortcode', (req, res) => {
    try {
        const { shortcode } = req.params;

        if (!shortcode) {
            logger.Log('backend', 'warn', 'handler', 'Missing shortcode parameter');
            return res.status(400).json({
                error: 'Missing shortcode',
                message: 'Please provide a valid shortcode'
            });
        }

        // Record the click and get the original URL
        const originalUrl = urlService.recordClick(shortcode, req);

        logger.Log('backend', 'info', 'handler', `Redirecting to original URL: ${originalUrl} for shortcode: ${shortcode}`);

        // Redirect to the original URL
        res.redirect(originalUrl);

    } catch (error) {
        logger.Log('backend', 'error', 'handler', `Error redirecting URL for shortcode: ${req.params.shortcode} - ${error.message}`);

        if (error.message.includes('Shortcode not found')) {
            return res.status(404).json({
                error: 'Shortcode not found',
                message: 'The requested shortcode does not exist'
            });
        }

        if (error.message.includes('URL has expired')) {
            return res.status(410).json({
                error: 'URL expired',
                message: 'The requested URL has expired'
            });
        }

        res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to redirect to original URL'
        });
    }
});

module.exports = router;
