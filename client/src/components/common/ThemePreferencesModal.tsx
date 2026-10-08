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
        className="relative w-full max-w-2xl bg-white border border-classic-border rounded-lg shadow-classic-md overflow-hidden flex flex-col max-h-[85vh] z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-classic-border-light bg-classic-surface-muted">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-classic-navy text-white flex items-center justify-center shadow-classic">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-classic-text-primary flex items-center space-x-2">
                <span>Visual Themes & Preferences</span>
                <span className="text-[10px] bg-slate-200 text-classic-navy font-mono px-2 py-0.5 rounded border border-classic-border font-semibold">
                  {AVAILABLE_THEMES.length} Themes
                </span>
              </h2>
              <p className="text-xs text-classic-text-muted">
                Enterprise document management themes & visual modes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closePreferences}
            className="p-1.5 text-classic-text-muted hover:text-classic-text-primary hover:bg-classic-surface-muted rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-6 py-3 border-b border-classic-border-light bg-white flex items-center space-x-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              selectedCategory === 'all'
                ? 'bg-classic-navy text-white shadow-classic'
                : 'text-classic-text-secondary hover:text-classic-text-primary hover:bg-classic-surface-muted'
            }`}
          >
            🌟 All Themes
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('light')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              selectedCategory === 'light'
                ? 'bg-classic-navy text-white shadow-classic'
                : 'text-classic-text-secondary hover:text-classic-text-primary hover:bg-classic-surface-muted'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Classic Light (Standard)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('dark')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              selectedCategory === 'dark'
                ? 'bg-classic-navy text-white shadow-classic'
                : 'text-classic-text-secondary hover:text-classic-text-primary hover:bg-classic-surface-muted'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark & Pro</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('neon')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              selectedCategory === 'neon'
                ? 'bg-classic-navy text-white shadow-classic'
                : 'text-classic-text-secondary hover:text-classic-text-primary hover:bg-classic-surface-muted'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Cyberpunk & Neon</span>
          </button>
        </div>

        {/* Themes Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 bg-classic-background">
          {filteredThemes.map((theme: ThemeOption) => {
            const isActive = currentTheme === theme.id;
            return (
              <div
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className={`group relative p-4 rounded-md border cursor-pointer transition-colors ${
                  isActive
                    ? 'border-classic-navy bg-white ring-2 ring-classic-navy shadow-classic'
                    : 'border-classic-border bg-white hover:border-classic-border-dark'
                }`}
              >
                {/* Active Indicator Badge */}
                {isActive && (
                  <div className="absolute top-3 right-3 flex items-center space-x-1 bg-classic-navy text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                    <Check className="w-3 h-3 text-white" />
                    <span className="text-white">ACTIVE</span>
                  </div>
                )}

                {/* Color Palette Preview Bar */}
                <div className="h-9 rounded overflow-hidden flex border border-classic-border mb-3 shadow-inner">
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
                  <h3 className="text-sm font-bold text-classic-text-primary group-hover:text-classic-navy transition-colors flex items-center space-x-1.5">
                    <span>{theme.name}</span>
                  </h3>
                  <p className="text-[11px] text-classic-text-secondary mt-1 leading-snug">
                    {theme.description}
                  </p>
                </div>

                {/* Bottom Color Chips */}
                <div className="mt-3 pt-2.5 border-t border-classic-border-light flex items-center justify-between text-[10px] text-classic-text-muted">
                  <span className="capitalize font-mono">{theme.category} mode</span>
                  <span className="font-mono text-[10px] text-classic-text-secondary">
                    {theme.previewColors.accent}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-classic-border-light bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={() => setTheme('navy-academic')}
            className="text-xs text-classic-navy hover:underline flex items-center space-x-1.5 font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Standard (Classic Navy)</span>
          </button>

          <button
            type="button"
            onClick={closePreferences}
            className="classic-button classic-button-primary !text-xs !py-1.5 !px-5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
