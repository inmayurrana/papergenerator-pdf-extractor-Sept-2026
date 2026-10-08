import React from 'react';
import { FolderOpen } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = FolderOpen,
  action,
  className = '',
}) => {
  const renderIcon = () => {
    if (!icon) return <FolderOpen className="w-7 h-7 text-classic-navy" />;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className="w-7 h-7 text-classic-navy" />;
  };

  return (
    <div
      className={`border border-dashed border-classic-border rounded-card bg-white p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto my-6 shadow-classic ${className}`}
    >
      <div className="w-14 h-14 rounded-full bg-slate-100 border border-classic-border mx-auto flex items-center justify-center text-classic-navy shadow-sm">
        {renderIcon()}
      </div>

      <div className="space-y-1.5">
        <h3 className="text-base sm:text-lg font-bold text-classic-text-primary">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-classic-text-muted leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      </div>

      {action && <div className="pt-2 flex justify-center">{action}</div>}
    </div>
  );
};
