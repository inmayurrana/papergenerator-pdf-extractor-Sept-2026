import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  headerBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  headerBorder = true,
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-classic-border rounded-card shadow-classic overflow-hidden ${className}`}
      {...props}
    >
      {(title || actions) && (
        <div
          className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${
            headerBorder ? 'border-b border-classic-border-light' : ''
          }`}
        >
          <div>
            {title && (
              <h3 className="text-base font-bold text-classic-text-primary leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-classic-text-muted mt-0.5 leading-normal">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
};
