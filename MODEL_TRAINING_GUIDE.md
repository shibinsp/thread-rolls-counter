# Model Training Guide - Thread Roll Detection

## Overview

This system now tracks all user corrections to AI-detected bounding boxes and provides tools for exporting this data for model retraining. This enables continuous improvement of the AI model based on real-world user feedback.

## How It Works

### 1. User Correction Workflow

When users edit bounding boxes via the BBox Editor:
- **Deleted boxes**: AI detections that users removed (false positives)
- **Added boxes**: New boxes users drew (missed detections / false negatives)
- **Moved boxes**: Boxes users repositioned for better accuracy
- **Resized boxes**: Boxes users adjusted in size
- **Unchanged boxes**: AI detections that were correct

### 2. Data Preservation

**Original AI predictions are preserved:**
- Original bounding box coordinates are stored in `original_x`, `original_y`, `original_width`, `original_height`
- Correction type is tracked (`deleted`, `added`, `moved`, `resized`, `unchanged`)
- User who made the correction and timestamp are recorded

**This allows developers to:**
- Compare AI predictions vs. human corrections
- Identify patterns in AI mistakes
- Generate training data with ground truth labels

## API Endpoints

### 1. Get Correction Statistics

**Endpoint:** `GET /api/admin/correction-statistics`
**Access:** Admin only
**Purpose:** View overall correction statistics and AI accuracy

**Response:**
```json
{
  "summary": {
    "total_entries_corrected": 45,
    "total_ai_detections": 5230,
    "deleted_by_users": 234,
    "added_by_users": 156,
    "ai_accuracy_percent": 95.52
  },
  "correction_breakdown": {
    "deleted": 234,
    "added": 156,
    "moved": 45,
    "resized": 23,
    "unchanged": 4772
  },
  "top_correctors": [
    {"username": "user1", "corrections": 250},
    {"username": "user2", "corrections": 180}
  ],
  "recent_activity": [
    {"date": "2025-12-02", "corrections": 45},
    {"date": "2025-12-01", "corrections": 38}
  ]
}
```

### 2. Export Training Data

**Endpoint:** `GET /api/admin/training-data/export?format=yolo`
**Access:** Admin only
**Parameters:**
- `format`: `yolo` or `json`

#### YOLO Format Export

Downloads a ZIP file containing:
- `dataset.yaml` - Dataset configuration for YOLO training
- `labels/*.txt` - YOLO format annotations (one per image)
- `README.md` - Usage instructions

**Annotation Format:**
```
<class_id> <x_center> <y_center> <width> <height>
```
All coordinates normalized to 0-1

**Example:**
```
0 0.512 0.345 0.056 0.078
0 0.623 0.456 0.054 0.075
```

#### JSON Format Export

Downloads a JSON file with detailed correction information:
```json
[
  {
    "entry_id": 123,
    "image_path": "uploads/image123.jpg",
    "filename": "image123.jpg",
    "ai_detections": [
      {
        "x": 45.2,
        "y": 32.1,
        "width": 5.6,
        "height": 7.8,
        "false_positive": true
      }
    ],
    "corrected_detections": [
      {
        "x": 45.5,
        "y": 32.3,
        "width": 5.8,
        "height": 7.9,
        "correction_type": "moved"
      }
    ],
    "correction_stats": {
      "ai_count": 110,
      "final_count": 109,
      "difference": -1
    }
  }
]
```

### 3. Get Entry Correction Details

**Endpoint:** `GET /api/entries/{entry_id}/correction-details`
**Access:** All authenticated users
**Purpose:** View detailed corrections for a specific entry

## Model Retraining Workflow

### Step 1: Collect Corrections

1. Users correct bounding boxes via the BBox Editor
2. System automatically tracks all changes
3. Monitor correction statistics via `/api/admin/correction-statistics`

### Step 2: Export Training Data

```bash
# Export as YOLO format
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/admin/training-data/export?format=yolo" \
  -o training_data.zip

# Or export as JSON
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/admin/training-data/export?format=json" \
  -o training_data.json
```

