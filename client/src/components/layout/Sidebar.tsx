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
  X,
  Pin,
  PinOff,
} from 'lucide-react';
import { useAuthStore } from '../../lib/authStore';
import { useUiStore } from '../../lib/uiStore';
import { Tooltip } from '../ui/Tooltip';

interface NavItemConfig {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItemConfig[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ingest', label: 'Document Ingestion', icon: UploadCloud },
  { to: '/review', label: '3-Panel Review', icon: SplitSquareVertical },
  { to: '/snip', label: 'Visual Snipper', icon: Scissors },
  { to: '/bank', label: 'Question Bank', icon: FolderTree },
  { to: '/designer', label: 'Paper Designer', icon: FileSpreadsheet },
  { to: '/papers', label: 'Paper Bank Archive', icon: Library },
  { to: '/omr-gen', label: 'OMR Generator', icon: QrCode },
  { to: '/omr-eval', label: 'OMR Evaluation', icon: CheckCircle2 },
  { to: '/models', label: 'Model Manager', icon: Cpu, adminOnly: true },
  { to: '/users', label: 'Users & Permissions', icon: Users, adminOnly: true },
  { to: '/audit', label: 'Audit Logs', icon: ScrollText, adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useUiStore();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pg_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('pg_sidebar_collapsed', String(next));
    } catch {}
  };

  const filteredNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-50 md:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-Over Navigation Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-classic-border flex flex-col justify-between py-4 px-3 md:hidden transform transition-transform duration-200 ease-in-out shadow-classic-lg ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-3 overflow-y-auto pr-1">
          <div className="flex items-center justify-between pb-3 border-b border-classic-border px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-classic-text-muted">
              Document Workspace
            </span>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="p-1.5 text-classic-text-muted hover:text-classic-text-primary rounded-classic hover:bg-classic-surface-muted transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Close Menu"
              aria-label="Close Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3.5 py-3 rounded-classic text-sm font-semibold transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-[#0B1F3A] text-white shadow-classic'
                        : 'text-classic-text-primary hover:bg-[#F3F4F6]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-5 h-5 shrink-0 ${
                          isActive ? 'text-white' : 'text-classic-text-secondary'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Mobile Drawer Bottom Info */}
        <div className="pt-3 border-t border-classic-border mt-2 px-1">
          <div className="px-3 py-2 bg-classic-surface-muted rounded-classic border border-classic-border-light text-xs text-classic-text-secondary flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="font-semibold text-classic-text-primary">Offline Engine</span>
            </span>
            <span className="font-mono text-[10px] text-classic-text-muted">v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Desktop / Tablet Sidebar (Requirement 7 & 8) */}
      <aside
        className={`hidden md:flex ${
          isCollapsed ? 'w-[68px]' : 'w-[260px]'
        } border-r border-classic-border bg-white flex-col justify-between py-3.5 px-2.5 min-h-[calc(100vh-64px)] transition-all duration-180 ease-in-out shrink-0 select-none overflow-x-hidden shadow-xs`}
      >
        <div className="space-y-1 overflow-y-auto pr-0.5">
          {/* Header & Collapse Toggle */}
          <div className="flex items-center justify-between px-2 pb-2.5 border-b border-classic-border mb-2">
            {!isCollapsed && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-classic-text-muted">
                Core Workspaces
              </span>
            )}
            <button
              type="button"
              onClick={toggleCollapse}
              className={`p-1.5 rounded-classic text-classic-text-secondary hover:text-classic-text-primary hover:bg-[#F3F4F6] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center ${
                isCollapsed ? 'mx-auto' : ''
              }`}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-0.5" aria-label="Main Navigation">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;

              const linkContent = (isActive: boolean) => (
                <NavLink
                  to={item.to}
                  className={`flex items-center ${
                    isCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-3 px-3 py-2.5'
                  } rounded-classic text-xs font-semibold transition-colors min-h-[40px] ${
                    isActive
                      ? 'bg-[#0B1F3A] text-white shadow-classic'
                      : 'text-classic-text-primary hover:bg-[#F3F4F6]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-white' : 'text-classic-text-secondary'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              );

              if (isCollapsed) {
                return (
                  <div key={item.to} className="relative flex justify-center">
                    <Tooltip content={item.label} position="right">
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center justify-center w-10 h-10 rounded-classic text-xs font-semibold transition-colors ${
                            isActive
                              ? 'bg-[#0B1F3A] text-white shadow-classic'
                              : 'text-classic-text-primary hover:bg-[#F3F4F6]'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-white' : 'text-classic-text-secondary'
                            }`}
                          />
                        )}
                      </NavLink>
                    </Tooltip>
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-classic text-xs font-semibold transition-colors min-h-[40px] ${
                      isActive
                        ? 'bg-[#0B1F3A] text-white shadow-classic'
                        : 'text-classic-text-primary hover:bg-[#F3F4F6]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-classic-text-secondary'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Status Box */}
        <div className="pt-3 border-t border-classic-border mt-2">
          <div
            className={`${
              isCollapsed ? 'p-2 justify-center' : 'px-3 py-2 justify-between'
            } bg-classic-surface-muted rounded-classic border border-classic-border-light text-[11px] text-classic-text-secondary flex items-center`}
          >
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              {!isCollapsed && (
                <span className="font-semibold text-classic-text-primary">
                  Offline Engine
                </span>
              )}
            </span>
            {!isCollapsed && (
              <span className="font-mono text-classic-text-muted text-[10px]">v1.0.0</span>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Requirement 26) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-classic-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden shadow-lg">
        <div className="grid grid-cols-5 h-[56px]">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center text-center transition-colors min-h-[48px] ${
                isActive
                  ? 'bg-[#0B1F3A] text-white font-bold'
                  : 'text-classic-text-secondary hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <LayoutDashboard className={`w-4 h-4 ${isActive ? 'text-white' : 'text-classic-text-secondary'}`} />
                <span className="text-[10px] mt-0.5 font-medium">Dashboard</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/ingest"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center text-center transition-colors min-h-[48px] ${
                isActive
                  ? 'bg-[#0B1F3A] text-white font-bold'
                  : 'text-classic-text-secondary hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <UploadCloud className={`w-4 h-4 ${isActive ? 'text-white' : 'text-classic-text-secondary'}`} />
                <span className="text-xs mt-0.5 font-semibold">Documents</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/review"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center text-center transition-colors min-h-[48px] ${
                isActive
                  ? 'bg-[#0B1F3A] text-white font-bold'
                  : 'text-classic-text-secondary hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <SplitSquareVertical className={`w-4 h-4 ${isActive ? 'text-white' : 'text-classic-text-secondary'}`} />
                <span className="text-xs mt-0.5 font-semibold">Review</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/bank"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center text-center transition-colors min-h-[48px] ${
                isActive
                  ? 'bg-[#0B1F3A] text-white font-bold'
                  : 'text-classic-text-secondary hover:bg-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <FolderTree className={`w-4 h-4 ${isActive ? 'text-white' : 'text-classic-text-secondary'}`} />
                <span className="text-xs mt-0.5 font-semibold">Questions</span>
              </>
            )}
          </NavLink>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="flex flex-col items-center justify-center text-center text-classic-text-secondary hover:bg-slate-100 transition-colors min-h-[48px]"
            aria-label="Open More Modules"
          >
            <span className="text-base font-bold leading-none">☰</span>
            <span className="text-xs mt-0.5 font-semibold text-classic-text-primary">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
