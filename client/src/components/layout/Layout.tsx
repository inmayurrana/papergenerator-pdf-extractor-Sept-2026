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
    document.body.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  return (
    <div className="min-h-screen flex flex-col bg-classic-background text-classic-text-primary selection:bg-blue-800 selection:text-white transition-colors duration-150 print:bg-white print:text-black print:min-h-0">
      <Navbar />
      <div className="flex flex-1 print:block">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-20 md:pb-6 w-full print:p-0 print:m-0 print:overflow-visible print:bg-white">
          <Outlet />
        </main>
      </div>
      <ThemePreferencesModal />
    </div>
  );
};
