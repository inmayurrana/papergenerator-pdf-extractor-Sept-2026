import React, { useState } from 'react';
import {
  Sparkles,
  X,
  RotateCcw,
  Sliders,
  Palette,
  Shapes,
  Gauge,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  useBackgroundFxStore,
  FormulaColorOption,
  ShapeColorTheme,
  ShapeType,
} from '../../lib/backgroundFxStore';

const COLOR_SWATCHES: { id: FormulaColorOption; label: string; color: string; border: string }[] = [
  { id: 'indigo', label: 'Indigo', color: '#4f46e5', border: 'border-indigo-500' },
  { id: 'cyan', label: 'Cyan', color: '#06b6d4', border: 'border-cyan-500' },
  { id: 'emerald', label: 'Emerald', color: '#10b981', border: 'border-emerald-500' },
  { id: 'rose', label: 'Rose', color: '#f43f5e', border: 'border-rose-500' },
  { id: 'amber', label: 'Amber', color: '#f59e0b', border: 'border-amber-500' },
  { id: 'violet', label: 'Violet', color: '#8b5cf6', border: 'border-violet-500' },
  { id: 'slate', label: 'Slate', color: '#475569', border: 'border-slate-500' },
  { id: 'navy', label: 'Navy', color: '#001f3f', border: 'border-blue-900' },
];