### Step 3: Prepare Training Data

```bash
# Extract YOLO data
unzip training_data.zip

# Copy your images to the training directory
cp uploads/*.jpg images/train/

# Directory structure should be:
# ├── dataset.yaml
# ├── labels/
# │   ├── image1.txt
# │   ├── image2.txt
# └── images/
#     └── train/
#         ├── image1.jpg
#         ├── image2.jpg
```

### Step 4: Train Model

```python
from ultralytics import YOLO

# Load pretrained model
model = YOLO('yolov8n.pt')

# Train with corrected data
results = model.train(
    data='dataset.yaml',
    epochs=100,
    imgsz=640,
    batch=16,
    name='thread_roll_v2'
)

# Export model
model.export(format='pt')
```

### Step 5: Deploy New Model

```python
# In app/vision.py
detector = ThreadRollDetector(model_path='runs/detect/thread_roll_v2/weights/best.pt')
```

## Database Schema

### Detection Table Additions

```sql
-- Tracking fields
is_deleted BOOLEAN DEFAULT false,
original_x FLOAT,
original_y FLOAT,
original_width FLOAT,
original_height FLOAT,
correction_type VARCHAR,  -- 'deleted', 'added', 'moved', 'resized', 'unchanged'
corrected_by_user_id INTEGER REFERENCES users(id),
corrected_at TIMESTAMP
```

## Correction Types Explained

| Type | Description | Use for Training |
|------|-------------|------------------|
| `deleted` | AI detected but user removed | **False positive** - AI was wrong |
| `added` | User added manually | **False negative** - AI missed this |
| `moved` | User repositioned | **Position error** - Improve localization |
| `resized` | User adjusted size | **Size error** - Improve box dimensions |
| `unchanged` | AI was correct | **True positive** - Good detection |

## Analytics & Insights

### Identifying Model Weaknesses

```sql
-- Find most common false positives (deleted by users)
SELECT
    COUNT(*) as false_positives,
    AVG(confidence) as avg_confidence
FROM detections
WHERE correction_type = 'deleted';

-- Find patterns in missed detections
SELECT
    COUNT(*) as missed_detections
FROM detections
WHERE correction_type = 'added';

-- Calculate precision and recall
SELECT
    (COUNT(*) FILTER (WHERE correction_type != 'deleted'))::float / COUNT(*) as precision,
    (COUNT(*) FILTER (WHERE is_ai_detected))::float /
    (COUNT(*) FILTER (WHERE is_ai_detected OR correction_type = 'added')) as recall
FROM detections;
```

## Best Practices

### For Users
1. **Be thorough** - Correct all visible errors, not just obvious ones
2. **Draw accurately** - Boxes should tightly fit thread rolls
3. **Delete false positives** - Remove boxes on non-thread-roll objects
4. **Add missed rolls** - Draw boxes for any missed thread rolls

### For Developers
1. **Regular exports** - Export training data weekly or after significant corrections
2. **Version control** - Tag model versions with date and accuracy metrics
3. **A/B testing** - Test new models on holdout set before deployment
4. **Monitor accuracy** - Track AI accuracy over time via statistics endpoint
5. **Incremental training** - Combine old and new training data

## Troubleshooting

### Low AI Accuracy
- Check `correction_breakdown` for patterns
- Review `recent_activity` to ensure enough corrections
- Export JSON format to analyze specific failure cases

### Missing Corrections
- Ensure users are clicking "Save Corrections" button
- Check database for `corrected_at` timestamps
- Verify `was_edited_by_user` flag on entries

### Export Issues
- Ensure entries have `was_edited_by_user = true`
- Check that detections have valid coordinates
- Verify admin authentication token

## Future Enhancements

- [ ] Active learning: Surface low-confidence detections for review
- [ ] Automated model retraining pipeline
- [ ] Confusion matrix visualization
- [ ] Per-color detection accuracy
- [ ] Integration with MLOps platforms

## Support

For questions or issues:
1. Check correction statistics endpoint
2. Review export logs
3. Consult database schema
4. Test with small dataset first
