import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'navy';
  size?: 'sm' | 'md';
  icon?: React.ComponentType<{ className?: string }>;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-semibold',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-bold',
  }[size];

  const variantClasses = {
    default: 'bg-classic-surface-muted text-classic-text-secondary border border-classic-border',
    success: 'bg-green-50 text-green-800 border border-green-300',
    warning: 'bg-amber-50 text-amber-900 border border-amber-300',
    danger: 'bg-red-50 text-red-900 border border-red-300',
    info: 'bg-blue-50 text-blue-900 border border-blue-300',
    navy: 'bg-[#0B1F3A]/10 text-[#0B1F3A] border border-[#0B1F3A]/25',
  }[variant];

  return (
    <span
      className={`inline-flex items-center rounded-full leading-none select-none tracking-wide ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
};

export interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', className = '' }) => {
  const normalized = (status || '').toUpperCase();

  if (['VERIFIED', 'COMPLETED', 'SUCCESS', 'APPROVED'].includes(normalized)) {
    return (
      <Badge variant="success" size={size} className={className}>
        {normalized === 'VERIFIED' ? 'VERIFIED' : normalized}
      </Badge>
    );
  }

  if (['NEEDS_REVIEW', 'NEEDS REVIEW', 'PENDING', 'WARNING'].includes(normalized)) {
    return (
      <Badge variant="warning" size={size} className={className}>
        NEEDS REVIEW
      </Badge>
    );
  }

  if (['PROCESSING', 'IN_PROGRESS', 'QUEUED', 'SCANNING'].includes(normalized)) {
    return (
      <Badge variant="info" size={size} className={className}>
        {normalized === 'PROCESSING' ? 'PROCESSING' : normalized}
      </Badge>
    );
  }

  if (['FAILED', 'ERROR'].includes(normalized)) {
    return (
      <Badge variant="danger" size={size} className={className}>
        FAILED
      </Badge>
    );
  }

  if (['REJECTED'].includes(normalized)) {
    return (
      <Badge variant="danger" size={size} className={className}>
        REJECTED
      </Badge>
    );
  }

  return (
    <Badge variant="default" size={size} className={className}>
      {status || 'UNKNOWN'}
    </Badge>
  );
};

export interface ConfidenceBadgeProps {
  score?: number; // 0.0 to 1.0 or 0 to 100
  confidence?: number;
  label?: string;
  size?: 'sm' | 'md';
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ score, confidence, label, size = 'md' }) => {
  const raw = confidence !== undefined ? confidence : (score !== undefined ? score : 0);
  const pct = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);

  let variant: 'success' | 'warning' | 'danger' = 'success';
  if (pct < 70) variant = 'danger';
  else if (pct < 88) variant = 'warning';

  return (
    <Badge variant={variant} size={size}>
      {label ? `${label}: ` : ''}{pct}% Confidence
    </Badge>
  );
};
