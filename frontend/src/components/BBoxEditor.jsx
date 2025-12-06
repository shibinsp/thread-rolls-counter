import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../services/api';

/**
 * BBoxEditor - Interactive bounding box editor for thread roll detection corrections
 */

function BBoxEditor({ 
  imageUrl, 
  entryId, 
  predictions = [], 
  onSave, 
  onClose,
  readOnly = false 
}) {
  const containerRef = useRef(null);
  const [boxes, setBoxes] = useState([]);
  const [selectedBox, setSelectedBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [currentDraw, setCurrentDraw] = useState(null);
  const [dragMode, setDragMode] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('select');
  
  // Image state
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  // Initialize boxes from predictions
  useEffect(() => {
    if (predictions && predictions.length > 0) {
      const validBoxes = predictions
        .filter(p => {
          const isValid = p.width > 1 && p.height > 1 && 
                         p.x >= 0 && p.y >= 0 && 
                         p.x < 100 && p.y < 100;
          return isValid;
        })
        .map((p, idx) => ({
          id: `box-${idx}-${Date.now()}`,
          x: Math.min(100, Math.max(0, Number(p.x) || 0)),
          y: Math.min(100, Math.max(0, Number(p.y) || 0)),
          width: Math.min(100, Math.max(3, Number(p.width) || 5)),
          height: Math.min(100, Math.max(3, Number(p.height) || 5)),
          label: p.label || 'Thread Roll',
          color: p.color,
          isAiDetected: p.is_ai_detected !== false
        }));
      
      // Clamp boxes to ensure they don't exceed 100%
      const clampedBoxes = validBoxes.map(box => ({
        ...box,
        width: Math.min(box.width, 100 - box.x),
        height: Math.min(box.height, 100 - box.y)
      }));
      
      console.log('Loaded boxes:', clampedBoxes.length);
      setBoxes(clampedBoxes);
    }
  }, [predictions]);

  // Calculate display size when image loads or container resizes
  const calculateDisplaySize = useCallback(() => {
    if (!containerRef.current || !imageNaturalSize.width || !imageNaturalSize.height) {
      return;
    }
    
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    // Use more padding to ensure image fits well
    const maxWidth = containerRect.width - 60;
    const maxHeight = containerRect.height - 60;
    
    if (maxWidth <= 0 || maxHeight <= 0) return;
    
    const imageAspect = imageNaturalSize.width / imageNaturalSize.height;
    
    let width, height;
    
    // Calculate size that fits within container while maintaining aspect ratio
    const widthFromHeight = maxHeight * imageAspect;
    const heightFromWidth = maxWidth / imageAspect;
    
    if (widthFromHeight <= maxWidth) {
      // Height is the constraint
      height = maxHeight;
      width = widthFromHeight;
    } else {
      // Width is the constraint
      width = maxWidth;
      height = heightFromWidth;
    }
    
    console.log('Image natural:', imageNaturalSize, 'Display:', { width, height }, 'Container:', { maxWidth, maxHeight });
    setDisplaySize({ width: Math.floor(width), height: Math.floor(height) });
  }, [imageNaturalSize]);

  // Recalculate on resize and after mount
  useEffect(() => {
    // Delay calculation to ensure container is rendered
    const timer = setTimeout(calculateDisplaySize, 100);
    
    const handleResize = () => {
      setTimeout(calculateDisplaySize, 50);
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateDisplaySize]);

  // Preload image to get natural dimensions
  useEffect(() => {
    if (!imageUrl) return;
    
    const img = document.createElement('img');
    img.onload = () => {
      console.log('Image loaded:', img.naturalWidth, 'x', img.naturalHeight);
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      console.error('Failed to load image:', imageUrl);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Get mouse position as percentage of the image wrapper
  const getMousePct = useCallback((e) => {
    if (!containerRef.current || displaySize.width === 0) return { x: 0, y: 0 };
    
    const wrapper = containerRef.current.querySelector('.bbox-image-wrapper');
    if (!wrapper) return { x: 0, y: 0 };
    
    const rect = wrapper.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { 
      x: Math.max(0, Math.min(100, x)), 
      y: Math.max(0, Math.min(100, y)) 
    };
  }, [displaySize]);

  const handleMouseDown = (e) => {
    if (readOnly) return;
    
    const isValidTarget = e.target.classList.contains('bbox-image') || 
                          e.target.classList.contains('bbox-image-wrapper') ||
                          e.target.classList.contains('bbox-overlay');
    if (!isValidTarget) return;
    
    const pos = getMousePct(e);
    
    if (mode === 'draw') {
      setIsDrawing(true);
      setDrawStart(pos);
      setCurrentDraw({ x: pos.x, y: pos.y, width: 0, height: 0 });
      setSelectedBox(null);
    } else {
      setSelectedBox(null);
    }
  };

  const handleMouseMove = (e) => {
    if (readOnly) return;
    const pos = getMousePct(e);

    if (isDrawing && drawStart) {
      setCurrentDraw({
        x: Math.min(drawStart.x, pos.x),
        y: Math.min(drawStart.y, pos.y),
        width: Math.abs(pos.x - drawStart.x),
        height: Math.abs(pos.y - drawStart.y)
      });
    } else if (dragMode && selectedBox && dragStart) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;

      setBoxes(prev => prev.map(box => {
        if (box.id !== selectedBox) return box;
        let newBox = { ...box };

        if (dragMode === 'move') {
          newBox.x = Math.max(0, Math.min(100 - box.width, dragStart.boxX + dx));
          newBox.y = Math.max(0, Math.min(100 - box.height, dragStart.boxY + dy));
        } else if (dragMode.startsWith('resize')) {
          const corner = dragMode.split('-')[1];
          
          if (corner.includes('e')) {
            newBox.width = Math.max(2, Math.min(100 - box.x, dragStart.boxW + dx));
          }
          if (corner.includes('w')) {
            const newX = dragStart.boxX + dx;
            const newW = dragStart.boxW - dx;
            if (newW > 2 && newX >= 0) {
              newBox.x = newX;
              newBox.width = newW;
            }
          }
          if (corner.includes('s')) {
            newBox.height = Math.max(2, Math.min(100 - box.y, dragStart.boxH + dy));
          }
          if (corner.includes('n')) {
            const newY = dragStart.boxY + dy;
            const newH = dragStart.boxH - dy;
            if (newH > 2 && newY >= 0) {
              newBox.y = newY;
              newBox.height = newH;
            }
          }
        }
        return newBox;
      }));
    }
  };

  const handleMouseUp = () => {
    if (readOnly) return;

    if (isDrawing && currentDraw && currentDraw.width > 2 && currentDraw.height > 2) {
      const newBox = {
        id: `box-${Date.now()}`,
        ...currentDraw,
        label: 'Thread Roll',
        isAiDetected: false
      };
      setBoxes(prev => [...prev, newBox]);
      setSelectedBox(newBox.id);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDraw(null);
    setDragMode(null);
    setDragStart(null);
    if (mode === 'draw') setMode('select');
  };

  const handleBoxMouseDown = (e, boxId, dragType = 'move') => {
    if (readOnly) return;
    e.stopPropagation();
    const pos = getMousePct(e);
    const box = boxes.find(b => b.id === boxId);
    
    setSelectedBox(boxId);
    setDragMode(dragType);
    setDragStart({
      x: pos.x,
      y: pos.y,
      boxX: box.x,
      boxY: box.y,
      boxW: box.width,
      boxH: box.height
    });
  };

  const deleteSelectedBox = () => {
    if (selectedBox) {
      setBoxes(prev => prev.filter(b => b.id !== selectedBox));
      setSelectedBox(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBox && !readOnly) {
          e.preventDefault();
          deleteSelectedBox();
        }
      } else if (e.key === 'Escape') {
        setSelectedBox(null);
        setMode('select');
        setIsDrawing(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBox, readOnly]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const correctedBoxes = boxes.map(b => ({
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
        label: b.label,
        color: b.color
      }));

      await api.saveCorrections(entryId, correctedBoxes);
      
      if (onSave) {
        onSave(correctedBoxes);
      }
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
    setSaving(false);
  };

  const renderResizeHandles = (box) => {
    if (box.id !== selectedBox || readOnly) return null;
    
    const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    const positions = {
      nw: { left: 0, top: 0 },
      n: { left: '50%', top: 0, transform: 'translateX(-50%)' },
      ne: { right: 0, top: 0 },
      e: { right: 0, top: '50%', transform: 'translateY(-50%)' },
      se: { right: 0, bottom: 0 },
      s: { left: '50%', bottom: 0, transform: 'translateX(-50%)' },
      sw: { left: 0, bottom: 0 },
      w: { left: 0, top: '50%', transform: 'translateY(-50%)' }
    };
    const cursors = {
      nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
      se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize'
    };

    return handles.map(h => (
      <div
        key={h}
        className="bbox-handle"
        style={{ ...positions[h], cursor: cursors[h] }}
        onMouseDown={(e) => handleBoxMouseDown(e, box.id, `resize-${h}`)}
      />
    ));
  };

  const wrapperStyle = displaySize.width > 0 ? {
    width: `${displaySize.width}px`,
    height: `${displaySize.height}px`,
    position: 'relative',
    flexShrink: 0
  } : { display: 'none' };

  return (
    <div className="bbox-editor-overlay" onClick={onClose}>
      <div className="bbox-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="bbox-editor-header">
          <h3>🎯 Edit Bounding Boxes</h3>
          <div className="bbox-editor-tools">
            <button
              className={`btn btn-sm ${mode === 'select' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('select')}
            >
              ↖️ Select
            </button>
            <button
              className={`btn btn-sm ${mode === 'draw' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('draw')}
            >
              ✏️ Draw
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={deleteSelectedBox}
              disabled={!selectedBox}
            >
              🗑️ Delete
            </button>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="bbox-editor-body">
          <div className="bbox-editor-info">
            <span>📦 {boxes.length} boxes</span>
            <span className="bbox-mode-indicator">
              Mode: {mode === 'draw' ? '✏️ Drawing' : '↖️ Select'}
            </span>
          </div>

          <div
            ref={containerRef}
            className={`bbox-container ${mode === 'draw' ? 'drawing-mode' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {displaySize.width === 0 && (
              <div className="loading-container">
                <div className="spinner"></div>
                <span>Loading image...</span>
              </div>
            )}
            
            <div className="bbox-image-wrapper" style={wrapperStyle}>
              {/* Background image */}
              <img
                src={imageUrl}
                alt="Thread rolls"
                className="bbox-image"
                draggable={false}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill'
                }}
              />
              
              {/* Overlay for drawing - captures mouse events */}
              <div 
                className="bbox-overlay"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 1
                }}
              />

              {/* Render boxes */}
              {boxes.map((box, index) => (
                <div
                  key={box.id}
                  className={`bbox ${box.id === selectedBox ? 'selected' : ''} ${box.isAiDetected ? 'ai-detected' : 'user-added'}`}
                  style={{
                    position: 'absolute',
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                    zIndex: 2
                  }}
                  onMouseDown={(e) => handleBoxMouseDown(e, box.id, 'move')}
                >
                  <span className="bbox-label">{index + 1}</span>
                  {renderResizeHandles(box)}
                </div>
              ))}

              {/* Current drawing */}
              {isDrawing && currentDraw && (
                <div
                  className="bbox drawing"
                  style={{
                    position: 'absolute',
                    left: `${currentDraw.x}%`,
                    top: `${currentDraw.y}%`,
                    width: `${currentDraw.width}%`,
                    height: `${currentDraw.height}%`,
                    zIndex: 3
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div className="bbox-editor-footer">
          <div className="bbox-legend">
            <span><span className="legend-dot ai"></span> AI Detected</span>
            <span><span className="legend-dot user"></span> User Added</span>
          </div>
          <div className="bbox-actions">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '⏳ Saving...' : '💾 Save Corrections'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BBoxEditor;
