import React, { useState, useRef, useEffect } from 'react';
import { Check, X, RotateCcw, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { Button } from './Button';

export interface SnippingRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SnippingToolProps {
  imageUrl: string;
  onConfirmSnip: (region: SnippingRegion) => void;
  onCancel: () => void;
  className?: string;
}

export const SnippingTool: React.FC<SnippingToolProps> = ({
  imageUrl,
  onConfirmSnip,
  onCancel,
  className = '',
}) => {
  const [zoom, setZoom] = useState(1.0);
  const [currentBox, setCurrentBox] = useState<SnippingRegion | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left)) / zoom;
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top)) / zoom;
    return { x, y };
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    startPointRef.current = { x, y };
    setCurrentBox({ x, y, w: 0, h: 0 });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPointRef.current) return;
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    const originX = Math.min(startPointRef.current.x, x);
    const originY = Math.min(startPointRef.current.y, y);
    const w = Math.abs(x - startPointRef.current.x);
    const h = Math.abs(y - startPointRef.current.y);
    setCurrentBox({ x: originX, y: originY, w, h });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    startPointRef.current = null;
  };

  // Touch Handlers (Touch UX & Stylus support)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
    startPointRef.current = { x, y };
    setCurrentBox({ x, y, w: 0, h: 0 });
    setIsDrawing(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing || !startPointRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
    const originX = Math.min(startPointRef.current.x, x);
    const originY = Math.min(startPointRef.current.y, y);
    const w = Math.abs(x - startPointRef.current.x);
    const h = Math.abs(y - startPointRef.current.y);
    setCurrentBox({ x: originX, y: originY, w, h });
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
    startPointRef.current = null;
  };

  return (
    <div
      className={`border border-classic-border rounded-card bg-slate-900 shadow-classic flex flex-col overflow-hidden ${className}`}
    >
      {/* Top Toolbar */}
      <div className="bg-[#0B1F3A] text-white px-4 py-2 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold">Snipping Canvas</span>
          <span className="text-slate-300 hidden sm:inline">
            Drag to select region &bull; Mouse, Touch & Stylus supported
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-slate-300">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.2))}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setCurrentBox(null)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-slate-300 hover:text-white"
            title="Clear Selection"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Snipping Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative select-none bg-slate-950 min-h-[420px]"
      >
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="relative inline-block bg-white shadow-2xl cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Snipping document page"
            className="max-w-none block select-none pointer-events-none"
            draggable={false}
          />

          {/* Active Snipping Box with visible dimension badges */}
          {currentBox && currentBox.w > 4 && currentBox.h > 4 && (
            <div
              style={{
                left: `${currentBox.x}px`,
                top: `${currentBox.y}px`,
                width: `${currentBox.w}px`,
                height: `${currentBox.h}px`,
              }}
              className="absolute border-2 border-blue-500 bg-blue-500/25 pointer-events-none ring-2 ring-white/50"
            >
              <div className="absolute -top-6 left-0 bg-[#0B1F3A] text-white text-[10px] font-mono px-1.5 py-0.5 rounded font-bold whitespace-nowrap shadow-md border border-slate-700">
                {Math.round(currentBox.w)} × {Math.round(currentBox.h)} px
              </div>

              {/* Touch resize corner indicators */}
              <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-600 rounded-full" />
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-600 rounded-full" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-blue-600 rounded-full" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-blue-600 rounded-full" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Action Controls */}
      <div className="bg-white px-4 py-3 border-t border-classic-border flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-classic-text-secondary">
          {currentBox && currentBox.w > 8 && currentBox.h > 8 ? (
            <span className="font-semibold text-classic-text-primary">
              Selection: {Math.round(currentBox.w)} × {Math.round(currentBox.h)} px
            </span>
          ) : (
            <span>Draw a rectangle around the mathematical expression to extract</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            icon={X}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!currentBox || currentBox.w < 10 || currentBox.h < 10}
            onClick={() => currentBox && onConfirmSnip(currentBox)}
            icon={Check}
          >
            Extract Snippet
          </Button>
        </div>
      </div>
    </div>
  );
};
