import React, { useEffect, useState } from 'react';
import { Cpu, HardDrive, Zap, Shield, User as UserIcon, LogOut, Activity, Palette } from 'lucide-react';
import { useAuthStore } from '../../lib/authStore';
import { useThemeStore } from '../../lib/themeStore';
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

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { openPreferences } = useThemeStore();
  const [metrics, setMetrics] = useState<ResourceMetrics | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/system/resources');
        setMetrics(res.data);
      } catch {
        // AI service might be starting up
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Title & Brand */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base text-slate-100 tracking-tight font-display">Question Paper Generator with OMR sheets</h1>
        </div>
      </div>

      {/* Hardware Resource Monitor Widget (Optimized for Core i3, 8GB RAM) - Only visible to SUPER_ADMIN and ADMIN */}
      {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
        <div className="hidden lg:flex items-center space-x-6 bg-slate-950/60 px-4 py-1.5 rounded-full border border-slate-800/80 text-xs">
          {/* CPU Usage */}
          <div className="flex items-center space-x-2">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">CPU:</span>
            <span className={`font-semibold font-mono ${metrics && metrics.cpu_percent > 85 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {metrics ? `${metrics.cpu_percent}%` : '--'}
            </span>
          </div>

          <div className="h-3 w-px bg-slate-800" />

          {/* RAM Usage */}
          <div className="flex items-center space-x-2">
            <HardDrive className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-slate-400">RAM:</span>
            <span className={`font-semibold font-mono ${metrics && metrics.ram_percent > 80 ? 'text-amber-400' : 'text-slate-200'}`}>
              {metrics ? `${(metrics.ram_used_mb / 1024).toFixed(1)} / ${(metrics.ram_total_mb / 1024).toFixed(1)} GB` : '--'}
            </span>
          </div>

          <div className="h-3 w-px bg-slate-800" />

          {/* Concurrency Worker Lock */}
          <div className="flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Worker Jobs:</span>
            <span className="font-semibold font-mono text-indigo-300">
              {metrics ? `${metrics.active_heavy_jobs} / ${metrics.max_heavy_jobs}` : '0 / 1'}
            </span>
          </div>
        </div>
      )}

      {/* User Profile & Actions */}
      <div className="flex items-center space-x-3">
        {/* Quick Theme Switcher Button */}
        <button
          type="button"
          onClick={openPreferences}
          title="Change Theme & Visual Preferences"
          className="p-2 bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/50 transition-all hover:border-indigo-500/50 shadow-sm"
        >
          <Palette className="w-4 h-4 text-indigo-400" />
        </button>

        {user && (
          <div className="flex items-center space-x-3 bg-slate-800/60 pl-3 pr-2 py-1.5 rounded-lg border border-slate-700/50">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-200">{user.fullName}</div>
              <div className="text-[10px] text-indigo-400 font-mono tracking-wider font-semibold uppercase">{user.role}</div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-rose-400 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
