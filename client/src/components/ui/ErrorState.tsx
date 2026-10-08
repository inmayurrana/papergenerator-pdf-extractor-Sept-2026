import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  cause?: string;
  onRetry?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'An unexpected error occurred',
  message,
  cause,
  onRetry,
  actions,
  className = '',
}) => {
  return (
    <div
      className={`border border-red-300 rounded-card bg-red-50/50 p-6 sm:p-8 text-center space-y-4 max-w-lg mx-auto my-6 shadow-classic ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-red-100 border border-red-200 mx-auto flex items-center justify-center text-red-700 shadow-sm">
        <AlertTriangle className="w-6 h-6 text-red-700" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-red-950">{title}</h3>
        <p className="text-sm text-red-900 leading-relaxed">{message}</p>
        {cause && (
          <p className="text-xs text-red-800 bg-red-100/60 p-2 rounded border border-red-200 font-mono">
            {cause}
          </p>
        )}
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={onRetry}
            icon={RefreshCw}
          >
            Try Again
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
};
