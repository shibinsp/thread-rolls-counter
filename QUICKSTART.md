# Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Run Setup
```bash
./setup.sh
```

This will:
- Create Python virtual environment
- Install all backend dependencies (FastAPI, YOLOv11, OpenCV, etc.)
- Install all frontend dependencies (React, Vite, etc.)

### Step 2: Start Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**First Run Note**: YOLOv11 model (~6MB) will download automatically. This is normal!

You should see:
```
✓ YOLOv11 model loaded successfully
✓ Using device: cuda  (or cpu if no GPU)
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 3: Start Frontend (New Terminal)
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Step 4: Use the Application

1. Open browser at `http://localhost:5173`
2. Upload an image of thread rolls
3. Click "Analyze Image"
4. View results with thread count and color breakdown!

## 🎯 Testing the Application

### Sample Images
You can test with:
- Photos of thread spools on a rack
- Images of colored objects arranged in rows
- Any image with circular/cylindrical objects

### Expected Results
- **Detection Method**: Should show "YOLOv11" for best accuracy
- **Processing Time**: 1-3 seconds (faster with GPU)
- **Color Detection**: Identifies up to 12 different colors

## 🔧 Troubleshooting

### Backend won't start
```bash
# Make sure you're in the virtual environment
cd backend
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend won't start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### YOLOv11 not loading
- First run downloads the model (~6MB)
- Check internet connection
- Model will be cached in `~/.cache/ultralytics/`

### No GPU detected
- This is fine! CPU mode works well
- For GPU support, install CUDA toolkit
- Check with: `python -c "import torch; print(torch.cuda.is_available())"`

## 📊 API Endpoints

Test the API directly:

```bash
# Check API status
curl http://localhost:8000/

# Upload image for analysis
curl -X POST -F "file=@your_image.jpg" http://localhost:8000/api/analyze

# Get history
curl http://localhost:8000/api/history

# Get statistics
curl http://localhost:8000/api/stats
```

## 🎨 Features to Try

1. **Upload & Analyze**: Drag and drop or click to upload
2. **View Results**: See total count and color breakdown
3. **History**: Click on previous analyses to view again
4. **Annotated Images**: See detected threads highlighted
5. **Color Visualization**: Interactive color swatches

## 💡 Tips

- **Best Results**: Use well-lit images with clear thread spools
- **Image Quality**: Higher resolution = better detection
- **Background**: Plain backgrounds work best
- **Lighting**: Even lighting improves color detection
- **GPU**: If available, processing is 3-5x faster

## 🔄 Updating

```bash
# Update backend dependencies
cd backend
source venv/bin/activate
pip install --upgrade -r requirements.txt

# Update frontend dependencies
cd frontend
npm update
```

## 📝 Next Steps

- Try different images
- Check the history section
- View annotated images
- Explore the API documentation at `http://localhost:8000/docs`

Enjoy using the Thread Roll Counter! 🧵
