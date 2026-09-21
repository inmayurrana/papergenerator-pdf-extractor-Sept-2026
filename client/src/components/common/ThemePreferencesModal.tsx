import React, { useState } from 'react';
import {
  Palette,
  X,
  Check,
  Sparkles,
  Sun,
  Moon,
  Zap,
  RotateCcw,
  Sliders,
  Eye,
} from 'lucide-react';
import { useThemeStore, AVAILABLE_THEMES, ThemeOption } from '../../lib/themeStore';

export const ThemePreferencesModal: React.FC = () => {
  const { currentTheme, isPreferencesOpen, closePreferences, setTheme } = useThemeStore();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'dark' | 'neon' | 'light'>('all');

  if (!isPreferencesOpen) return null;

  const filteredThemes = AVAILABLE_THEMES.filter(
    (t) => selectedCategory === 'all' || t.category === selectedCategory
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={closePreferences} />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Visual Themes & Preferences</span>
                <span className="text-[10px] bg-indigo-950 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/40 font-semibold">
                  {AVAILABLE_THEMES.length} Themes
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Choose from curated internet developer & examination themes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closePreferences}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/30 flex items-center space-x-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            🌟 All Themes
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('dark')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              selectedCategory === 'dark'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark & Pro</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('neon')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              selectedCategory === 'neon'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Cyberpunk & Neon</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('light')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              selectedCategory === 'light'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-300" />
            <span>Clean Paper / Light</span>
          </button>
        </div>

        {/* Themes Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
          {filteredThemes.map((theme: ThemeOption) => {
            const isActive = currentTheme === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className={`group relative p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'border-indigo-500 bg-indigo-950/30 ring-2 ring-indigo-500/40 shadow-xl shadow-indigo-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/90'
                }`}
              >
                {/* Active Indicator Badge */}
                {isActive && (
                  <div className="absolute top-3 right-3 flex items-center space-x-1 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                    <Check className="w-3 h-3" />
                    <span>ACTIVE</span>
                  </div>
                )}

                {/* Color Palette Preview Bar */}
                <div className="h-10 rounded-xl overflow-hidden flex border border-white/10 mb-3 shadow-inner">
                  <div
                    className="flex-1 h-full"
                    style={{ backgroundColor: theme.previewColors.bg }}
                    title={`Background: ${theme.previewColors.bg}`}
                  />
                  <div
                    className="flex-1 h-full"
                    style={{ backgroundColor: theme.previewColors.surface }}
                    title={`Surface: ${theme.previewColors.surface}`}
                  />
                  <div
                    className="flex-1 h-full"
                    style={{ backgroundColor: theme.previewColors.accent }}
                    title={`Accent: ${theme.previewColors.accent}`}
                  />
                  <div
                    className="flex-1 h-full"
                    style={{ backgroundColor: theme.previewColors.secondary }}
                    title={`Secondary: ${theme.previewColors.secondary}`}
                  />
                  <div
                    className="w-8 h-full flex items-center justify-center font-bold text-xs"
                    style={{
                      backgroundColor: theme.previewColors.surface,
                      color: theme.previewColors.text,
                    }}
                    title={`Text: ${theme.previewColors.text}`}
                  >
                    Aa
                  </div>
                </div>

                {/* Title & Tagline */}
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center space-x-1.5">
                    <span>{theme.name}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {theme.description}
                  </p>
                </div>

                {/* Bottom Color Chips */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="capitalize font-mono">{theme.category} mode</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {theme.previewColors.accent}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setTheme('midnight')}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center space-x-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default (Midnight)</span>
          </button>

          <button
            type="button"
            onClick={closePreferences}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
