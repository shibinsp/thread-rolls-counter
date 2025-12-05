const COLOR_MAP = {
    red: '#ef4444',
    orange: '#f97316',
    yellow: '#eab308',
    green: '#22c55e',
    cyan: '#06b6d4',
    blue: '#3b82f6',
    purple: '#a855f7',
    pink: '#ec4899',
    white: '#f3f4f6',
    gray: '#6b7280',
    black: '#1f2937',
    brown: '#92400e',
    unknown: '#9ca3af',
};

export function getColorHex(colorName) {
    return COLOR_MAP[colorName?.toLowerCase()] || COLOR_MAP.unknown;
}

export function formatDate(dateString) {
    if (!dateString) return '';

    // Parse the date string - it should be in ISO 8601 format from the server
    let date;
    if (typeof dateString === 'string') {
        // Handle both ISO 8601 formats (with and without 'Z')
        date = new Date(dateString);
    } else {
        date = new Date(dateString);
    }

    // Check if date parsing failed
    if (isNaN(date.getTime())) {
        return dateString;
    }

    // Get current time in UTC (server sends UTC, so we compare in UTC)
    const now = new Date();
    // Calculate difference in milliseconds
    const diff = now.getTime() - date.getTime();

    // Handle negative differences (future dates)
    if (diff < 0) {
        return 'in the future';
    }

    // Less than 1 minute
    if (diff < 60000) {
        return 'Just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `${mins} min${mins > 1 ? 's' : ''} ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    // Less than 7 days
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    // Default format
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
    }).format(date);
}

export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Image validation utilities
 * For detailed documentation, see:
 * - /src/utils/imageValidator.js - Core validation logic
 * - /src/config/imageValidation.config.js - Configuration
 * - /src/components/SafeImage.jsx - React component
 */
export {
    isValidImageUrl,
    getImageUrl,
    validateImageUrls,
    loadImageWithRetry,
    fixEntryImages,
    useImageLoader,
    preloadImages,
    checkImageExists,
    IMAGE_CONFIG
} from './imageValidator';