const SHAPE_THEMES: { id: ShapeColorTheme; label: string; preview: string }[] = [
  { id: 'vibrant', label: 'Vibrant Rainbow', preview: 'bg-gradient-to-r from-cyan-400 via-rose-400 to-amber-400' },
  { id: 'neon', label: 'Electric Neon', preview: 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-fuchsia-400' },
  { id: 'cyberpunk', label: 'Cyberpunk', preview: 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400' },
  { id: 'pastel', label: 'Soft Pastel', preview: 'bg-gradient-to-r from-sky-300 via-purple-300 to-pink-300' },
  { id: 'amber_gold', label: 'Amber & Gold', preview: 'bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400' },
  { id: 'matching', label: 'Match Formula', preview: 'bg-slate-300 border border-dashed border-slate-400' },
];

const SHAPE_ITEMS: { type: ShapeType; label: string; icon: string }[] = [
  { type: 'hexagon', label: 'Hexagon', icon: '⬡' },
  { type: 'atom', label: 'Atom', icon: '⚛' },
  { type: 'ring', label: 'Ring', icon: '◎' },
  { type: 'triangle', label: 'Delta', icon: '△' },
  { type: 'diamond', label: 'Diamond', icon: '◇' },
  { type: 'star', label: 'Star', icon: '✦' },
];

export const BackgroundFxControls: React.FC = () => {
  const {
    formulaCount,
    movementSpeed,
    formulaColor,
    customColorHex,
    formulaOpacity,
    showShapes,
    shapeCount,
    shapeSpeed,
    shapeColorTheme,
    shapeOpacity,
    enabledShapeTypes,
    isPanelOpen,
    setFormulaCount,
    setMovementSpeed,
    setFormulaColor,
    setCustomColorHex,
    setFormulaOpacity,
    setShowShapes,
    setShapeCount,
    setShapeSpeed,
    setShapeColorTheme,
    setShapeOpacity,
    toggleShapeType,
    setIsPanelOpen,
    applyPreset,
    resetToDefaults,
  } = useBackgroundFxStore();

  const [activeTab, setActiveTab] = useState<'formulas' | 'shapes'>('formulas');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getSpeedLabel = (speed: number) => {
    if (speed <= 0.4) return 'Ultra Calm';
    if (speed <= 0.8) return 'Relaxed';
    if (speed <= 1.2) return 'Normal';
    if (speed <= 1.8) return 'Brisk';
    if (speed <= 2.5) return 'Energetic';
    return 'Hyper Drive';
  };

  return (
    <>
      {/* Floating Toggle Trigger Button */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          type="button"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className={`group flex items-center space-x-2 px-3.5 py-2.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md transition-all duration-300 border ${
            isPanelOpen
              ? 'bg-[#001f3f] text-white border-blue-400/40 ring-4 ring-blue-500/20'
              : 'bg-white/95 hover:bg-white text-slate-800 hover:text-black border-slate-300/80 hover:border-slate-400 shadow-slate-300/40'
          }`}
          title="Configure background formulas, speed, colors, and shapes"
        >
          <Sparkles className={`w-4 h-4 transition-transform duration-300 ${isPanelOpen ? 'rotate-45 text-cyan-300' : 'text-indigo-600 group-hover:scale-110'}`} />
          <span className="hidden sm:inline">Effects & Formulas</span>
          <span className="inline sm:hidden">Effects</span>
          <span className="ml-1 px-1.5 py-0.2 bg-indigo-100 text-indigo-700 text-[10px] rounded-full font-bold">
            {formulaCount + (showShapes ? shapeCount : 0)}
          </span>
        </button>
      </div>

      {/* Slide-in / Popup Control Modal Panel */}
      {isPanelOpen && (
        <div className="fixed bottom-16 right-4 z-40 w-[92vw] max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden text-slate-800 flex flex-col max-h-[85vh] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-[#001f3f] to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold leading-tight">Visual Effects & Formulas</h3>
                <p className="text-[11px] text-slate-300">Live customization of floating elements</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={resetToDefaults}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Reset to default settings"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsPanelOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
              <span>Quick Presets</span>
              <span className="text-[9px] lowercase font-normal text-slate-400">one-click styles</span>
            </div>
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => applyPreset('balanced')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 transition-colors shadow-2xs whitespace-nowrap"
              >
                🎓 Academic
              </button>
              <button
                type="button"
                onClick={() => applyPreset('vibrant')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white hover:bg-pink-50 text-slate-700 hover:text-pink-700 border border-slate-200 transition-colors shadow-2xs whitespace-nowrap"
              >
                🌈 Vibrant
              </button>
              <button
                type="button"
                onClick={() => applyPreset('hyper')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white hover:bg-cyan-50 text-slate-700 hover:text-cyan-700 border border-slate-200 transition-colors shadow-2xs whitespace-nowrap"
              >
                ⚡ Hyper
              </button>
              <button
                type="button"
                onClick={() => applyPreset('cosmic')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 transition-colors shadow-2xs whitespace-nowrap"
              >
                🌌 Cosmic
              </button>
              <button
                type="button"
                onClick={() => applyPreset('minimal')}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shadow-2xs whitespace-nowrap"
              >
                🕊️ Minimal
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setActiveTab('formulas')}
              className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
                activeTab === 'formulas'
                  ? 'border-[#001f3f] text-[#001f3f] bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Formulas ({formulaCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('shapes')}
              className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
                activeTab === 'shapes'
                  ? 'border-[#001f3f] text-[#001f3f] bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shapes className="w-3.5 h-3.5" />
              <span>Shapes ({showShapes ? shapeCount : 'Off'})</span>
            </button>
          </div>

          {/* Main Controls Scroll Area */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
            {activeTab === 'formulas' ? (
              <>
                {/* 1. Formula Quantity Slider */}
                <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Formulas Quantity</span>
                    </span>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {formulaCount} items
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="75"
                    step="1"
                    value={formulaCount}
                    onChange={(e) => setFormulaCount(Number(e.target.value))}
                    className="w-full accent-[#001f3f] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>10 (Sparse)</span>
                    <span>35 (Standard)</span>
                    <span>75 (Maximum)</span>
                  </div>
                </div>

                {/* 2. Movement Speed Slider */}
                <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <Gauge className="w-3.5 h-3.5 text-amber-600" />
                      <span>Movement Speed</span>
                    </span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {movementSpeed.toFixed(1)}x ({getSpeedLabel(movementSpeed)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.5"
                    step="0.1"
                    value={movementSpeed}
                    onChange={(e) => setMovementSpeed(Number(e.target.value))}
                    className="w-full accent-[#001f3f] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>0.2x (Gentle)</span>
                    <span>1.0x (Normal)</span>
                    <span>3.5x (Blazing)</span>
                  </div>
                </div>

                {/* 3. Formula Color Palette */}
                <div className="space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <Palette className="w-3.5 h-3.5 text-pink-600" />
                      <span>Formulas Color</span>
                    </span>
                    <span className="text-[11px] font-semibold capitalize text-slate-600">
                      {formulaColor === 'multicolor'
                        ? '🌈 Multicolor Spectrum'
                        : formulaColor === 'custom'
                        ? `Custom (${customColorHex})`
                        : formulaColor}
                    </span>
                  </div>

                  {/* Color Swatches Grid */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {COLOR_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.id}
                        type="button"
                        onClick={() => setFormulaColor(swatch.id)}
                        className={`flex items-center space-x-1.5 p-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                          formulaColor === swatch.id
                            ? 'bg-white border-slate-800 shadow-sm ring-2 ring-slate-800/10 font-bold'
                            : 'bg-white/60 hover:bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: swatch.color }}
                        />
                        <span className="truncate">{swatch.label}</span>
                      </button>
                    ))}

                    {/* Multicolor Option */}
                    <button
                      type="button"
                      onClick={() => setFormulaColor('multicolor')}
                      className={`flex items-center space-x-1.5 p-1.5 rounded-lg border text-[11px] font-medium transition-all ${
                        formulaColor === 'multicolor'
                          ? 'bg-white border-slate-800 shadow-sm ring-2 ring-slate-800/10 font-bold'
                          : 'bg-white/60 hover:bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full shrink-0 bg-gradient-to-tr from-cyan-400 via-pink-400 to-amber-400 shadow-2xs" />
                      <span className="truncate">Spectrum</span>
                    </button>

                    {/* Custom Hex Picker */}
                    <label
                      className={`flex items-center space-x-1.5 p-1.5 rounded-lg border text-[11px] font-medium cursor-pointer transition-all ${
                        formulaColor === 'custom'
                          ? 'bg-white border-slate-800 shadow-sm ring-2 ring-slate-800/10 font-bold'
                          : 'bg-white/60 hover:bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="color"
                        value={customColorHex || '#4f46e5'}
                        onChange={(e) => setCustomColorHex(e.target.value)}
                        className="w-3.5 h-3.5 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0"
                      />
                      <span className="truncate">Custom</span>
                    </label>
                  </div>
                </div>

                {/* Advanced Accordion (Opacity) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between text-slate-500 hover:text-slate-800 font-semibold text-[11px] px-1 py-1"
                  >
                    <span>Advanced Tuning (Opacity & Visibility)</span>
                    {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {showAdvanced && (
                    <div className="mt-2 space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">Formula Contrast / Opacity</span>
                        <span className="font-mono text-slate-800 font-bold">
                          {Math.round(formulaOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="1.0"
                        step="0.05"
                        value={formulaOpacity}
                        onChange={(e) => setFormulaOpacity(Number(e.target.value))}
                        className="w-full accent-[#001f3f] cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Shapes Enable Switch */}
                <div className="flex items-center justify-between bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <Shapes className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Colorful Floating Shapes</span>
                    </span>
                    <p className="text-[10px] text-slate-500">Render floating geometric & atomic symbols</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showShapes}
                      onChange={(e) => setShowShapes(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#001f3f]" />
                  </label>
                </div>

                {showShapes && (
                  <>
                    {/* Shape Quantity Slider */}
                    <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Shapes Quantity</span>
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {shapeCount} shapes
                        </span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="40"
                        step="1"
                        value={shapeCount}
                        onChange={(e) => setShapeCount(Number(e.target.value))}
                        className="w-full accent-[#001f3f] cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                        <span>4 (Subtle)</span>
                        <span>18 (Balanced)</span>
                        <span>40 (Max)</span>
                      </div>
                    </div>

                    {/* Shape Movement Speed */}
                    <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                          <Gauge className="w-3.5 h-3.5 text-amber-600" />
                          <span>Shapes Speed</span>
                        </span>
                        <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {shapeSpeed.toFixed(1)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="3.5"
                        step="0.1"
                        value={shapeSpeed}
                        onChange={(e) => setShapeSpeed(Number(e.target.value))}
                        className="w-full accent-[#001f3f] cursor-pointer"
                      />
                    </div>

                    {/* Shape Color Theme */}
                    <div className="space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-800 block">Shape Color Theme</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {SHAPE_THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            type="button"
                            onClick={() => setShapeColorTheme(theme.id)}
                            className={`flex items-center space-x-2 p-2 rounded-lg border text-left transition-all ${
                              shapeColorTheme === theme.id
                                ? 'bg-white border-[#001f3f] ring-2 ring-[#001f3f]/10 shadow-sm font-bold'
                                : 'bg-white/60 hover:bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded-full shrink-0 ${theme.preview}`} />
                            <span className="text-[11px] truncate">{theme.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Shape Types Active Filter */}
                    <div className="space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-800 block">Active Shape Geometries</span>
                      <div className="flex flex-wrap gap-1.5">
                        {SHAPE_ITEMS.map((item) => {
                          const isEnabled = enabledShapeTypes.includes(item.type);
                          return (
                            <button
                              key={item.type}
                              type="button"
                              onClick={() => toggleShapeType(item.type)}
                              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-xs transition-all ${
                                isEnabled
                                  ? 'bg-[#001f3f] text-white border-[#001f3f] font-semibold'
                                  : 'bg-white text-slate-400 border-slate-200 line-through opacity-60'
                              }`}
                            >
                              <span>{item.icon}</span>
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Shape Opacity */}
                    <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-700">Shape Transparency / Glow</span>
                        <span className="font-mono text-slate-800 font-bold">
                          {Math.round(shapeOpacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.05"
                        value={shapeOpacity}
                        onChange={(e) => setShapeOpacity(Number(e.target.value))}
                        className="w-full accent-[#001f3f] cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer with instant status */}
          <div className="px-4 py-2.5 bg-slate-100/90 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <span className="flex items-center space-x-1.5 text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time Active</span>
            </span>
            <button
              type="button"
              onClick={() => setIsPanelOpen(false)}
              className="text-[#001f3f] font-bold hover:underline"
            >
              Done & Save
            </button>
          </div>
        </div>
      )}
    </>
  );
};
