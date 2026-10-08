import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Cpu,
  HardDrive,
  Zap,
  Shield,
  User as UserIcon,
  LogOut,
  Activity,
  Palette,
  Menu,
  Search,
  Bell,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../../lib/authStore';
import { useThemeStore } from '../../lib/themeStore';
import { useUiStore } from '../../lib/uiStore';
import { api } from '../../lib/api';

interface ResourceMetrics {
  cpu_percent: number;
  ram_used_mb: number;
  ram_total_mb: number;
  ram_available_mb: number;
  ram_percent: number;
  active_heavy_jobs: number;
  max_heavy_jobs: number;
  gpu?: {
    available: boolean;
    name: string;
    vram_used_mb: number;
    vram_total_mb: number;
  };
}

const MODULE_TITLES: Record<string, { module: string; section?: string }> = {
  '/': { module: 'Dashboard' },
  '/ingest': { module: 'Documents', section: 'Document Ingestion' },
  '/review': { module: 'Documents', section: '3-Panel Review Workspace' },
  '/snip': { module: 'Documents', section: 'Visual Snipping Workspace' },
  '/bank': { module: 'Questions', section: 'Hierarchical Question Bank' },
  '/designer': { module: 'Papers', section: 'Question Paper Designer' },
  '/papers': { module: 'Papers', section: 'Paper Bank Archive' },
  '/omr-gen': { module: 'OMR Studio', section: 'OMR Sheet Generator' },
  '/omr-eval': { module: 'OMR Studio', section: 'OMR Evaluation' },
  '/models': { module: 'System', section: 'Model Manager' },
  '/users': { module: 'Security', section: 'User & Access Control' },
  '/audit': { module: 'Security', section: 'Audit Logs' },
};

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { openPreferences } = useThemeStore();
  const { toggleMobileSidebar } = useUiStore();
  const [metrics, setMetrics] = useState<ResourceMetrics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentModule = MODULE_TITLES[location.pathname] || {
    module: 'Scientific Workspace',
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/system/resources');
        setMetrics(res.data);
      } catch {
        // AI service might be booting
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/bank?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <header className="h-[64px] border-b border-classic-border bg-white px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none shadow-xs">
      {/* Left: Mobile Menu Toggle & Brand / Module Breadcrumbs */}
      <div className="flex items-center space-x-3 min-w-0">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-classic border border-classic-border bg-white text-classic-text-primary md:hidden hover:bg-classic-surface-muted transition-colors shrink-0"
          title="Open Navigation Menu"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5 text-classic-text-primary" />
        </button>

        <Link
          to="/"
          className="flex items-center space-x-2.5 text-classic-navy shrink-0 group"
          title="Return to Dashboard"
        >
          <div className="w-9 h-9 rounded-classic bg-classic-navy flex items-center justify-center shadow-classic shrink-0 group-hover:bg-classic-navy-hover transition-colors">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-sm text-classic-text-primary hidden lg:inline tracking-tight">
            Scientific Intelligence
          </span>
        </Link>

        {/* Separator */}
        <div className="hidden lg:block h-5 w-px bg-classic-border shrink-0" />

        {/* Breadcrumb Navigation (Requirement 9) */}
        <nav aria-label="Breadcrumb" className="min-w-0 flex items-center text-xs sm:text-sm font-medium">
          <span className="text-classic-text-muted hover:text-classic-navy transition-colors truncate">
            {currentModule.module}
          </span>
          {currentModule.section && (
            <>
              <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-classic-text-muted shrink-0" />
              <span className="font-bold text-classic-text-primary truncate">
                {currentModule.section}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Center: Global Search Bar (Requirement 34) */}
      <div className="hidden md:flex items-center max-w-xs xl:max-w-md w-full mx-4">
        <form onSubmit={handleSearchSubmit} className="w-full relative flex items-center">
          <label htmlFor="global-search" className="sr-only">
            Search documents, questions, formulas
          </label>
          <div className="pointer-events-none absolute left-3 flex items-center justify-center text-classic-text-muted">
            <Search className="w-4 h-4" />
          </div>
          <input
            id="global-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions, formulas, papers... (Press Enter)"
            className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-classic-border rounded-classic text-xs text-classic-text-primary placeholder:text-classic-text-muted focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 transition-all"
          />
        </form>
      </div>

      {/* Right: Metrics & User Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Hardware Resource Monitor Widget (Core i3, 8GB RAM optimization) - Only visible to SUPER_ADMIN and ADMIN */}
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
          <div className="hidden xl:flex items-center space-x-4 bg-classic-surface-muted px-3 py-1 rounded-classic border border-classic-border text-xs">
            {/* CPU Usage */}
            <div className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-classic-navy" />
              <span className="text-classic-text-muted text-[11px]">CPU:</span>
              <span
                className={`font-semibold font-mono ${
                  metrics && metrics.cpu_percent > 85 ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {metrics ? `${metrics.cpu_percent}%` : '--'}
              </span>
            </div>

            <div className="h-3 w-px bg-classic-border" />

            {/* RAM Usage */}
            <div className="flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-classic-navy" />
              <span className="text-classic-text-muted text-[11px]">RAM:</span>
              <span
                className={`font-semibold font-mono ${
                  metrics && metrics.ram_percent > 80
                    ? 'text-amber-800'
                    : 'text-classic-text-primary'
                }`}
              >
                {metrics
                  ? `${(metrics.ram_used_mb / 1024).toFixed(1)} / ${(metrics.ram_total_mb / 1024).toFixed(1)} GB`
                  : '--'}
              </span>
            </div>
          </div>
        )}

        {/* User Profile Box & Logout (Requirement 9) */}
        {user && (
          <div className="flex items-center space-x-2 bg-white pl-2.5 pr-1.5 py-1 rounded-classic border border-classic-border shadow-2xs">
            <div className="w-7 h-7 rounded-full bg-classic-navy font-bold text-white text-[11px] flex items-center justify-center shrink-0">
              {user.fullName
                ? user.fullName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()
                : 'US'}
            </div>

            <div className="text-left hidden sm:block max-w-[140px] truncate">
              <div className="text-xs font-bold text-classic-text-primary truncate">
                {user.fullName || 'User'}
              </div>
              <div className="text-[10px] text-classic-navy font-mono font-semibold uppercase">
                {user.role}
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 hover:bg-red-50 text-classic-text-muted hover:text-red-700 rounded-classic transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
