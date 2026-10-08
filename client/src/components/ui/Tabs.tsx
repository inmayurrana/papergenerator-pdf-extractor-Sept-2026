import React from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pill';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className = '',
}) => {
  if (variant === 'pill') {
    return (
      <div
        className={`flex flex-wrap items-center gap-1.5 p-1 bg-classic-surface-muted border border-classic-border rounded-classic ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-classic transition-colors min-h-[38px] ${
                isActive
                  ? 'bg-classic-navy text-white shadow-classic border border-classic-navy'
                  : 'bg-white text-classic-text-primary border border-classic-border hover:bg-classic-surface-muted'
              }`}
            >
              {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-classic-text-secondary'}`} />}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive ? 'bg-white text-classic-navy' : 'bg-slate-200 text-classic-text-primary'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`border-b border-classic-border flex flex-wrap items-center gap-4 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 py-3 px-1 text-sm font-semibold border-b-2 transition-colors -mb-px min-h-[44px] ${
              isActive
                ? 'border-classic-navy text-classic-navy font-bold'
                : 'border-transparent text-classic-text-secondary hover:text-classic-text-primary hover:border-classic-border'
            }`}
          >
            {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-classic-navy' : 'text-classic-text-secondary'}`} />}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-classic-surface-muted text-classic-text-primary border border-classic-border">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
