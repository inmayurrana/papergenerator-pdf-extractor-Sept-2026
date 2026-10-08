import React, { forwardRef } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, id, checked, disabled, className = '', onChange, ...props }, ref) => {
    const checkboxId = id || (typeof label === 'string' ? `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <label
        htmlFor={checkboxId}
        className={`inline-flex items-start gap-3 cursor-pointer select-none text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          {/* Visual checkbox box: minimum 20px x 20px */}
          <div className="w-5 h-5 rounded-[4px] border-2 border-classic-border-dark bg-white peer-checked:bg-classic-navy peer-checked:border-classic-navy peer-focus-visible:ring-2 peer-focus-visible:ring-blue-700 peer-focus-visible:ring-offset-1 transition-colors flex items-center justify-center shadow-xs">
            <Check className="w-3.5 h-3.5 text-white stroke-[3] opacity-0 peer-checked:opacity-100 transition-opacity" />
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

Checkbox.displayName = 'Checkbox';
