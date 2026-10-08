import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Copy, Check, Edit3 } from 'lucide-react';
import { MathRenderer } from '../common/MathRenderer';

export interface FormulaViewerProps {
  latex: string;
  mathml?: string;
  onEdit?: () => void;
  showControls?: boolean;
  className?: string;
}

export const FormulaViewer: React.FC<FormulaViewerProps> = ({
  latex,
  mathml,
  onEdit,
  showControls = true,
  className = '',
}) => {
  const [scale, setScale] = useState(1.0);
  const [copiedType, setCopiedType] = useState<'latex' | 'mathml' | null>(null);

  const handleCopyLatex = async () => {
    try {
      await navigator.clipboard.writeText(latex);
      setCopiedType('latex');
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyMathMl = async () => {
    const textToCopy = mathml || `<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mtext>${latex}</mtext></mrow></math>`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedType('mathml');
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className={`border border-classic-border rounded-card bg-white shadow-classic overflow-hidden flex flex-col ${className}`}
    >
      {/* Top Toolbar */}
      {showControls && (
        <div className="bg-classic-surface-muted border-b border-classic-border-light px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.0, s + 0.15))}
              className="p-1 rounded text-classic-text-secondary hover:text-classic-text-primary hover:bg-slate-200 transition-colors"
              title="Zoom In Formula"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.7, s - 0.15))}
              className="p-1 rounded text-classic-text-secondary hover:text-classic-text-primary hover:bg-slate-200 transition-colors"
              title="Zoom Out Formula"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setScale(1.0)}
              className="p-1 rounded text-classic-text-secondary hover:text-classic-text-primary hover:bg-slate-200 transition-colors"
              title="Reset Zoom / Fit"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] text-classic-text-muted px-1">
              {Math.round(scale * 100)}%
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyLatex}
              className="flex items-center space-x-1 px-2 py-0.5 rounded border border-classic-border bg-white hover:bg-slate-50 text-[11px] font-semibold text-classic-text-secondary hover:text-classic-text-primary transition-colors"
              title="Copy LaTeX Expression"
            >
              {copiedType === 'latex' ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3 text-classic-navy" />
              )}
              <span>{copiedType === 'latex' ? 'Copied LaTeX' : 'Copy LaTeX'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyMathMl}
              className="flex items-center space-x-1 px-2 py-0.5 rounded border border-classic-border bg-white hover:bg-slate-50 text-[11px] font-semibold text-classic-text-secondary hover:text-classic-text-primary transition-colors"
              title="Copy MathML Expression"
            >
              {copiedType === 'mathml' ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3 text-classic-navy" />
              )}
              <span>{copiedType === 'mathml' ? 'Copied MathML' : 'Copy MathML'}</span>
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center space-x-1 px-2 py-0.5 rounded bg-classic-navy hover:bg-classic-navy-hover text-white text-[11px] font-semibold transition-colors shadow-classic"
                title="Edit in Formula Editor"
              >
                <Edit3 className="w-3 h-3 text-white" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Formula Canvas Area with Safe Horizontal Scrolling */}
      <div className="p-4 overflow-x-auto flex items-center justify-center min-h-[70px] bg-white">
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
          className="transition-transform duration-100 text-classic-text-primary"
        >
          <MathRenderer content={latex.startsWith('$') ? latex : `$${latex}$`} />
        </div>
      </div>
    </div>
  );
};
