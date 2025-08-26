const moment = require('moment');
const geoip = require('geoip-lite');
const UserAgent = require('user-agents');
const { generateShortcode, reserveShortcode, isValidUrl, isValidShortcode } = require('../utils/shortcodeGenerator');
const { logger } = require('../middleware/logging');

// In-memory storage (in production, use a database)
const urlStore = new Map();
const clickStats = new Map();

class UrlService {
    constructor() {
        this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    }

    // Create a new short URL
    createShortUrl(originalUrl, validity = 30, customShortcode = null) {
        try {
            // Validate URL
            if (!isValidUrl(originalUrl)) {
                throw new Error('Invalid URL format');
            }

            // Handle custom shortcode
            let shortcode;
            if (customShortcode) {
                if (!isValidShortcode(customShortcode)) {
                    throw new Error('Invalid shortcode format. Must be 3-20 alphanumeric characters.');
                }
                
                if (!reserveShortcode(customShortcode)) {
                    throw new Error('Shortcode already exists');
                }
                shortcode = customShortcode;
            } else {
                shortcode = generateShortcode();
            }

            // Calculate expiry time
            const createdAt = moment();
            const expiryTime = createdAt.clone().add(validity, 'minutes');

            // Create URL entry
            const urlEntry = {
                id: shortcode,
                originalUrl,
                shortcode,
                shortLink: `${this.baseUrl}/${shortcode}`,
                createdAt: createdAt.toISOString(),
                expiry: expiryTime.toISOString(),
                validity,
                isActive: true
            };

            // Store the URL
            urlStore.set(shortcode, urlEntry);
            
            // Initialize click statistics
            clickStats.set(shortcode, {
                totalClicks: 0,
                clicks: []
            });

            logger.Log('backend', 'info', 'service', `Short URL created with shortcode: ${shortcode} for URL: ${originalUrl}`);

            return {
                shortLink: urlEntry.shortLink,
                expiry: urlEntry.expiry
            };

        } catch (error) {
            logger.Log('backend', 'error', 'service', `Error creating short URL: ${error.message} for URL: ${originalUrl}`);
            throw error;
        }
    }

    // Get URL by shortcode
    getUrlByShortcode(shortcode) {
        const urlEntry = urlStore.get(shortcode);
        
        if (!urlEntry) {
            throw new Error('Shortcode not found');
        }

        // Check if URL has expired
        if (moment().isAfter(urlEntry.expiry)) {
            urlEntry.isActive = false;
            logger.Log('backend', 'warn', 'service', `Expired URL accessed: ${shortcode}`);
            throw new Error('URL has expired');
        }

        return urlEntry;
    }

    // Record a click
    recordClick(shortcode, req) {
        try {
            const urlEntry = this.getUrlByShortcode(shortcode);
            
            // Get client information
            const ip = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent') || '';
            const referer = req.get('Referer') || 'Direct';
            
            // Parse user agent safely
            let browser = 'Unknown';
            let os = 'Unknown';
            let device = 'Unknown';
            
            try {
                const ua = new UserAgent(userAgent);
                browser = ua.browser.name || 'Unknown';
                os = ua.os.name || 'Unknown';
                device = ua.device.type || 'Unknown';
            } catch (uaError) {
                logger.Log('backend', 'warn', 'service', `Failed to parse user agent: ${uaError.message}`);
                // Fallback to basic parsing
                if (userAgent.includes('Chrome')) browser = 'Chrome';
                else if (userAgent.includes('Firefox')) browser = 'Firefox';
                else if (userAgent.includes('Safari')) browser = 'Safari';
                else if (userAgent.includes('Edge')) browser = 'Edge';
                
                if (userAgent.includes('Windows')) os = 'Windows';
                else if (userAgent.includes('Mac')) os = 'macOS';
                else if (userAgent.includes('Linux')) os = 'Linux';
                else if (userAgent.includes('Android')) os = 'Android';
                else if (userAgent.includes('iOS')) os = 'iOS';
                
                if (userAgent.includes('Mobile')) device = 'mobile';
                else if (userAgent.includes('Tablet')) device = 'tablet';
                else device = 'desktop';
            }
            
            // Get geographical location
            const geo = geoip.lookup(ip);
            const location = geo ? {
                country: geo.country,
                region: geo.region,
                city: geo.city
            } : { country: 'Unknown', region: 'Unknown', city: 'Unknown' };

            // Create click record
            const clickRecord = {
                timestamp: moment().toISOString(),
                ip,
                userAgent: userAgent,
                browser,
                os,
                device,
                referer,
                location
            };

            // Update statistics
            const stats = clickStats.get(shortcode);
            stats.totalClicks++;
            stats.clicks.push(clickRecord);

            logger.Log('backend', 'info', 'service', `URL click recorded for shortcode: ${shortcode} from IP: ${ip} location: ${location.city}, ${location.country}`);

            return urlEntry.originalUrl;

        } catch (error) {
            logger.Log('backend', 'error', 'service', `Error recording click for shortcode: ${shortcode} - ${error.message}`);
            throw error;
        }
    }

    // Get statistics for a shortcode
    getStatistics(shortcode) {
        try {
            const urlEntry = this.getUrlByShortcode(shortcode);
            const stats = clickStats.get(shortcode);

            if (!stats) {
                throw new Error('Statistics not found');
            }

            return {
                shortcode: urlEntry.shortcode,
                originalUrl: urlEntry.originalUrl,
                shortLink: urlEntry.shortLink,
                createdAt: urlEntry.createdAt,
                expiry: urlEntry.expiry,
                isActive: urlEntry.isActive,
                totalClicks: stats.totalClicks,
                clicks: stats.clicks
            };

        } catch (error) {
            logger.Log('backend', 'error', 'service', `Error getting statistics for shortcode: ${shortcode} - ${error.message}`);
            throw error;
        }
    }

    // Clean up expired URLs (can be called periodically)
    cleanupExpiredUrls() {
        const now = moment();
        let cleanedCount = 0;

        for (const [shortcode, urlEntry] of urlStore.entries()) {
            if (now.isAfter(urlEntry.expiry)) {
                urlStore.delete(shortcode);
                clickStats.delete(shortcode);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            logger.Log('backend', 'info', 'service', `Cleaned up ${cleanedCount} expired URLs`);
        }

        return cleanedCount;
    }
}

module.exports = new UrlService();
