import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  iconPosition?: 'left' | 'right';
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      icon,
      iconPosition = 'left',
      required = false,
      disabled = false,
      id,
      className = '',
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    const renderIcon = () => {
      if (!icon) return null;
      if (React.isValidElement(icon)) return icon;
      const IconComp = icon as React.ComponentType<{ className?: string }>;
      return <IconComp className="w-4 h-4" />;
    };

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-classic-text-primary"
          >
            {label}
            {required && <span className="text-red-700 ml-1 font-bold">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {icon && iconPosition === 'left' && (
            <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-classic-text-muted">
              {renderIcon()}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            className={`w-full min-h-[40px] sm:min-h-[42px] bg-white text-classic-text-primary border rounded-classic text-sm transition-colors placeholder:text-classic-text-muted focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 disabled:bg-slate-100 disabled:text-classic-text-disabled disabled:cursor-not-allowed ${
              errorMessage
                ? 'border-red-600 focus:ring-red-600'
                : 'border-classic-border hover:border-classic-border-dark'
            } ${icon && iconPosition === 'left' ? 'pl-10' : 'pl-3.5'} ${
              icon && iconPosition === 'right' ? 'pr-10' : 'pr-3.5'
            } ${className}`}
            {...props}
          />

          {icon && iconPosition === 'right' && (
            <div className="pointer-events-none absolute right-3.5 flex items-center justify-center text-classic-text-muted">
              {renderIcon()}
            </div>
          )}
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

Input.displayName = 'Input';
