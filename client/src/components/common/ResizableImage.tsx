import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Maximize2,
  Move,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Columns,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export interface ResizableImageProps {
  src: string;
  alt?: string;
  initialWidth?: number;
  initialHeight?: number;
  initialOffsetX?: number;
  initialOffsetY?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  alignment?: 'left' | 'center' | 'right' | 'inline';
  borderStyle?: 'none' | 'thin' | 'dark' | 'glass';
  className?: string;
  onRemove?: () => void;
  onResize?: (width: number, height: number) => void;
  onResizeEnd?: (width: number, height: number) => void;
  onMove?: (alignment: 'left' | 'center' | 'right' | 'inline', offsetX: number, offsetY: number) => void;
  onMoveEnd?: (alignment: 'left' | 'center' | 'right' | 'inline', offsetX: number, offsetY: number) => void;
  removable?: boolean;
  movable?: boolean;
  disabled?: boolean;
}

export const ResizableImage: React.FC<ResizableImageProps> = ({
  src,
  alt = 'Attached diagram',
  initialWidth,
  initialHeight,
  initialOffsetX = 0,
  initialOffsetY = 0,
  minWidth = 40,
  minHeight = 30,
  maxWidth = 700,
  maxHeight = 500,
  alignment = 'inline',
  borderStyle = 'glass',
  className = '',
  onRemove,
  onResize,
  onResizeEnd,
  onMove,
  onMoveEnd,
  removable = false,
  movable = true,
  disabled = false,
}) => {
  const [height, setHeight] = useState<number>(initialHeight || 75);
  const [width, setWidth] = useState<number | undefined>(initialWidth);
  const [currentAlignment, setCurrentAlignment] = useState<'left' | 'center' | 'right' | 'inline'>(alignment || 'inline');
  const [offsetX, setOffsetX] = useState<number>(initialOffsetX || 0);
  const [offsetY, setOffsetY] = useState<number>(initialOffsetY || 0);

  const [isResizing, setIsResizing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragResizeStartRef = useRef<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });
  const dragMoveStartRef = useRef<{ startX: number; startY: number; initOffX: number; initOffY: number }>({
    startX: 0,
    startY: 0,
    initOffX: 0,
    initOffY: 0,
  });
  const currentSizeRef = useRef<{ w?: number; h: number }>({ w: initialWidth, h: initialHeight || 75 });
  const currentPosRef = useRef<{ align: 'left' | 'center' | 'right' | 'inline'; offX: number; offY: number }>({
    align: alignment || 'inline',
    offX: initialOffsetX || 0,
    offY: initialOffsetY || 0,
  });

  useEffect(() => {
    if (initialHeight) {
      setHeight(initialHeight);
      currentSizeRef.current.h = initialHeight;
    }
    if (initialWidth) {
      setWidth(initialWidth);
      currentSizeRef.current.w = initialWidth;
    }
  }, [initialWidth, initialHeight]);

  useEffect(() => {
    if (alignment) {
      setCurrentAlignment(alignment);
      currentPosRef.current.align = alignment;
    }
  }, [alignment]);

  useEffect(() => {
    if (initialOffsetX !== undefined) {
      setOffsetX(initialOffsetX);
      currentPosRef.current.offX = initialOffsetX;
    }
    if (initialOffsetY !== undefined) {
      setOffsetY(initialOffsetY);
      currentPosRef.current.offY = initialOffsetY;
    }
  }, [initialOffsetX, initialOffsetY]);

  const [isSelected, setIsSelected] = useState(false);
  const isDragOccurredRef = useRef(false);

  // Resize Mouse Down
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const rect = containerRef.current?.getBoundingClientRect();
    dragResizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: rect?.width || width || 100,
      h: rect?.height || height || 75,
    };
  };

  // Move Mouse Down (Can be triggered anywhere on diagram container or handle)
  const handleMoveMouseDown = (e: React.MouseEvent) => {
    if (disabled || !movable) return;
    // Don't drag if clicking buttons inside the toolbar
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsSelected(true);
    setIsMoving(true);
    isDragOccurredRef.current = false;
    dragMoveStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initOffX: offsetX,
      initOffY: offsetY,
    };
  };

  const handleSetAlignment = (newAlign: 'left' | 'center' | 'right' | 'inline') => {
    setCurrentAlignment(newAlign);
    setOffsetX(0);
    currentPosRef.current = { align: newAlign, offX: 0, offY: offsetY };
    if (onMove) onMove(newAlign, 0, offsetY);
    if (onMoveEnd) onMoveEnd(newAlign, 0, offsetY);
  };

  const handleNudgeY = (delta: number) => {
    const newY = Math.max(0, Math.min(250, offsetY + delta));
    setOffsetY(newY);
    currentPosRef.current.offY = newY;
    if (onMove) onMove(currentAlignment, 0, newY);
    if (onMoveEnd) onMoveEnd(currentAlignment, 0, newY);
  };

  // Keyboard Arrow Key Movement on Selected Diagram
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || !movable) return;
    let handled = false;

    if (e.key === 'ArrowLeft') {
      if (currentAlignment === 'right') handleSetAlignment('center');
      else if (currentAlignment === 'center') handleSetAlignment('left');
      handled = true;
    } else if (e.key === 'ArrowRight') {
      if (currentAlignment === 'left') handleSetAlignment('center');
      else if (currentAlignment === 'center') handleSetAlignment('right');
      handled = true;
    } else if (e.key === 'ArrowUp') {
      handleNudgeY(-6);
      handled = true;
    } else if (e.key === 'ArrowDown') {
      handleNudgeY(6);
      handled = true;
    } else if (e.key === '+' || e.key === '=') {
      handleStepResize(15);
      handled = true;
    } else if (e.key === '-' || e.key === '_') {
      handleStepResize(-15);
      handled = true;
    } else if (e.key.toLowerCase() === 'r') {
      handleSetAlignment('right');
      handled = true;
    } else if (e.key.toLowerCase() === 'l') {
      handleSetAlignment('left');
      handled = true;
    } else if (e.key.toLowerCase() === 'c') {
      handleSetAlignment('center');
      handled = true;
    } else if (e.key.toLowerCase() === 'i') {
      handleSetAlignment('inline');
      handled = true;
    } else if (e.key === 'Escape') {
      setIsSelected(false);
      handled = true;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const deltaX = e.clientX - dragResizeStartRef.current.x;
        const deltaY = e.clientY - dragResizeStartRef.current.y;
        const parentW = containerRef.current?.parentElement?.clientWidth || 700;
        const effectiveMaxW = Math.max(minWidth, Math.min(maxWidth, parentW - 8));
        const newW = Math.max(minWidth, Math.min(effectiveMaxW, dragResizeStartRef.current.w + deltaX));
        const newH = Math.max(minHeight, Math.min(maxHeight, dragResizeStartRef.current.h + deltaY));

        setWidth(Math.round(newW));
        setHeight(Math.round(newH));
        currentSizeRef.current = { w: Math.round(newW), h: Math.round(newH) };

        if (onResize) {
          onResize(Math.round(newW), Math.round(newH));
        }
      } else if (isMoving) {
        const deltaX = e.clientX - dragMoveStartRef.current.startX;
        const deltaY = e.clientY - dragMoveStartRef.current.startY;
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
          isDragOccurredRef.current = true;
        }

        // Detect enclosing stem container to calculate horizontal position relative to question
        const stemContainer =
          containerRef.current?.closest('.flow-root') ||
          containerRef.current?.closest('.avoid-break') ||
          containerRef.current?.parentElement?.parentElement ||
          containerRef.current?.parentElement;

        let newAlign = currentAlignment;
        if (stemContainer) {
          const rect = stemContainer.getBoundingClientRect();
          const ratioX = (e.clientX - rect.left) / Math.max(1, rect.width);
          if (ratioX < 0.38) {
            newAlign = 'left';
          } else if (ratioX > 0.62) {
            newAlign = 'right';
          } else if (Math.abs(deltaX) > 25) {
            newAlign = 'center';
          }
        } else {
          if (deltaX < -50) newAlign = 'left';
          else if (deltaX > 50) newAlign = 'right';
        }

        const newOffsetY = Math.max(0, Math.min(250, Math.round(dragMoveStartRef.current.initOffY + deltaY)));

        if (newAlign !== currentPosRef.current.align || newOffsetY !== currentPosRef.current.offY) {
          setCurrentAlignment(newAlign);
          setOffsetY(newOffsetY);
          currentPosRef.current.align = newAlign;
          currentPosRef.current.offY = newOffsetY;
          currentPosRef.current.offX = 0;

          if (onMove) {
            onMove(newAlign, 0, newOffsetY);
          }
        }
      }
    };

    const handleWindowMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        if (onResizeEnd) {
          onResizeEnd(currentSizeRef.current.w || 0, currentSizeRef.current.h);
        }
      }
      if (isMoving) {
        setIsMoving(false);
        if (onMoveEnd) {
          onMoveEnd(currentPosRef.current.align, 0, currentPosRef.current.offY);
        }
      }
    };

    if (isResizing || isMoving) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isResizing, isMoving, minWidth, minHeight, maxWidth, maxHeight, currentAlignment, offsetY, onResize, onResizeEnd, onMove, onMoveEnd]);

  // Alignment classes
  const alignmentClass =
    currentAlignment === 'center'
      ? 'mx-auto block'
      : currentAlignment === 'right'
      ? 'ml-auto block'
      : currentAlignment === 'left'
      ? 'mr-auto block'
      : 'inline-block';

  // Border styles
  const borderClass =
    borderStyle === 'none'
      ? 'bg-transparent'
      : borderStyle === 'thin'
      ? 'border border-slate-300 bg-white/5'
      : borderStyle === 'dark'
      ? 'border-2 border-slate-900 bg-white/5'
      : 'bg-slate-950 border border-slate-700/80 shadow-md hover:border-indigo-500/60';

  const handleStepResize = (delta: number) => {
    const newH = Math.max(minHeight, Math.min(maxHeight, height + delta));
    const currentW = width || (containerRef.current ? containerRef.current.offsetWidth : 100);
    const newW = Math.max(minWidth, Math.min(maxWidth, currentW + Math.round(delta * 1.3)));
    setHeight(newH);
    setWidth(newW);
    currentSizeRef.current = { w: newW, h: newH };
    if (onResize) onResize(newW, newH);
    if (onResizeEnd) onResizeEnd(newW, newH);
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsSelected(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsSelected(false);
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMoveMouseDown}
      style={{
        width: width ? `${width}px` : 'auto',
        height: `${height}px`,
        maxWidth: '100%',
        boxSizing: 'border-box',
        cursor: movable && !disabled ? (isMoving ? 'grabbing' : 'grab') : 'default',
      }}
      className={`relative group rounded-lg p-0.5 transition-all select-none outline-none ${alignmentClass} ${borderClass} ${
        isSelected
          ? 'ring-2 ring-indigo-500 shadow-xl z-20'
          : !disabled
          ? 'hover:ring-2 hover:ring-indigo-400/80 hover:shadow-lg'
          : ''
      } ${className}`}
    >
      {/* Live Dragging Indicator Badge with text reflow indication */}
      {isMoving && (
        <div className="absolute inset-0 bg-indigo-950/80 backdrop-blur-[2px] rounded border-2 border-dashed border-indigo-400 flex flex-col items-center justify-center p-1.5 z-40 pointer-events-none text-white text-xs font-semibold shadow-2xl">
          <div className="flex items-center gap-1.5 bg-indigo-600 px-2.5 py-1 rounded-full shadow text-[11px] font-bold">
            {currentAlignment === 'left' && <span>⇦ Float Left · Text on Right</span>}
            {currentAlignment === 'right' && <span>Float Right · Text on Left ⇨</span>}
            {currentAlignment === 'center' && <span>⬌ Centered · Full Width</span>}
            {currentAlignment === 'inline' && <span>Inline with Text</span>}
          </div>
          {offsetY > 0 && (
            <span className="text-[10px] text-indigo-200 mt-1 font-mono bg-black/40 px-1.5 py-0.5 rounded">
              Top Space: +{offsetY}px
            </span>
          )}
        </div>
      )}

      {/* Image Element */}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-contain rounded block select-none pointer-events-none"
        draggable={false}
      />

      {/* Hover Floating Controls Bar (Hidden during print) */}
      {!disabled && (isHovered || isResizing || isMoving) && (
        <div className="absolute top-1 right-1 flex items-center space-x-1 bg-slate-900/95 text-white backdrop-blur-md px-1.5 py-1 rounded-lg border border-slate-700 shadow-2xl z-30 animate-fade-in no-print">
          {/* Drag to Move Location Handle */}
          {movable && (
            <button
              type="button"
              onMouseDown={handleMoveMouseDown}
              className={`p-1 rounded cursor-grab active:cursor-grabbing transition-colors ${
                isMoving ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : 'text-indigo-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Click & Drag across question to move diagram and reflow text"
            >
              <Move className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="w-[1px] h-3.5 bg-slate-700" />

          {/* Quick Location / Alignment Toggles */}
          {movable && (
            <div className="flex items-center space-x-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetAlignment('left');
                }}
                className={`p-1 rounded transition-colors ${
                  currentAlignment === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Move Left (Text wraps on right)"
              >
                <AlignLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetAlignment('center');
                }}
                className={`p-1 rounded transition-colors ${
                  currentAlignment === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Center (Text above & below)"
              >
                <AlignCenter className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetAlignment('right');
                }}
                className={`p-1 rounded transition-colors ${
                  currentAlignment === 'right' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Move Right (Text wraps on left)"
              >
                <AlignRight className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetAlignment('inline');
                }}
                className={`p-1 rounded transition-colors ${
                  currentAlignment === 'inline' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Inline / Beside Text"
              >
                <Columns className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Vertical Position Nudge (Up / Down) */}
          {movable && (
            <>
              <div className="w-[1px] h-3.5 bg-slate-700" />
              <div className="flex items-center space-x-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNudgeY(-8);
                  }}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                  title="Move diagram up (less top space)"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNudgeY(8);
                  }}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                  title="Move diagram down (text flows above)"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            </>
          )}

          <div className="w-[1px] h-3.5 bg-slate-700" />

          {/* Increase Size (+) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStepResize(18);
            }}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
            title="Increase diagram size (+)"
          >
            <ZoomIn className="w-3 h-3" />
          </button>

          {/* Decrease Size (-) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStepResize(-18);
            }}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
            title="Decrease diagram size (-)"
          >
            <ZoomOut className="w-3 h-3" />
          </button>

          {/* Reset Size & Location */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const defH = initialHeight || 75;
              setHeight(defH);
              setWidth(initialWidth);
              setOffsetX(0);
              setOffsetY(0);
              currentSizeRef.current = { w: initialWidth, h: defH };
              currentPosRef.current = { align: alignment || 'right', offX: 0, offY: 0 };
              if (onResizeEnd) onResizeEnd(initialWidth || 0, defH);
              if (onMoveEnd) onMoveEnd(alignment || 'right', 0, 0);
            }}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
            title="Reset default size & position"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          {/* Lightbox Expand */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            className="p-1 text-slate-300 hover:text-cyan-300 hover:bg-slate-800 rounded"
            title="View full screen"
          >
            <Maximize2 className="w-3 h-3" />
          </button>

          {/* Optional Remove Button */}
          {removable && onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 text-rose-400 hover:text-white hover:bg-rose-600 rounded transition-colors"
              title="Delete diagram from paper"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Interactive Bottom-Right Corner Resize Drag Handle (Hidden during print) */}
      {!disabled && (
        <div
          onMouseDown={handleResizeMouseDown}
          className={`absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize flex items-center justify-center rounded-br transition-colors z-20 no-print ${
            isResizing ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900/80 text-white hover:bg-indigo-600 shadow'
          }`}
          title="Drag corner with mouse to freely increase / decrease size"
        >
          <svg viewBox="0 0 6 6" className="w-2.5 h-2.5 fill-current">
            <circle cx="5" cy="5" r="0.8" />
            <circle cx="5" cy="3" r="0.8" />
            <circle cx="3" cy="5" r="0.8" />
            <circle cx="5" cy="1" r="0.8" />
            <circle cx="3" cy="3" r="0.8" />
            <circle cx="1" cy="5" r="0.8" />
          </svg>
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-fade-in no-print"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] bg-slate-900 rounded-2xl p-4 border border-slate-700 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200">{alt} (Full Resolution)</span>
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-center overflow-auto max-h-[75vh]">
              <img src={src} alt={alt} className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
