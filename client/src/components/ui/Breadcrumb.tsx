import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '' }) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center overflow-x-auto whitespace-nowrap text-xs sm:text-sm text-classic-text-secondary py-1 max-w-full ${className}`}
    >
      <ol className="flex items-center space-x-1.5 sm:space-x-2">
        <li>
          <Link
            to="/"
            className="flex items-center text-classic-text-muted hover:text-classic-navy transition-colors font-medium"
            title="Home"
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-classic-navy" />
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center space-x-1.5 sm:space-x-2">
              <ChevronRight className="w-3.5 h-3.5 text-classic-text-muted shrink-0" />
              {isLast || !item.to ? (
                <span className="font-bold text-classic-text-primary truncate max-w-[200px] sm:max-w-[320px]">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="font-medium text-classic-text-secondary hover:text-classic-navy hover:underline transition-colors truncate max-w-[150px] sm:max-w-[240px]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
