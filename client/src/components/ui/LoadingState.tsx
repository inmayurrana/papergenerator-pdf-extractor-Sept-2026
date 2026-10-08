import React from 'react';
import { RefreshCw, StopCircle } from 'lucide-react';
import { Progress } from './Progress';
import { Button } from './Button';

export interface LoadingStateProps {
  title?: string;
  subtitle?: string;
  engineName?: string;
  currentPage?: number;
  totalPages?: number;
  currentItem?: number;
  totalItems?: number;
  progressPercent?: number;
  onCancel?: () => void;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Processing Document...',
  subtitle = 'Detecting and extracting scientific formulas and text...',
  engineName,
  currentPage,
  totalPages,
  currentItem,
  totalItems,
  progressPercent,
  onCancel,
  className = '',
}) => {
  return (
    <div
      className={`border border-classic-border rounded-card bg-white p-6 sm:p-8 text-center space-y-5 max-w-md mx-auto my-6 shadow-classic ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 mx-auto flex items-center justify-center text-classic-navy shadow-sm">
        <RefreshCw className="w-6 h-6 text-classic-navy animate-spin" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-classic-text-primary">{title}</h3>
        <p className="text-xs text-classic-text-muted leading-relaxed">{subtitle}</p>
      </div>

      {(currentPage !== undefined || currentItem !== undefined || progressPercent !== undefined) && (
        <div className="space-y-2 bg-classic-surface-muted p-3.5 rounded-classic border border-classic-border-light text-left text-xs">
          {currentPage !== undefined && totalPages !== undefined && (
            <div className="flex items-center justify-between font-semibold text-classic-text-primary">
              <span>Page Processing:</span>
              <span className="font-mono text-classic-navy font-bold">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          )}

          {currentItem !== undefined && totalItems !== undefined && (
            <div className="flex items-center justify-between font-semibold text-classic-text-primary">
              <span>Recognizing Items:</span>
              <span className="font-mono text-classic-navy font-bold">
                Formula {currentItem} of {totalItems}
              </span>
            </div>
          )}

          {engineName && (
            <div className="flex items-center justify-between text-classic-text-muted">
              <span>Engine:</span>
              <span className="font-mono font-medium text-classic-text-secondary">
                {engineName}
              </span>
            </div>
          )}

          {progressPercent !== undefined && (
            <div className="pt-1">
              <Progress value={progressPercent} size="sm" />
            </div>
          )}
        </div>
      )}

      {onCancel && (
        <div className="pt-2 flex justify-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            icon={StopCircle}
          >
            Cancel Processing
          </Button>
        </div>
      )}
    </div>
  );
};
