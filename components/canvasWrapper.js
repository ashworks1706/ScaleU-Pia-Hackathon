/* eslint-disable react/display-name */
import { forwardRef, useImperativeHandle, useEffect, useState, useRef } from "react";

const CanvasWrapper = forwardRef(({ initialData, onChange, onReady }, ref) => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(5);
  const recordedDrawActions = useRef([]);
  const canvasStreamRef = useRef(null);
  
  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    // Set canvas dimensions to match displayed size but with higher resolution
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    
    const context = canvas.getContext("2d");
    context.scale(2, 2); // For high DPI displays
    context.lineCap = "round";
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;
    
    // Set background color
    context.fillStyle = "#1e1e1e";
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Initialize canvas stream for recording (will be used by MediaRecorder)
    try {
      if (typeof window !== 'undefined' && canvas.captureStream) {
        canvasStreamRef.current = canvas.captureStream(30);
        console.log("Canvas stream created successfully");
      }
    } catch (error) {
      console.error("Error creating canvas stream:", error);
    }
    
    // Load initial data if provided
    if (initialData && Array.isArray(initialData)) {
      replayDrawActions(initialData);
    }
    
    setIsInitialized(true);
    if (onReady) onReady();
    
    // Cleanup on unmount
    return () => {
      if (canvasStreamRef.current) {
        const tracks = canvasStreamRef.current.getTracks();
        if (tracks && tracks.length) {
          tracks.forEach(track => track.stop());
        }
        canvasStreamRef.current = null;
      }
    };
  }, []);
  
  // Apply initial data when it changes
  useEffect(() => {
    if (isInitialized && initialData && Array.isArray(initialData) && contextRef.current) {
      replayDrawActions(initialData);
    }
  }, [initialData, isInitialized]);
  
  // Handle drawing actions
  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    
    // Record start action
    recordAction('start', { x: offsetX, y: offsetY, color, brushSize });
  };
  
  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
    
    // Record draw action
    recordAction('draw', { x: offsetX, y: offsetY });
  };
  
  const stopDrawing = () => {
    if (!isDrawing) return;
    
    contextRef.current.closePath();
    setIsDrawing(false);
    
    // Record stop action
    recordAction('stop');
    
    // Notify parent of changes
    if (onChange) {
      onChange(recordedDrawActions.current);
    }
  };
  
  const recordAction = (type, data = {}) => {
    const action = {
      type,
      timestamp: Date.now(),
      ...data
    };
    recordedDrawActions.current.push(action);
  };
  
  const replayDrawActions = (actions) => {
    const ctx = contextRef.current;
    if (!ctx || !actions || actions.length === 0) return;
    
    // Reset canvas
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    let currentColor = "#ffffff";
    let currentSize = 5;
    
    actions.forEach(action => {
      if (action.type === 'start') {
        currentColor = action.color || currentColor;
        currentSize = action.brushSize || currentSize;
        
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentSize;
        ctx.beginPath();
        ctx.moveTo(action.x, action.y);
      } else if (action.type === 'draw') {
        ctx.lineTo(action.x, action.y);
        ctx.stroke();
      } else if (action.type === 'stop') {
        ctx.closePath();
      } else if (action.type === 'clear') {
        ctx.fillStyle = "#1e1e1e";
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    });
  };
  
  const clearCanvas = () => {
    const ctx = contextRef.current;
    if (!ctx) return;
    
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    recordedDrawActions.current = [];
    recordAction('clear');
    
    if (onChange) {
      onChange(recordedDrawActions.current);
    }
  };
  
  // Handle touch events for mobile
  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;
    
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
    
    recordAction('start', { x: offsetX, y: offsetY, color, brushSize });
  };
  
  const handleTouchMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;
    
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
    
    recordAction('draw', { x: offsetX, y: offsetY });
  };
  
  // Refresh or create a new canvas stream - useful for recovery or after resize
  const refreshCanvasStream = () => {
    if (!canvasRef.current || typeof window === 'undefined') return null;
    
    try {
      // Stop any existing stream tracks
      if (canvasStreamRef.current) {
        const tracks = canvasStreamRef.current.getTracks();
        if (tracks && tracks.length) {
          tracks.forEach(track => track.stop());
        }
      }
      
      // Create a new stream if the browser supports it
      if (canvasRef.current.captureStream) {
        canvasStreamRef.current = canvasRef.current.captureStream(30);
        return canvasStreamRef.current;
      }
    } catch (error) {
      console.error("Failed to refresh canvas stream:", error);
    }
    
    return null;
  };
  
  // Expose methods to parent through ref
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getCanvasStream: () => {
      // Return existing stream or create a new one
      return canvasStreamRef.current || refreshCanvasStream();
    },
    isReady: () => isInitialized,
    getDrawActions: () => recordedDrawActions.current,
    clearCanvas,
    setColor,
    setBrushSize,
    replayDrawActions,
    refreshCanvasStream,
    destroy: () => {
      // Cleanup resources
      if (canvasStreamRef.current) {
        const tracks = canvasStreamRef.current.getTracks();
        if (tracks && tracks.length) {
          tracks.forEach(track => track.stop());
        }
        canvasStreamRef.current = null;
      }
      recordedDrawActions.current = [];
    }
  }), [clearCanvas, isInitialized]);

  return (
    <div className="w-full h-full" style={{ height: '600px', position: 'relative' }}>
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30 z-10">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-300">Initializing whiteboard...</p>
          </div>
        </div>
      )}
      <div className="flex flex-col h-full">
        <div className="tools flex gap-2 p-2 bg-gray-800">
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
            className="w-8 h-8 rounded cursor-pointer"
          />
          <input 
            type="range" 
            min="1" 
            max="20" 
            value={brushSize} 
            onChange={(e) => setBrushSize(parseInt(e.target.value))} 
            className="w-32"
          />
          <button 
            onClick={clearCanvas}
            className="px-2 py-1 bg-red-600 text-white rounded text-sm"
          >
            Clear
          </button>
        </div>
        <div className="flex-1 relative bg-gray-900">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={stopDrawing}
            className="absolute inset-0 cursor-crosshair w-full h-full"
            style={{ touchAction: 'none' }}
          />
        </div>
      </div>
    </div>
  );
});

export default CanvasWrapper;
