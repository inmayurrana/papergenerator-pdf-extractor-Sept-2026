import React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from 'lucide-react';

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  actions,
  onDismiss,
  className = '',
}) => {
  const config = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-900',
      icon: Info,
      iconColor: 'text-blue-700',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      text: 'text-green-900',
      icon: CheckCircle2,
      iconColor: 'text-green-700',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-950',
      icon: AlertTriangle,
      iconColor: 'text-amber-700',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-950',
      icon: XCircle,
      iconColor: 'text-red-700',
    },
  }[type];

  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`p-4 rounded-classic border ${config.bg} ${config.border} ${config.text} space-y-2 text-left text-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Icon className={`w-5 h-5 ${config.iconColor} shrink-0 mt-0.5`} />
          <div className="space-y-1">
            {title && <h4 className="font-bold leading-tight">{title}</h4>}
            <div className="text-xs leading-relaxed opacity-95">{children}</div>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-current opacity-70 hover:opacity-100 rounded transition-opacity"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {actions && (
        <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-black/10">
          {actions}
        </div>
      )}
    </div>
  );
};

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  const bgClass = {
    success: 'bg-emerald-700 text-white border-emerald-800',
    error: 'bg-red-700 text-white border-red-800',
    info: 'bg-[#0B1F3A] text-white border-slate-700',
  }[type];

  return (
    <div
      className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-classic shadow-classic-lg border ${bgClass} text-xs font-semibold animate-fade-in`}
    >
      {type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
      ) : type === 'error' ? (
        <AlertTriangle className="w-4 h-4 text-red-200 shrink-0" />
      ) : (
        <Info className="w-4 h-4 text-blue-200 shrink-0" />
      )}
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 p-1 hover:bg-white/20 rounded transition-colors text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
