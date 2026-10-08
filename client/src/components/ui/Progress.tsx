import React from 'react';

export interface ProgressProps {
  value: number; // 0 to 100
  label?: string;
  helperText?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  label,
  helperText,
  variant = 'primary',
  size = 'md',
  showPercentage = true,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }[size];

  const fillClass = {
    primary: 'bg-classic-navy',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-red-600',
  }[variant];

  return (
    <div className="w-full space-y-1.5 text-left">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs font-semibold text-classic-text-secondary">
          {label && <span>{label}</span>}
          {showPercentage && <span className="font-mono">{Math.round(clampedValue)}%</span>}
        </div>
      )}

      <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`${fillClass} h-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>

      {helperText && (
        <p className="text-[11px] text-classic-text-muted">{helperText}</p>
      )}
    </div>
  );
};
