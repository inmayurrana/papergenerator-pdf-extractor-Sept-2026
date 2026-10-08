import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  position?: 'left' | 'right';
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'left',
  width = 'w-80 max-w-[85vw]',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 transition-opacity animate-fade-in"
      />

      <div
        className={`fixed inset-y-0 ${
          position === 'left' ? 'left-0' : 'right-0'
        } ${width} bg-white border-${
          position === 'left' ? 'r' : 'l'
        } border-classic-border shadow-classic-lg flex flex-col justify-between py-4 px-4 transition-transform duration-200 z-50`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-classic-border">
          <div className="text-sm font-bold text-classic-text-primary truncate">
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-classic-text-muted hover:text-classic-text-primary hover:bg-classic-surface-muted rounded-classic transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Close Drawer"
            aria-label="Close Drawer"
          >
            <X className="w-5 h-5 text-classic-text-primary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-3">{children}</div>
      </div>
    </div>
  );
};
