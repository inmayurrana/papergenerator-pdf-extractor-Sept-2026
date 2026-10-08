import React from 'react';
import { FileText } from 'lucide-react';

export interface PageThumbnailProps {
  pageNumber: number;
  imageUrl?: string;
  isActive: boolean;
  onClick: () => void;
  formulaCount?: number;
  questionCount?: number;
  hasErrors?: boolean;
}

export const PageThumbnail: React.FC<PageThumbnailProps> = ({
  pageNumber,
  imageUrl,
  isActive,
  onClick,
  formulaCount,
  questionCount,
  hasErrors,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full text-left rounded-classic border p-2 transition-all select-none ${
        isActive
          ? 'bg-blue-50/70 border-classic-navy shadow-classic ring-2 ring-blue-700/20'
          : 'bg-white border-classic-border hover:border-classic-border-dark hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
        <span
          className={`font-mono ${
            isActive ? 'text-classic-navy font-bold' : 'text-classic-text-secondary'
          }`}
        >
          Page {pageNumber}
        </span>
        {hasErrors ? (
          <span className="w-2 h-2 rounded-full bg-red-600" title="Has items needing review" />
        ) : (
          (questionCount || formulaCount) ? (
            <span className="w-2 h-2 rounded-full bg-emerald-600" title="Extracted items present" />
          ) : null
        )}
      </div>

      <div className="w-full aspect-[3/4] bg-slate-100 rounded border border-classic-border-light overflow-hidden flex items-center justify-center relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Page ${pageNumber} thumbnail`}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <FileText className="w-6 h-6 text-slate-400" />
        )}

        {(questionCount !== undefined || formulaCount !== undefined) && (
          <div className="absolute bottom-1 right-1 bg-black/75 text-white text-[10px] font-mono px-1 py-0.2 rounded font-semibold backdrop-blur-xs">
            {questionCount ? `${questionCount} Qs` : `${formulaCount || 0} f(x)`}
          </div>
        )}
      </div>
    </button>
  );
};
