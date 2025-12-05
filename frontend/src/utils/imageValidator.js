/**
 * Image Validation and Loading Utilities
 * Handles broken images, CORS issues, and provides fallback mechanisms
 */

import { api } from '../services/api';

/**
 * Configuration for image validation
 */
export const IMAGE_CONFIG = {
  // Expected backend paths
  validPaths: [
    '/uploads/',
    '/uploads/annotated/'
  ],

  // Placeholder image (base64 1x1 transparent PNG)
  placeholderImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',

  // Max retries for loading images
  maxRetries: 2,

  // Timeout for image loading (ms)
  loadTimeout: 10000
};

/**
 * Validate image URL format
 * @param {string} url - Image URL to validate
 * @returns {boolean} - True if URL format is valid
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  return IMAGE_CONFIG.validPaths.some(path => url.startsWith(path));
}

/**
 * Get full image URL with API base
 * @param {string} path - Relative image path
 * @returns {string} - Full image URL
 */
export function getImageUrl(path) {
  if (!path) {
    return IMAGE_CONFIG.placeholderImage;
  }

  return api.getImageUrl(path);
}

/**
 * Validate image URL with backend
 * @param {string} imageUrl - Original image URL
 * @param {string} annotatedUrl - Annotated image URL (optional)
 * @returns {Promise<Object>} - Validation result
 */
export async function validateImageUrls(imageUrl, annotatedUrl = null) {
  try {
    const response = await fetch(`${api.getImageUrl('')}/api/validate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        annotated_url: annotatedUrl
      })
    });

    if (!response.ok) {
      throw new Error('Validation failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Image validation error:', error);
    return {
      original: {
        url: imageUrl,
        is_valid: false,
        fixed_url: IMAGE_CONFIG.placeholderImage,
        error: error.message
      },
      annotated: annotatedUrl ? {
        url: annotatedUrl,
        is_valid: false,
        fixed_url: IMAGE_CONFIG.placeholderImage,
        error: error.message
      } : null,
      both_valid: false
    };
  }
}

/**
 * Load image with timeout and retry logic
 * @param {string} url - Image URL to load
 * @param {number} retries - Number of retries remaining
 * @returns {Promise<string>} - Loaded image URL or placeholder
 */
export function loadImageWithRetry(url, retries = IMAGE_CONFIG.maxRetries) {
  return new Promise((resolve) => {
    if (!url || !isValidImageUrl(url)) {
      resolve(IMAGE_CONFIG.placeholderImage);
      return;
    }

    const fullUrl = getImageUrl(url);
    const img = new Image();
    let timeoutId;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      cleanup();
      resolve(fullUrl);
    };

    img.onerror = () => {
      cleanup();

      if (retries > 0) {
        // Retry with exponential backoff
        const delay = (IMAGE_CONFIG.maxRetries - retries + 1) * 1000;
        setTimeout(() => {
          loadImageWithRetry(url, retries - 1).then(resolve);
        }, delay);
      } else {
        console.warn(`Failed to load image after ${IMAGE_CONFIG.maxRetries} retries:`, url);
        resolve(IMAGE_CONFIG.placeholderImage);
      }
    };

    // Set timeout for loading
    timeoutId = setTimeout(() => {
      cleanup();
      console.warn('Image load timeout:', url);

      if (retries > 0) {
        loadImageWithRetry(url, retries - 1).then(resolve);
      } else {
        resolve(IMAGE_CONFIG.placeholderImage);
      }
    }, IMAGE_CONFIG.loadTimeout);

    img.src = fullUrl;
  });
}

/**
 * Fix entry image URLs by validating and providing fallbacks
 * @param {Object} entry - Entry object with image URLs
 * @returns {Promise<Object>} - Entry with fixed image URLs
 */
export async function fixEntryImages(entry) {
  if (!entry) {
    return entry;
  }

  const validation = await validateImageUrls(
    entry.image_url,
    entry.annotated_url
  );

  return {
    ...entry,
    image_url: validation.original.is_valid ? entry.image_url : validation.original.fixed_url,
    annotated_url: validation.annotated?.is_valid ? entry.annotated_url : validation.annotated?.fixed_url,
    _imageValidation: validation
  };
}

/**
 * React hook-friendly image loader component helper
 * @param {string} url - Image URL
 * @param {Function} onLoad - Callback when image loads
 * @param {Function} onError - Callback when image fails to load
 * @returns {Object} - Image props
 */
export function useImageLoader(url, onLoad, onError) {
  const handleLoad = (e) => {
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    console.error('Image load error:', url);
    e.target.src = IMAGE_CONFIG.placeholderImage;
    if (onError) onError(e);
  };

  return {
    src: url ? getImageUrl(url) : IMAGE_CONFIG.placeholderImage,
    onLoad: handleLoad,
    onError: handleError,
    loading: 'lazy'
  };
}

/**
 * Get image loading CSS classes
 * @param {boolean} isLoading - Is image currently loading
 * @param {boolean} hasError - Did image fail to load
 * @returns {string} - CSS class names
 */
export function getImageClasses(isLoading, hasError) {
  const classes = ['image'];
  if (isLoading) classes.push('image-loading');
  if (hasError) classes.push('image-error');
  return classes.join(' ');
}

/**
 * Preload images for better UX
 * @param {Array<string>} urls - Array of image URLs to preload
 * @returns {Promise<Array>} - Promise that resolves when all images are loaded or failed
 */
export async function preloadImages(urls) {
  const promises = urls
    .filter(url => url && isValidImageUrl(url))
    .map(url => loadImageWithRetry(url));

  return Promise.all(promises);
}

/**
 * Check if image exists at URL (HEAD request)
 * @param {string} url - Image URL to check
 * @returns {Promise<boolean>} - True if image exists
 */
export async function checkImageExists(url) {
  try {
    const fullUrl = getImageUrl(url);
    const response = await fetch(fullUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error checking image:', error);
    return false;
  }
}

export default {
  isValidImageUrl,
  getImageUrl,
  validateImageUrls,
  loadImageWithRetry,
  fixEntryImages,
  useImageLoader,
  getImageClasses,
  preloadImages,
  checkImageExists,
  IMAGE_CONFIG
};
