import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  options?: SelectOption[];
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      options,
      children,
      required = false,
      disabled = false,
      id,
      className = '',
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-semibold text-classic-text-primary"
          >
            {label}
            {required && <span className="text-red-700 ml-1 font-bold">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            required={required}
            className={`w-full min-h-[40px] sm:min-h-[42px] appearance-none bg-white text-classic-text-primary border rounded-classic text-sm pl-3.5 pr-10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 disabled:bg-slate-100 disabled:text-classic-text-disabled disabled:cursor-not-allowed ${
              errorMessage
                ? 'border-red-600 focus:ring-red-600'
                : 'border-classic-border hover:border-classic-border-dark'
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-white text-classic-text-primary py-1"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="pointer-events-none absolute right-3 flex items-center justify-center text-classic-text-secondary">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        {errorMessage ? (
          <p className="text-xs font-semibold text-red-700">{errorMessage}</p>
        ) : helperText ? (
          <p className="text-xs text-classic-text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
