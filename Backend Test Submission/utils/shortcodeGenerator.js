const { v4: uuidv4 } = require('uuid');

// In-memory storage for shortcodes (in production, use a database)
const usedShortcodes = new Set();

// Generate a random shortcode
const generateShortcode = (length = 6) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let shortcode;
    
    do {
        shortcode = '';
        for (let i = 0; i < length; i++) {
            shortcode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (usedShortcodes.has(shortcode));
    
    usedShortcodes.add(shortcode);
    return shortcode;
};

// Validate if a shortcode is available
const isShortcodeAvailable = (shortcode) => {
    return !usedShortcodes.has(shortcode);
};

// Reserve a shortcode
const reserveShortcode = (shortcode) => {
    if (usedShortcodes.has(shortcode)) {
        return false;
    }
    usedShortcodes.add(shortcode);
    return true;
};

// Validate URL format
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
};

// Validate shortcode format (alphanumeric, reasonable length)
const isValidShortcode = (shortcode) => {
    const shortcodeRegex = /^[a-zA-Z0-9]{3,20}$/;
    return shortcodeRegex.test(shortcode);
};

module.exports = {
    generateShortcode,
    isShortcodeAvailable,
    reserveShortcode,
    isValidUrl,
    isValidShortcode
};
