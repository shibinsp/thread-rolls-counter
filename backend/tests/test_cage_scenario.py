import pytest
import cv2
import numpy as np
import os
from pathlib import Path

# Test image path
TEST_IMAGE_PATH = "/home/shibin/Desktop/thread rolls counter/sample_test_image/WhatsApp Image 2025-11-18 at 7.43.51 PM.jpeg"

def detect_cage_and_count(image_path):
    """
    Logic to detect threads specifically inside the iron cage.
    This replicates the logic from analyze_cage_threads.py
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not load image: {image_path}")
        
    height, width = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 1. Detect all circles first
    blurred = cv2.GaussianBlur(gray, (9, 9), 2)
    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=20,
        param1=50,
        param2=30,
        minRadius=10,
        maxRadius=50
    )
    
    if circles is None:
        return 0, 0, 0
        
    circles = np.uint16(np.around(circles))
    all_circles = circles[0]
    
    # 2. Define Cage Region (Density-based)
    # Create a density map
    density_map = np.zeros((height, width), dtype=np.float32)
    for circle in all_circles:
        x, y, r = circle
        cv2.circle(density_map, (x, y), r*2, 1.0, -1)

    # Apply Gaussian blur to create smooth density map
    density_map = cv2.GaussianBlur(density_map, (101, 101), 0)

    # Find the region with highest density
    threshold = np.max(density_map) * 0.3
    high_density = density_map > threshold

    # Find contours of high-density regions
    contours, _ = cv2.findContours(high_density.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return len(all_circles), 0, len(all_circles) # Fallback
        
    # Find the largest contour (main cage)
    largest_contour = max(contours, key=cv2.contourArea)
    cage_x, cage_y, cage_w, cage_h = cv2.boundingRect(largest_contour)
    
    # 3. Filter circles
    inside_count = 0
    outside_count = 0
    
    for circle in all_circles:
        x, y, r = circle
        if cage_x <= x <= cage_x + cage_w and cage_y <= y <= cage_y + cage_h:
            inside_count += 1
        else:
            outside_count += 1
            
    return inside_count, outside_count, len(all_circles)

def test_iron_cage_thread_count():
    """
    Test that verifies the thread count inside the iron cage is approximately 199.
    Allows for a small margin of error (+/- 5%).
    """
    if not os.path.exists(TEST_IMAGE_PATH):
        pytest.skip(f"Test image not found at {TEST_IMAGE_PATH}")
        
    inside, outside, total = detect_cage_and_count(TEST_IMAGE_PATH)
    
    print(f"\nAnalysis Results:")
    print(f"  Inside Cage: {inside}")
    print(f"  Outside: {outside}")
    print(f"  Total: {total}")
    
    # Target is 199 based on initial analysis
    target_count = 199
    margin = target_count * 0.05 # 5% margin
    
    assert abs(inside - target_count) <= margin, \
        f"Thread count inside cage ({inside}) deviated significantly from target ({target_count})"

if __name__ == "__main__":
    # Manually run if executed as script
    try:
        inside, outside, total = detect_cage_and_count(TEST_IMAGE_PATH)
        print(f"SUCCESS: Detected {inside} threads inside cage (Target: 199)")
    except Exception as e:
        print(f"FAILED: {e}")
