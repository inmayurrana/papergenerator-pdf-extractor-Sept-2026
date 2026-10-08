import React, { useState } from 'react';
import {
  Check,
  Edit3,
  RefreshCw,
  Crop,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { MathRenderer } from '../common/MathRenderer';
import { StatusBadge, ConfidenceBadge } from './Badge';
import { Button } from './Button';

export interface FormulaReviewData {
  id: string;
  originalCropUrl?: string;
  latex: string;
  mathml?: string;
  ast?: any;
  unicodeText?: string;
  plainText?: string;
  confidence: number;
  engineName?: string;
  status: 'VERIFIED' | 'NEEDS_REVIEW' | 'PROCESSING' | 'FAILED' | 'REJECTED';
}

export interface ReviewPanelProps {
  data: FormulaReviewData;
  onApprove?: (id: string) => void;
  onEdit?: (id: string) => void;
  onReOcr?: (id: string) => void;
  onSnipAgain?: (id: string) => void;
  onReject?: (id: string) => void;
  className?: string;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  data,
  onApprove,
  onEdit,
  onReOcr,
  onSnipAgain,
  onReject,
  className = '',
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {}
  };

  return (
    <div
      className={`border border-classic-border rounded-card bg-white shadow-classic overflow-hidden flex flex-col text-left ${className}`}
    >
      {/* Header Bar */}
      <div className="bg-classic-surface-muted px-4 py-3 border-b border-classic-border-light flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-classic-text-primary">
            Formula Review
          </span>
          <StatusBadge status={data.status} size="sm" />
          <ConfidenceBadge score={data.confidence} size="sm" />
        </div>

        {data.engineName && (
          <span className="text-xs text-classic-text-muted font-mono">
            Engine: <strong className="text-classic-text-primary">{data.engineName}</strong>
          </span>
        )}
      </div>

      {/* Side-by-Side Comparison (Requirement 19) */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-classic-border-light">
        {/* Left: Original Crop */}
        <div className="space-y-1.5 flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-classic-text-secondary">
            Original Crop
          </span>
          <div className="flex-1 min-h-[110px] bg-slate-50 border border-classic-border rounded-classic p-3 flex items-center justify-center overflow-hidden">
            {data.originalCropUrl ? (
              <img
                src={data.originalCropUrl}
                alt="Original Crop"
                className="max-h-24 max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-classic-text-muted italic">
                No cropped image available
              </span>
            )}
          </div>
        </div>

        {/* Right: Recognized Formula */}
        <div className="space-y-1.5 flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider text-classic-text-secondary">
            Recognized Formula
          </span>
          <div className="flex-1 min-h-[110px] bg-white border border-classic-border rounded-classic p-3 flex items-center justify-center overflow-x-auto text-classic-text-primary">
            <MathRenderer content={data.latex.startsWith('$') ? data.latex : `$${data.latex}$`} />
          </div>
        </div>
      </div>

      {/* Primary Mathematical Representations */}
      <div className="p-4 sm:p-5 space-y-3 bg-white">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-classic-text-secondary">
            <span>LaTeX Source:</span>
            <button
              type="button"
              onClick={() => copyToClipboard(data.latex, 'latex')}
              className="text-classic-navy hover:underline flex items-center space-x-1"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedField === 'latex' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="p-2.5 bg-slate-50 rounded border border-classic-border font-mono text-xs text-classic-text-primary overflow-x-auto">
            {data.latex}
          </div>
        </div>

        {/* Technical Inspector Accordion (MathML, AST, Unicode) */}
        <div>
          <button
            type="button"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="flex items-center space-x-1.5 text-xs font-bold text-classic-navy hover:underline py-1"
          >
            <span>{showTechnicalDetails ? 'Hide Technical Representations' : 'Show MathML, AST & Unicode Details'}</span>
            {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showTechnicalDetails && (
            <div className="pt-2 space-y-2 text-xs">
              {data.mathml && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-classic-text-secondary font-semibold">
                    <span>MathML:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(data.mathml!, 'mathml')}
                      className="text-classic-navy hover:underline flex items-center space-x-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedField === 'mathml' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-2 bg-slate-50 rounded border border-classic-border font-mono text-[11px] text-classic-text-secondary overflow-x-auto max-h-24">
                    {data.mathml}
                  </pre>
                </div>
              )}

              {data.ast && (
                <div className="space-y-1">
                  <span className="font-semibold text-classic-text-secondary">Expression AST:</span>
                  <pre className="p-2 bg-slate-50 rounded border border-classic-border font-mono text-[11px] text-classic-text-secondary overflow-x-auto max-h-28">
                    {typeof data.ast === 'object' ? JSON.stringify(data.ast, null, 2) : String(data.ast)}
                  </pre>
                </div>
              )}

              {data.unicodeText && (
                <div className="space-y-1">
                  <span className="font-semibold text-classic-text-secondary">Unicode Math:</span>
                  <div className="p-2 bg-slate-50 rounded border border-classic-border font-mono text-xs text-classic-text-primary">
                    {data.unicodeText}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Toolbar (Requirement 19: Approve, Edit, Re-OCR, Snip Again, Reject) */}
      <div className="bg-classic-surface-muted px-4 py-3 border-t border-classic-border flex flex-wrap items-center justify-end gap-2">
        {onReject && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => onReject(data.id)}
            icon={X}
          >
            Reject
          </Button>
        )}

        {onSnipAgain && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSnipAgain(data.id)}
            icon={Crop}
          >
            Snip Again
          </Button>
        )}

        {onReOcr && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onReOcr(data.id)}
            icon={RefreshCw}
          >
            Re-OCR
          </Button>
        )}

        {onEdit && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit(data.id)}
            icon={Edit3}
          >
            Edit Formula
          </Button>
        )}

        {onApprove && (
          <Button
            variant="success"
            size="sm"
            onClick={() => onApprove(data.id)}
            icon={Check}
          >
            Approve
          </Button>
        )}
      </div>
    </div>
  );
};
