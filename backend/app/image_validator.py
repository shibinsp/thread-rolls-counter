"""
Image URL Validation and Path Resolution Module
"""
import os
from typing import Dict, Tuple, Optional
from pathlib import Path

class ImageValidator:
    """Validates image paths and URLs for the thread counter application"""

    VALID_PATHS = [
        "/uploads/",
        "/uploads/annotated/"
    ]

    PLACEHOLDER_IMAGE = "/static/placeholder.png"

    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = upload_dir
        self.annotated_dir = os.path.join(upload_dir, "annotated")

    def validate_url(self, url: str) -> Dict[str, any]:
        """
        Validate an image URL and check if the file exists

        Args:
            url: The image URL to validate (e.g., /uploads/image.jpg)

        Returns:
            Dictionary with validation results
        """
        result = {
            "is_valid": False,
            "url": url,
            "file_exists": False,
            "error": None,
            "suggested_url": None
        }

        if not url:
            result["error"] = "URL is empty"
            result["suggested_url"] = self.PLACEHOLDER_IMAGE
            return result

        # Check if URL starts with valid path
        is_valid_path = any(url.startswith(path) for path in self.VALID_PATHS)

        if not is_valid_path:
            result["error"] = f"Invalid URL path. Expected one of: {self.VALID_PATHS}"
            result["suggested_url"] = self.PLACEHOLDER_IMAGE
            return result

        # Convert URL to file path
        file_path = self._url_to_filepath(url)

        # Check if file exists
        if os.path.exists(file_path):
            result["is_valid"] = True
            result["file_exists"] = True
            result["file_size"] = os.path.getsize(file_path)
            result["suggested_url"] = url
        else:
            result["error"] = f"File not found: {file_path}"
            result["suggested_url"] = self.PLACEHOLDER_IMAGE

        return result

    def validate_entry_images(self, image_url: str, annotated_url: Optional[str] = None) -> Dict[str, any]:
        """
        Validate both original and annotated image URLs for an entry

        Args:
            image_url: Original image URL
            annotated_url: Annotated image URL (optional)

        Returns:
            Dictionary with validation results for both images
        """
        result = {
            "original": self.validate_url(image_url),
            "annotated": None,
            "both_valid": False
        }

        if annotated_url:
            result["annotated"] = self.validate_url(annotated_url)
            result["both_valid"] = (
                result["original"]["is_valid"] and
                result["annotated"]["is_valid"]
            )
        else:
            result["both_valid"] = result["original"]["is_valid"]

        return result

    def fix_image_url(self, url: str, filename: str = None) -> str:
        """
        Attempt to fix a broken image URL

        Args:
            url: The broken URL
            filename: Optional filename to try

        Returns:
            Fixed URL or placeholder
        """
        # If URL is valid, return it
        validation = self.validate_url(url)
        if validation["is_valid"]:
            return url

        # Try with filename if provided
        if filename:
            test_url = f"/uploads/{filename}"
            validation = self.validate_url(test_url)
            if validation["is_valid"]:
                return test_url

        # Return placeholder
        return self.PLACEHOLDER_IMAGE

    def _url_to_filepath(self, url: str) -> str:
        """
        Convert a URL to a file system path

        Args:
            url: The URL to convert (e.g., /uploads/image.jpg)

        Returns:
            File system path
        """
        # Remove leading slash
        url_path = url.lstrip('/')

        # Replace /uploads/ with actual upload directory
        if url_path.startswith('uploads/'):
            return url_path

        return url_path

    def get_image_info(self, url: str) -> Optional[Dict[str, any]]:
        """
        Get detailed information about an image

        Args:
            url: The image URL

        Returns:
            Dictionary with image info or None
        """
        file_path = self._url_to_filepath(url)

        if not os.path.exists(file_path):
            return None

        stat = os.stat(file_path)

        return {
            "url": url,
            "path": file_path,
            "size": stat.st_size,
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "modified": stat.st_mtime,
            "exists": True
        }

    def check_cors_headers(self) -> Dict[str, str]:
        """
        Get recommended CORS headers for image serving

        Returns:
            Dictionary of CORS headers
        """
        return {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "3600"
        }
