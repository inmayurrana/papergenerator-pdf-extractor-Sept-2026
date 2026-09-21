import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { ThemePreferencesModal } from '../common/ThemePreferencesModal';
import { useThemeStore } from '../../lib/themeStore';

export const Layout: React.FC = () => {
  const { currentTheme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors duration-200 print:bg-white print:text-black print:min-h-0">
      <Navbar />
      <div className="flex flex-1 print:block">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-4 py-3 lg:px-5 lg:py-4 w-full print:p-0 print:m-0 print:overflow-visible print:bg-white">
          <Outlet />
        </main>
      </div>
      <ThemePreferencesModal />
    </div>
  );
};
