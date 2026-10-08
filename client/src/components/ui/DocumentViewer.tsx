import React, { useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Crop,
  Scissors,
  Move,
  RotateCcw,
} from 'lucide-react';

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  type?: 'FORMULA' | 'QUESTION' | 'DIAGRAM' | 'TEXT';
  isSelected?: boolean;
}

export interface DocumentViewerProps {
  imageUrl: string;
  boundingBoxes?: BoundingBox[];
  onSelectBox?: (box: BoundingBox) => void;
  onSnipRegion?: (region: { x: number; y: number; width: number; height: number }) => void;
  className?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  imageUrl,
  boundingBoxes = [],
  onSelectBox,
  className = '',
}) => {
  const [zoom, setZoom] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const zoomLevels = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const handleZoomIn = () => {
    const next = zoomLevels.find((z) => z > zoom) || 2.0;
    setZoom(next);
  };

  const handleZoomOut = () => {
    const prev = [...zoomLevels].reverse().find((z) => z < zoom) || 0.25;
    setZoom(prev);
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleFitWidth = () => {
    setZoom(1.0);
  };

  const handleFitPage = () => {
    setZoom(0.75);
  };

  return (
    <div
      className={`border border-classic-border rounded-card bg-slate-900 shadow-classic flex flex-col overflow-hidden h-full ${className}`}
    >
      {/* Viewer Toolbar */}
      <div className="bg-[#0B1F3A] text-white px-3 sm:px-4 py-2 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Zoom & Fit Controls */}
        <div className="flex items-center space-x-1 sm:space-x-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-white"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Quick Zoom Preset Dropdown */}
          <select
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="bg-slate-800 text-white border border-slate-600 rounded px-2 py-1 text-xs font-mono font-semibold focus:outline-none"
            title="Select Zoom Percentage"
          >
            {zoomLevels.map((z) => (
              <option key={z} value={z}>
                {Math.round(z * 100)}%
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-white"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

          <button
            type="button"
            onClick={handleFitWidth}
            className="hidden sm:inline-block px-2 py-1 hover:bg-white/10 rounded font-semibold text-[11px]"
            title="Fit Width"
          >
            Fit Width
          </button>

          <button
            type="button"
            onClick={handleFitPage}
            className="hidden sm:inline-block px-2 py-1 hover:bg-white/10 rounded font-semibold text-[11px]"
            title="Fit Page"
          >
            Fit Page
          </button>

          <button
            type="button"
            onClick={() => setZoom(1.0)}
            className="hidden sm:inline-block px-2 py-1 hover:bg-white/10 rounded font-semibold text-[11px]"
            title="Actual Size (100%)"
          >
            100%
          </button>
        </div>

        {/* Rotation & View Options */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            type="button"
            onClick={handleRotate}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-white flex items-center space-x-1"
            title="Rotate 90° Clockwise"
          >
            <RotateCw className="w-4 h-4" />
            <span className="hidden md:inline text-[11px] font-semibold">Rotate</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setZoom(1.0);
              setRotation(0);
            }}
            className="p-1.5 hover:bg-white/10 rounded transition-colors text-white"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center relative select-none bg-slate-950 min-h-[420px]"
      >
        {imageUrl ? (
          <div
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 120ms ease-out',
            }}
            className="relative inline-block shadow-2xl bg-white"
          >
            <img
              src={imageUrl}
              alt="Original Document Page"
              className="max-w-none block"
              draggable={false}
            />

            {/* Bounding Box Overlays */}
            {boundingBoxes.map((box) => (
              <div
                key={box.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBox?.(box);
                }}
                style={{
                  left: `${box.x}px`,
                  top: `${box.y}px`,
                  width: `${box.width}px`,
                  height: `${box.height}px`,
                }}
                className={`absolute cursor-pointer border-2 transition-all ${
                  box.isSelected
                    ? 'border-blue-500 bg-blue-500/20 ring-2 ring-blue-400 z-20'
                    : 'border-amber-400 bg-amber-400/10 hover:border-amber-300 hover:bg-amber-400/20 z-10'
                }`}
              >
                {box.label && (
                  <span className="absolute -top-5 left-0 bg-[#0B1F3A] text-white text-[10px] font-mono px-1.5 py-0.2 rounded font-bold whitespace-nowrap shadow-sm">
                    {box.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-slate-400 text-sm py-16 space-y-2">
            <p>No document page selected or image unavailable</p>
          </div>
        )}
      </div>
    </div>
  );
};
