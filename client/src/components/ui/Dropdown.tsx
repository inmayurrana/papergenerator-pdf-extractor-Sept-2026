import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  selectedId?: string;
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  selectedId,
  align = 'left',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1.5 w-56 rounded-classic bg-white border border-classic-border shadow-classic-lg z-50 py-1.5 divide-y divide-classic-border-light overflow-hidden animate-fade-in`}
        >
          <div className="py-1">
            {items.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onClick?.();
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left font-medium transition-colors ${
                    isSelected
                      ? 'bg-classic-navy text-white font-bold'
                      : item.danger
                      ? 'text-red-700 hover:bg-red-50'
                      : 'text-classic-text-primary hover:bg-classic-surface-muted'
                  } ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {Icon && (
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-white' : item.danger ? 'text-red-700' : 'text-classic-text-secondary'
                      }`}
                    />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
