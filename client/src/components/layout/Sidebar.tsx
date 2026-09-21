import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  SplitSquareVertical,
  Scissors,
  FolderTree,
  FileSpreadsheet,
  QrCode,
  CheckCircle2,
  Cpu,
  Users,
  ScrollText,
  Library,
  ChevronLeft,
  ChevronRight,
  Palette,
  Sliders,
} from 'lucide-react';
import { useAuthStore } from '../../lib/authStore';
import { useThemeStore, AVAILABLE_THEMES } from '../../lib/themeStore';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentTheme, openPreferences } = useThemeStore();

  const activeThemeObj = AVAILABLE_THEMES.find((t) => t.id === currentTheme) || AVAILABLE_THEMES[0];

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/ingest', label: 'Document Ingestion', icon: UploadCloud },
    { to: '/review', label: '3-Panel Review', icon: SplitSquareVertical },
    { to: '/snip', label: 'Visual Snipper', icon: Scissors },
    { to: '/bank', label: 'Question Bank', icon: FolderTree },
    { to: '/designer', label: 'Paper Designer', icon: FileSpreadsheet },
    { to: '/papers', label: 'Paper Bank (Archive)', icon: Library },
    { to: '/omr-gen', label: 'OMR Sheet Generator', icon: QrCode },
    { to: '/omr-eval', label: 'OMR Evaluation', icon: CheckCircle2 },
    { to: '/models', label: 'Model Manager', icon: Cpu, adminOnly: true },
    { to: '/users', label: 'User & Access Control', icon: Users, adminOnly: true },
    { to: '/audit', label: 'Audit Logs', icon: ScrollText, adminOnly: true },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-60'
      } border-r border-slate-800/80 bg-slate-950/80 flex flex-col justify-between py-4 px-2.5 min-h-[calc(100vh-4rem)] transition-all duration-200 shrink-0 select-none`}
    >
      <div className="space-y-1 overflow-y-auto pr-0.5">
        <div className="flex items-center justify-between px-2 pb-2.5">
          {!isCollapsed && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Core Workspaces
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar to increase working area'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    isCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3 py-2.5'
                  } rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-500/10 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
      </div>

      {/* Bottom Slider End Controls: Preferences / Themes & Status */}
      <div className="space-y-2 pt-3 border-t border-slate-800/80 mt-2">
        {/* Theme & Preferences Trigger Button */}
        <button
          type="button"
          onClick={openPreferences}
          title={isCollapsed ? `Theme: ${activeThemeObj.name}` : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
          } rounded-xl bg-slate-900/80 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-800 hover:border-indigo-500/40 transition-all group shadow-sm`}
        >
          <div className="flex items-center space-x-2.5">
            <div
              className="w-5 h-5 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
              style={{ backgroundColor: activeThemeObj.previewColors.accent }}
            >
              <Palette className="w-3 h-3 text-white" />
            </div>
            {!isCollapsed && (
              <div className="text-left">
                <div className="text-xs font-semibold group-hover:text-indigo-300 transition-colors">
                  Theme & Preferences
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[110px]">
                  {activeThemeObj.name}
                </div>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <Sliders className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          )}
        </button>

        {/* Offline Status Badge */}
        <div
          className={`${
            isCollapsed ? 'p-1.5 justify-center' : 'px-3 py-2 justify-between'
          } bg-slate-900/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center`}
        >
          <span className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {!isCollapsed && <span className="font-medium text-slate-300">Offline Engine</span>}
          </span>
          {!isCollapsed && <span className="font-mono text-slate-400 text-[10px]">v1.0.0</span>}
        </div>
      </div>
    </aside>
  );
};
