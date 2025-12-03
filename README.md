# Thread Roll Counter Application

A professional web application for counting thread rolls in a rack and identifying their colors using computer vision.

## Features

- 🤖 **YOLOv11 Integration**: State-of-the-art object detection for accurate thread roll identification
- 📸 Upload images of thread roll racks
- 🔍 Automatic thread roll detection using computer vision (YOLOv11 + OpenCV fallback)
- 🎨 Color identification for each thread roll
- 📊 Historical analysis tracking
- 💾 SQLite database for persistent storage
- 🎯 Professional UI with real-time processing
- ⚡ GPU acceleration support (CUDA) for faster processing
- 🔄 Multiple detection methods with automatic fallback

## Tech Stack

### Frontend
- React 18
- Vite (build tool)
- Modern CSS with glassmorphism design
- Responsive layout

### Backend
- **YOLOv11** (Ultralytics) - Advanced object detection
- **PyTorch** - Deep learning framework
- FastAPI (Python)
- OpenCV for image processing (fallback)
- SQLite database
- PIL/Pillow for image manipulation
- scikit-learn for color clustering

## Project Structure

```
thread-rolls-counter/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   └── package.json
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── models.py        # Database models
│   │   ├── database.py      # Database connection
│   │   └── vision.py        # Computer vision logic
│   ├── uploads/             # Uploaded images
│   └── requirements.txt
└── README.md
```

## Installation & Setup

### Quick Setup (Recommended)

Run the automated setup script:

```bash
chmod +x setup.sh
./setup.sh
```

### Manual Setup

#### Prerequisites
- Python 3.8 or higher
- Node.js 16 or higher
- (Optional) CUDA-capable GPU for faster processing

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Linux/Mac
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the backend:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 1212
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open browser at `http://localhost:1111`

## Usage

1. Start both backend and frontend servers
2. Open the application in your browser
3. Click "Upload Image" or drag & drop an image of a thread roll rack
4. Wait for processing (the app will detect threads and identify colors)
5. View results showing:
   - Total thread count
   - Color breakdown with counts
   - Visual representation
6. Access history to see previous analyses

## API Endpoints

- `POST /api/analyze` - Upload and analyze thread roll image
- `GET /api/history` - Get analysis history
- `GET /api/analysis/{id}` - Get specific analysis details
- `DELETE /api/analysis/{id}` - Delete an analysis

## Computer Vision Approach

The application uses a multi-tiered detection strategy for maximum accuracy:

### Primary Method: YOLOv11
1. **Model Loading**: Automatically downloads YOLOv11 nano model (~6MB) on first use
2. **Object Detection**: Uses state-of-the-art deep learning for thread roll detection
3. **Bounding Box Extraction**: Identifies precise locations of thread rolls
4. **GPU Acceleration**: Automatically uses CUDA if available for faster processing

### Fallback Method 1: OpenCV Hough Transform
1. **Image Preprocessing**: Resize, denoise, enhance contrast
2. **Circle Detection**: Circular Hough Transform to detect circular thread rolls
3. **Multi-parameter Search**: Tries multiple parameter combinations for robustness

### Fallback Method 2: Grid-based Detection
1. **Grid Division**: Divides image into grid cells
2. **Color Sampling**: Analyzes dominant colors in each cell

### Color Identification (All Methods)
1. **Color Extraction**: K-means clustering or mean color calculation
2. **HSV Conversion**: Converts to HSV color space for better matching
3. **Color Naming**: Maps RGB/HSV values to 12 common color names
4. **Result Aggregation**: Counts and categorizes by color

## License

MIT License

## Testing

The project includes a test suite to verify detection accuracy, including specialized tests for specific scenarios like iron cage racks.

```bash
cd backend
source venv/bin/activate
pytest tests/
```
