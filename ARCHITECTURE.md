# Application Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                     http://localhost:5173                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP Requests
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      REACT FRONTEND                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  App.jsx (Main Component)                                │   │
│  │  - Upload Interface                                      │   │
│  │  - Results Display                                       │   │
│  │  - History View                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Services Layer                                          │   │
│  │  - api.js (API Communication)                            │   │
│  │  - helpers.js (Utilities)                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ REST API Calls
                             │ (JSON)
┌────────────────────────────▼────────────────────────────────────┐
│                    FASTAPI BACKEND                               │
│                  http://localhost:8000                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  main.py (API Routes)                                    │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  POST /api/analyze                                 │  │   │
│  │  │  GET  /api/history                                 │  │   │
│  │  │  GET  /api/analysis/{id}                           │  │   │
│  │  │  DELETE /api/analysis/{id}                         │  │   │
│  │  │  GET  /api/stats                                   │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │  vision.py (Computer Vision)                            │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  YOLOv11 Detection (Primary)                       │ │   │
│  │  │  - Load model (yolo11n.pt)                         │ │   │
│  │  │  - Run inference                                   │ │   │
│  │  │  - Extract bounding boxes                          │ │   │
│  │  │  - GPU acceleration                                │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  OpenCV Detection (Fallback 1)                     │ │   │
│  │  │  - Hough Circle Transform                          │ │   │
│  │  │  - Multi-parameter search                          │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  Grid Detection (Fallback 2)                       │ │   │
│  │  │  - Grid-based analysis                             │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  Color Recognition                                 │ │   │
│  │  │  - HSV conversion                                  │ │   │
│  │  │  - Color matching                                  │ │   │
│  │  │  - 12 color categories                             │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │  database.py + models.py                                │   │
│  │  - SQLAlchemy ORM                                       │   │
│  │  - Session management                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ SQL Queries
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    SQLITE DATABASE                               │
│                  thread_counter.db                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  analyses Table                                          │   │
│  │  - id (Primary Key)                                      │   │
│  │  - filename                                              │   │
│  │  - upload_time                                           │   │
│  │  - total_threads                                         │   │
│  │  - color_breakdown (JSON)                                │   │
│  │  - processing_time                                       │   │
│  │  - image_path                                            │   │
│  │  - thumbnail_path                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      FILE STORAGE                                │
│                    backend/uploads/                              │
│  - Original images                                               │
│  - Annotated images (uploads/annotated/)                         │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Image Upload & Analysis

```
User Action
    │
    ├─> Select/Drop Image
    │
    ├─> Preview in Browser
    │
    ├─> Click "Analyze"
    │
    ▼
Frontend (React)
    │
    ├─> Create FormData
    │
    ├─> POST /api/analyze
    │
    ▼
Backend (FastAPI)
    │
    ├─> Validate file type
    │
    ├─> Save to uploads/
    │
    ├─> Call vision.analyze_image()
    │
    ▼
Vision Module
    │
    ├─> Try YOLOv11
    │   ├─> Load model
    │   ├─> Run inference
    │   ├─> Extract detections
    │   └─> Success? ──> Extract colors ──┐
    │                                      │
    ├─> Fallback to OpenCV                │
    │   ├─> Preprocess image              │
    │   ├─> Hough Circle Transform        │
    │   └─> Success? ──> Extract colors ──┤
    │                                      │
    ├─> Fallback to Grid                  │
    │   ├─> Divide into grid              │
    │   └─> Analyze colors ────────────────┤
    │                                      │
    ▼                                      │
Color Recognition  <──────────────────────┘
    │
    ├─> Convert to HSV
    │
    ├─> Match to color names
    │
    ├─> Count by color
    │
    ▼
Create Annotated Image
    │
    ├─> Draw bounding boxes/circles
    │
    ├─> Save to uploads/annotated/
    │
    ▼
Save to Database
    │
    ├─> Create Analysis record
    │
    ├─> Store metadata
    │
    ▼
Return Results (JSON)
    │
    ├─> total_threads
    ├─> color_breakdown
    ├─> processing_time
    ├─> image_url
    └─> annotated_url
    │
    ▼
Frontend Display
    │
    ├─> Show statistics
    ├─> Display color breakdown
    ├─> Show images
    └─> Update history
```

### 2. View History

```
User Action
    │
    ├─> Load application
    │
    ▼
Frontend
    │
    ├─> GET /api/history
    │
    ▼
Backend
    │
    ├─> Query database
    │
    ├─> Order by upload_time DESC
    │
    ├─> Limit results
    │
    ▼
Return Results
    │
    ├─> Array of analyses
    │
    ▼
Frontend Display
    │
    ├─> Render history grid
    │
    ├─> Show thumbnails
    │
    └─> Click to view details
```

## Technology Integration

### YOLOv11 Integration

```
Application Startup
    │
    ▼
ThreadRollDetector.__init__()
    │
    ├─> Import YOLO from ultralytics
    │
    ├─> YOLO('yolo11n.pt')
    │   │
    │   ├─> Check local cache (~/.cache/ultralytics/)
    │   │
    │   ├─> Not found? Download from Ultralytics
    │   │   └─> ~6MB download
    │   │
    │   └─> Load model weights
    │
    ├─> Check GPU availability
    │   ├─> torch.cuda.is_available()
    │   └─> Set device (cuda/cpu)
    │
    └─> Ready for inference
```

### Image Processing Pipeline

```
Input Image
    │
    ▼
YOLOv11 Path
    │
    ├─> model(image, device=device)
    │
    ├─> Get bounding boxes
    │   ├─> x1, y1, x2, y2
    │   ├─> confidence score
    │   └─> class (if applicable)
    │
    ├─> For each box:
    │   ├─> Extract ROI
    │   ├─> Calculate mean color
    │   ├─> Convert BGR → HSV
    │   └─> Match to color name
    │
    └─> Return detections + colors
```

## Deployment Architecture

### Development

```
┌─────────────┐     ┌─────────────┐
│  Frontend   │     │   Backend   │
│  Vite Dev   │────▶│   Uvicorn   │
│  :5173      │     │   :8000     │
└─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   SQLite    │
                    │  (local DB) │
                    └─────────────┘
```

### Production (Recommended)

```
┌──────────────────────────────────────────┐
│           Load Balancer / CDN            │
│              (CloudFlare)                │
└────────────┬─────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐     ┌──────────────┐
│Frontend │     │   Backend    │
│ (Vercel)│     │  (Railway)   │
│  React  │     │   FastAPI    │
└─────────┘     └──────┬───────┘
                       │
                       ▼
                ┌─────────────┐
                │ PostgreSQL  │
                │  (Cloud DB) │
                └─────────────┘
                       │
                       ▼
                ┌─────────────┐
                │  S3/Cloud   │
                │   Storage   │
                │  (Images)   │
                └─────────────┘
```

## Security Layers

```
Request
    │
    ├─> CORS Validation
    │
    ├─> File Type Check
    │
    ├─> File Size Limit
    │
    ├─> Input Sanitization
    │
    ├─> SQL Injection Prevention (ORM)
    │
    ├─> Path Traversal Prevention
    │
    └─> Error Handling (No sensitive data)
```

## Performance Optimizations

### Backend
- Async/await for I/O operations
- GPU acceleration for YOLO
- Image caching
- Database indexing
- Static file serving

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- Efficient re-renders
- Memoization

---

**Architecture designed for scalability, maintainability, and performance**
