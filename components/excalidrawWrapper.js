/* eslint-disable react/display-name */
import { Excalidraw } from "@excalidraw/excalidraw";
import { forwardRef, useImperativeHandle, useEffect, useState } from "react";
import "@excalidraw/excalidraw/index.css";
import { useRef } from "react";

const ExcalidrawWrapper = forwardRef(({ initialData, onChange, onReady }, ref) => {
  const excalidrawRef = useRef(null);
  const canvasRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(true);

  useImperativeHandle(ref, () => ({
    getCanvas: () => {
      if (!canvasRef.current) {
        console.warn("Canvas requested but not yet initialized");
      }
      return canvasRef.current;
    },
    isReady: () => Boolean(canvasRef.current),
    exportDrawing: () => excalidrawRef.current?.getSceneElements(),
    getExcalidrawAPI: () => excalidrawRef.current,
    destroy: () => {
      if (excalidrawRef.current) {
        try {
          excalidrawRef.current.destroy?.();
        } catch (e) {
          console.warn("Error while destroying Excalidraw:", e);
        }
        canvasRef.current = null;
      }
    }
  }), []);

  return (
    <div className="w-full h-full" style={{ height: '600px' }}>
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/30 z-10">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-gray-300">Initializing whiteboard...</p>
          </div>
        </div>
      )}
      <Excalidraw
        ref={excalidrawRef}
        initialData={initialData}
        onChange={(elements, appState) => {
          onChange?.(elements, appState);
        }}
        theme="dark"
      />
    </div>
  );
});

export default ExcalidrawWrapper;
