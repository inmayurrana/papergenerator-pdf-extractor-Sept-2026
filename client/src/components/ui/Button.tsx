import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-classic transition-colors select-none focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-100 disabled:shadow-none';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px] sm:min-h-[38px] gap-1.5',
    md: 'text-sm px-4 py-2 min-h-[40px] sm:min-h-[42px] gap-2',
    lg: 'text-base px-5 py-2.5 min-h-[44px] sm:min-h-[46px] gap-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-classic-navy text-white hover:bg-classic-navy-hover active:bg-classic-navy-active shadow-classic border border-classic-navy disabled:bg-slate-200 disabled:text-slate-600 disabled:border-slate-300',
    secondary:
      'bg-white text-classic-text-primary border border-classic-border hover:bg-classic-surface-muted active:bg-slate-200 shadow-classic disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200',
    danger:
      'bg-classic-danger text-white hover:bg-red-800 active:bg-red-900 border border-classic-danger shadow-classic disabled:bg-rose-100 disabled:text-rose-400 disabled:border-rose-200',
    success:
      'bg-classic-success text-white hover:bg-emerald-800 active:bg-emerald-900 border border-classic-success shadow-classic disabled:bg-emerald-100 disabled:text-emerald-400 disabled:border-emerald-200',
    ghost:
      'bg-transparent text-classic-text-primary hover:bg-classic-surface-muted active:bg-slate-200 border border-transparent disabled:bg-transparent disabled:text-slate-400',
  }[variant];

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className="w-4 h-4 shrink-0 text-current" />;
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
      ) : iconPosition === 'left' ? (
        renderIcon()
      ) : null}

      {children && <span>{children}</span>}

      {!loading && iconPosition === 'right' && renderIcon()}
    </button>
  );
};
