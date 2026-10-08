import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      required = false,
      disabled = false,
      id,
      className = '',
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-semibold text-classic-text-primary"
          >
            {label}
            {required && <span className="text-red-700 ml-1 font-bold">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          required={required}
          rows={rows}
          className={`w-full bg-white text-classic-text-primary border rounded-classic p-3 text-sm transition-colors placeholder:text-classic-text-muted focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 disabled:bg-slate-100 disabled:text-classic-text-disabled disabled:cursor-not-allowed ${
            errorMessage
              ? 'border-red-600 focus:ring-red-600'
              : 'border-classic-border hover:border-classic-border-dark'
          } ${className}`}
          {...props}
        />

        {errorMessage ? (
          <p className="text-xs font-semibold text-red-700">{errorMessage}</p>
        ) : helperText ? (
          <p className="text-xs text-classic-text-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
