/* eslint-disable react/display-name */
import { Excalidraw } from "@excalidraw/excalidraw";
import { forwardRef, useImperativeHandle, useEffect } from "react";
import "@excalidraw/excalidraw/index.css";
import { useRef } from "react";

const ExcalidrawWrapper = forwardRef(({ initialData, onChange }, ref) => {
  const excalidrawRef = useRef(null);

  // Add initial data load
  useEffect(() => {
    if (initialData && excalidrawRef.current) {
      excalidrawRef.current.updateScene(initialData);
    }
  }, [initialData]);

  useImperativeHandle(ref, () => ({
    getCanvas: () => excalidrawRef.current?.getCanvas(),
    exportDrawing: () => excalidrawRef.current?.getSceneElements(),
    getExcalidrawAPI: () => excalidrawRef.current
  }));

  return (
    <div className="w-full h-full" style={{ height: '600px' }}> {/* Add fixed height */}
      <Excalidraw
        ref={excalidrawRef}
        initialData={initialData}
        onChange={onChange}
        theme="dark"  // Force dark theme
      />
    </div>
  );
});
export default ExcalidrawWrapper
