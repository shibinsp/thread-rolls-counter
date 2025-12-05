/**
 * SafeImage Component
 * Automatically handles image loading errors, validates URLs, and provides fallbacks
 */

import React, { useState, useEffect } from 'react';
import { getImageUrl, IMAGE_CONFIG, isValidImageUrl } from '../utils/imageValidator';
import './SafeImage.css';

const SafeImage = ({
  src,
  alt = 'Image',
  className = '',
  style = {},
  onLoad,
  onError,
  showPlaceholder = true,
  retryCount = 2,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(IMAGE_CONFIG.placeholderImage);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retries, setRetries] = useState(retryCount);

  useEffect(() => {
    // Reset state when src changes
    setIsLoading(true);
    setHasError(false);
    setRetries(retryCount);

    // Validate and load image
    if (!src || !isValidImageUrl(src)) {
      setImageSrc(IMAGE_CONFIG.placeholderImage);
      setIsLoading(false);
      setHasError(true);
      return;
    }

    setImageSrc(getImageUrl(src));
  }, [src, retryCount]);

  const handleLoad = (e) => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) onLoad(e);
  };

  const handleError = (e) => {
    console.error('Image load error:', src);

    if (retries > 0) {
      // Retry loading after a delay
      const delay = (retryCount - retries + 1) * 1000;
      setTimeout(() => {
        setRetries(retries - 1);
        setImageSrc(getImageUrl(src) + `?retry=${retryCount - retries}`);
      }, delay);
    } else {
      // All retries exhausted, show placeholder
      setIsLoading(false);
      setHasError(true);
      if (showPlaceholder) {
        setImageSrc(IMAGE_CONFIG.placeholderImage);
      }
      if (onError) onError(e);
    }
  };

  const containerClasses = [
    'safe-image-container',
    className,
    isLoading ? 'loading' : '',
    hasError ? 'error' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} style={style}>
      <img
        src={imageSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className="safe-image"
        loading="lazy"
        {...props}
      />
      {isLoading && (
        <div className="image-loader">
          <div className="spinner"></div>
        </div>
      )}
      {hasError && showPlaceholder && (
        <div className="image-error-message">
          <span>⚠️ Image unavailable</span>
        </div>
      )}
    </div>
  );
};

export default SafeImage;
