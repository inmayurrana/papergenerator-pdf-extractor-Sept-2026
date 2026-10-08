import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
  className = '',
}) => {
  const switchId = id || (label ? `switch-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`inline-flex items-center justify-between gap-4 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      {(label || description) && (
        <div className="text-left space-y-0.5">
          {label && (
            <label htmlFor={switchId} className="block text-sm font-semibold text-classic-text-primary cursor-pointer">
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-classic-text-muted">{description}</p>
          )}
        </div>
      )}

      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-1 ${
          checked
            ? 'bg-classic-navy border-classic-navy'
            : 'bg-slate-200 border-classic-border-dark'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform flex items-center justify-center text-[9px] font-bold ${
            checked
              ? 'translate-x-7 text-classic-navy'
              : 'translate-x-0.5 text-slate-500'
          }`}
        >
          {checked ? 'ON' : 'OFF'}
        </span>
      </button>
    </div>
  );
};
