/* eslint-disable react/display-name */
import { Excalidraw } from "@excalidraw/excalidraw";
import { forwardRef, useImperativeHandle, useEffect } from "react";
import "@excalidraw/excalidraw/index.css";
import { useRef } from "react";
const ExcalidrawWrapper = forwardRef(({ initialData, onChange }, ref) => {
  const excalidrawRef = useRef(null);
  const canvasRef = useRef(null);

  // Add canvas reference
  useEffect(() => {
    if (excalidrawRef.current) {
      canvasRef.current = excalidrawRef.current.getCanvas();
    }
  }, []);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    exportDrawing: () => excalidrawRef.current?.getSceneElements(),
    getExcalidrawAPI: () => excalidrawRef.current,
    destroy: () => {
      if (excalidrawRef.current) {
        excalidrawRef.current.destroy();
        canvasRef.current = null;
      }
    }
  }));

  return (
    <div className="w-full h-full" style={{ height: '600px' }}>
      <Excalidraw
        ref={excalidrawRef}
        initialData={initialData}
        onChange={(elements, appState) => {
          // Add debounce directly here
          onChange?.(elements, appState);
        }}
        theme="dark"
      />
    </div>
  );
});
