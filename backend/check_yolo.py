from ultralytics import YOLO
import os

try:
    print("Attempting to load YOLO('yolo11n.pt')...")
    model = YOLO('yolo11n.pt')
    print("Success!")
except Exception as e:
    print(f"Failed: {e}")
    # Try to list current dir
    print(f"Current dir: {os.getcwd()}")
    print(f"Files: {os.listdir('.')}")
