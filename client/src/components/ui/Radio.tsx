import React, { forwardRef } from 'react';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, id, checked, disabled, className = '', onChange, ...props }, ref) => {
    const radioId = id || (typeof label === 'string' ? `radio-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <label
        htmlFor={radioId}
        className={`inline-flex items-start gap-3 cursor-pointer select-none text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input
            ref={ref}
            id={radioId}
            type="radio"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          {/* Visual radio circle: minimum 20px x 20px */}
          <div className="w-5 h-5 rounded-full border-2 border-classic-border-dark bg-white peer-checked:border-classic-navy peer-focus-visible:ring-2 peer-focus-visible:ring-blue-700 peer-focus-visible:ring-offset-1 transition-colors flex items-center justify-center shadow-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-classic-navy scale-0 peer-checked:scale-100 transition-transform" />
          </div>
        </div>

        {(label || description) && (
          <div className="space-y-0.5">
            {label && (
              <span className="block text-sm font-semibold text-classic-text-primary leading-tight">
                {label}
              </span>
            )}
            {description && (
              <span className="block text-xs text-classic-text-muted leading-tight">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = 'Radio';
