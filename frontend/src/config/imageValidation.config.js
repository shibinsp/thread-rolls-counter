/**
 * Image Validation Configuration
 *
 * This configuration defines how images are validated, loaded, and displayed
 * in the Thread Roll Counter application.
 */

export const IMAGE_VALIDATION_CONFIG = {
  /**
   * Task: Validate and fix image display
   *
   * Input:
   * - original_image_url: URL to the original uploaded image
   * - detected_image_url: URL to the AI-annotated image with detections
   */
  task: "validate_and_fix_image_display",

  /**
   * Validation Checks
   * Defines what validations to perform on image URLs
   */
  checks: {
    validate_url_format: true,      // Check if URL matches expected patterns
    verify_file_exists: true,        // Verify file exists on backend
    check_cors: true,                // Ensure CORS headers are present
    check_backend_path: true         // Validate path is from expected backend routes
  },

  /**
   * Expected Backend Paths
   * All image URLs must start with one of these paths
   *
   * Current System:
   * - /uploads/ - Original uploaded images
   * - /uploads/annotated/ - AI-annotated images with bounding boxes
   */
  expected_backend_paths: [
    "/uploads/",
    "/uploads/annotated/"
  ],

  /**
   * Backend API Endpoints
   */
  api_endpoints: {
    validate_image: "/api/validate-image",           // POST - Validate image URLs
    validate_path: "/api/validate-image/{path}",     // GET - Validate single path
    image_info: "/api/image-info/{path}"             // GET - Get image metadata
  },

  /**
   * Output Format
   * How validation results are returned
   */
  output_format: "json",

  /**
   * Error Handling
   * Defines fallback behavior when images fail to load
   */
  on_error_fallback: {
    // Placeholder image (1x1 transparent PNG)
    replace_broken_image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",

    // Message to show when image is not found
    show_message: "Image not found or unavailable",

    // Max retry attempts before showing placeholder
    max_retries: 2,

    // Retry delay in milliseconds (exponential backoff)
    retry_delay_ms: 1000,

    // Timeout for image loading (ms)
    load_timeout_ms: 10000
  },

  /**
   * Response Template
   * Structure of validation response
   */
  response_template: {
    fixed_original_url: "",
    fixed_detected_url: "",

    frontend_instructions: [
      "Use <SafeImage src={{fixed_original_url}} alt='Original' />",
      "Use <SafeImage src={{fixed_detected_url}} alt='Detected' />",
      "SafeImage component handles errors automatically",
      "Container should have max-width: 100% and object-fit: contain",
      "If URL is empty, placeholder image will be rendered automatically"
    ]
  },

  /**
   * CORS Configuration
   * Required CORS headers for image serving
   */
  cors_headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "3600"
  },

  /**
   * Image Display Guidelines
   */
  display_guidelines: {
    // Container styles
    container: {
      maxWidth: "100%",
      objectFit: "contain",
      backgroundColor: "#f5f5f5",
      borderRadius: "8px",
      minHeight: "200px"
    },

    // Responsive breakpoints
    responsive: {
      mobile: {
        maxWidth: "100%",
        minHeight: "150px"
      },
      tablet: {
        maxWidth: "100%",
        minHeight: "200px"
      },
      desktop: {
        maxWidth: "100%",
        minHeight: "300px"
      }
    },

    // Loading states
    loading: {
      showSpinner: true,
      backgroundColor: "#f5f5f5",
      opacity: 0.5
    },

    // Error states
    error: {
      showMessage: true,
      backgroundColor: "#fef5f5",
      borderColor: "#e0e0e0",
      borderStyle: "dashed"
    }
  },

  /**
   * Usage Examples
   */
  usage_examples: {
    // Example 1: Using SafeImage component
    safeImage: {
      original: "<SafeImage src={entry.image_url} alt='Original Thread Roll Image' />",
      annotated: "<SafeImage src={entry.annotated_url} alt='AI Detected Threads' />"
    },

    // Example 2: Using image validation utility
    validation: `
      import { validateImageUrls, fixEntryImages } from '../utils/imageValidator';

      // Validate both URLs
      const validation = await validateImageUrls(
        entry.image_url,
        entry.annotated_url
      );

      // Or fix entry automatically
      const fixedEntry = await fixEntryImages(entry);
    `,

    // Example 3: Preloading images
    preload: `
      import { preloadImages } from '../utils/imageValidator';

      const urls = entries.map(e => e.image_url);
      await preloadImages(urls);
    `
  },

  /**
   * Troubleshooting Guide
   */
  troubleshooting: {
    "Images not displaying": [
      "1. Check nginx configuration proxies /uploads/ to backend",
      "2. Verify backend is serving files from correct directory",
      "3. Check CORS headers are set correctly",
      "4. Ensure file exists in uploads directory",
      "5. Check browser console for specific errors"
    ],

    "CORS errors": [
      "1. Verify nginx includes proper CORS headers",
      "2. Check CORS_ORIGINS in backend .env includes frontend domain",
      "3. Ensure preflight OPTIONS requests are handled",
      "4. Test direct backend URL access"
    ],

    "Slow image loading": [
      "1. Enable nginx caching for /uploads/ path",
      "2. Implement image preloading for known URLs",
      "3. Consider image optimization/compression",
      "4. Use lazy loading for off-screen images"
    ]
  }
};

export default IMAGE_VALIDATION_CONFIG;
