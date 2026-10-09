import React, { useRef } from 'react';
import {
  Stamp,
  Trash2,
  Eye,
  Type,
  School,
  Image,
  Upload,
  Check,
} from 'lucide-react';

export interface WatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  showWatermark: boolean;
  setShowWatermark: (v: boolean) => void;
  watermarkType: 'school' | 'custom_text' | 'image';
  setWatermarkType: (v: 'school' | 'custom_text' | 'image') => void;
  watermarkText: string;
  setWatermarkText: (v: string) => void;
  watermarkImageUrl: string | null;
  setWatermarkImageUrl: (v: string | null) => void;
  watermarkSize: number;
  setWatermarkSize: (v: number) => void;
  watermarkOpacity: number;
  setWatermarkOpacity: (v: number) => void;
  watermarkRotation: number;
  setWatermarkRotation: (v: number) => void;
  schoolName: string;
  onUploadWatermarkImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveWatermark: () => void;
  onSaveWatermark: () => void;
}

export const WatermarkModal: React.FC<WatermarkModalProps> = ({
  isOpen,
  onClose,
  showWatermark,
  setShowWatermark,
  watermarkType,
  setWatermarkType,
  watermarkText,
  setWatermarkText,
  watermarkImageUrl,
  setWatermarkImageUrl,
  watermarkSize,
  setWatermarkSize,
  watermarkOpacity,
  setWatermarkOpacity,
  watermarkRotation,
  setWatermarkRotation,
  schoolName,
  onUploadWatermarkImage,
  onRemoveWatermark,
  onSaveWatermark,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 no-print animate-fade-in">
      <div className="bg-white border border-classic-border rounded-classic w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-classic-border bg-classic-surface-muted shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-classic bg-indigo-50 text-indigo-900 flex items-center justify-center border border-indigo-200 shadow-xs">
              <Stamp className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-classic-navy">
                  Document Watermark Setup
                </h2>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  showWatermark ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {showWatermark ? `ACTIVE (${Math.round(watermarkOpacity * 100)}%)` : 'REMOVED / OFF'}
                </span>
              </div>
              <p className="text-xs text-classic-text-muted">
                Configure custom text or logo watermark, set transparency level, or remove watermark
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-classic-text-muted hover:text-classic-navy text-lg font-bold p-1 rounded-classic hover:bg-slate-200/60 transition-colors"
            title="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Master Control Bar: Status + Remove Watermark button + Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-classic bg-slate-50 border border-classic-border">
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-bold text-classic-navy uppercase tracking-wide">
                Watermark Status:
              </span>
              <span className={`text-xs font-semibold ${showWatermark ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                {showWatermark ? '✓ Enabled on Canvas & Print / PDF' : '✕ Disabled / Removed'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {showWatermark && (
                <button
                  type="button"
                  onClick={onRemoveWatermark}
                  className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-classic flex items-center space-x-1 transition-all"
                  title="Remove watermark immediately"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Remove Watermark</span>
                </button>
              )}
              <label className="relative inline-flex items-center cursor-pointer ml-1">
                <input
                  type="checkbox"
                  checked={showWatermark}
                  onChange={(e) => setShowWatermark(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.5px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-classic-navy"></div>
              </label>
            </div>
          </div>

          {/* Live Preview Box with Exam Lines Simulation */}
          <div className="p-3 bg-slate-50 border border-classic-border rounded-classic space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-classic-navy">
              <span className="flex items-center space-x-1.5">
                <Eye className="w-3.5 h-3.5 text-classic-navy" />
                <span>Live Watermark Preview</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Transparency: {Math.round(watermarkOpacity * 100)}% | Angle: {watermarkRotation}°
              </span>
            </div>
            <div className="relative w-full h-32 bg-white rounded border border-slate-200 shadow-inner overflow-hidden flex items-center justify-center select-none">
              {/* Simulated Question Lines in Background */}
              <div className="absolute inset-0 p-3 space-y-2 opacity-35 pointer-events-none">
                <div className="h-2 bg-slate-300 rounded w-3/4"></div>
                <div className="h-2 bg-slate-200 rounded w-full"></div>
                <div className="h-2 bg-slate-200 rounded w-5/6"></div>
                <div className="flex space-x-4 pt-1">
                  <div className="h-2 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-2 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-2 bg-slate-200 rounded w-1/4"></div>
                </div>
                <div className="h-2 bg-slate-300 rounded w-2/3 pt-1"></div>
                <div className="h-2 bg-slate-200 rounded w-4/5"></div>
              </div>

              {/* Render Watermark Overlay in Preview */}
              {showWatermark ? (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    transform: `rotate(${watermarkRotation}deg)`,
                    opacity: watermarkOpacity,
                  }}
                >
                  {watermarkType === 'image' && watermarkImageUrl ? (
                    <img
                      src={watermarkImageUrl}
                      alt="Watermark preview"
                      className="max-h-24 max-w-full object-contain filter grayscale"
                      style={{ maxHeight: Math.min(100, Math.max(30, watermarkSize / 3)) }}
                    />
                  ) : (
                    <span
                      className="font-serif font-black uppercase text-center tracking-widest text-slate-900 border-2 border-dashed border-slate-900/30 px-3 py-1 rounded line-clamp-1"
                      style={{
                        fontSize: `${Math.min(24, Math.max(12, watermarkSize / 3))}px`,
                      }}
                    >
                      {watermarkType === 'custom_text'
                        ? (watermarkText || 'CONFIDENTIAL')
                        : (schoolName || 'CAMBRIDGE INTERNATIONAL SCHOOL MANDI')}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-center text-xs font-semibold text-slate-400 z-10">
                  Watermark is removed / disabled. Toggle switch above or select an option to activate.
                </div>
              )}
            </div>
          </div>

          {/* Watermark Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-classic-navy uppercase tracking-wide block">
              1. Select Watermark Source / Type
            </label>
            <div className="grid grid-cols-3 gap-2 bg-classic-surface-muted p-1.5 rounded-classic border border-classic-border">
              <button
                type="button"
                onClick={() => {
                  setWatermarkType('custom_text');
                  if (!showWatermark) setShowWatermark(true);
                }}
                className={`py-2 px-2 text-xs font-bold rounded-classic flex items-center justify-center space-x-1.5 transition-all ${
                  watermarkType === 'custom_text'
                    ? 'bg-classic-navy text-white shadow-sm'
                    : 'text-classic-text-secondary hover:text-classic-navy hover:bg-white'
                }`}
              >
                <Type className="w-4 h-4" />
                <span>Custom Text</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWatermarkType('school');
                  if (!showWatermark) setShowWatermark(true);
                }}
                className={`py-2 px-2 text-xs font-bold rounded-classic flex items-center justify-center space-x-1.5 transition-all ${
                  watermarkType === 'school'
                    ? 'bg-classic-navy text-white shadow-sm'
                    : 'text-classic-text-secondary hover:text-classic-navy hover:bg-white'
                }`}
              >
                <School className="w-4 h-4" />
                <span>School Name</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setWatermarkType('image');
                  if (watermarkSize < 80) setWatermarkSize(280);
                  if (!showWatermark) setShowWatermark(true);
                }}
                className={`py-2 px-2 text-xs font-bold rounded-classic flex items-center justify-center space-x-1.5 transition-all ${
                  watermarkType === 'image'
                    ? 'bg-classic-navy text-white shadow-sm'
                    : 'text-classic-text-secondary hover:text-classic-navy hover:bg-white'
                }`}
              >
                <Image className="w-4 h-4" />
                <span>Logo / Image</span>
              </button>
            </div>
          </div>

          {/* Custom Text Configuration */}
          {watermarkType === 'custom_text' && (
            <div className="p-4 bg-classic-surface-muted rounded-classic border border-classic-border space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-classic-text-secondary">
                <span>Enter Custom Watermark Text:</span>
                <button
                  type="button"
                  onClick={() => setWatermarkText(schoolName || 'CAMBRIDGE INTERNATIONAL SCHOOL MANDI')}
                  className="text-xs text-classic-navy hover:underline font-bold"
                >
                  Use School Name
                </button>
              </div>
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => {
                  setWatermarkText(e.target.value);
                  if (!showWatermark) setShowWatermark(true);
                }}
                placeholder="e.g. CONFIDENTIAL, SAMPLE PAPER, PRE-BOARD 2026"
                className="w-full bg-white border border-classic-border text-classic-text text-sm rounded-classic px-3.5 py-2.5 font-bold focus:outline-none focus:border-classic-navy shadow-inner"
              />
              <div>
                <span className="text-[11px] font-bold text-classic-text-muted uppercase tracking-wider block mb-1.5">
                  Quick Preset Text Chips:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'CONFIDENTIAL',
                    'SAMPLE PAPER',
                    'PRE-BOARD 2026',
                    'DO NOT COPY',
                    'INTERNAL ASSESSMENT',
                    'DRAFT',
                    'PRACTICE TEST',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setWatermarkText(preset);
                        if (!showWatermark) setShowWatermark(true);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-classic font-mono font-semibold transition-all border ${
                        watermarkText === preset
                          ? 'bg-classic-navy text-white border-classic-navy shadow-xs'
                          : 'bg-white text-classic-text-secondary hover:text-classic-navy border-classic-border hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* School Name Mode */}
          {watermarkType === 'school' && (
            <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-classic text-xs text-classic-navy space-y-2">
              <div className="flex items-center space-x-1.5 font-bold text-sm">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Dynamic School Name Watermark</span>
              </div>
              <p className="text-xs font-mono font-bold bg-white p-2.5 rounded border border-blue-200 text-slate-800">
                "{schoolName || 'CAMBRIDGE INTERNATIONAL SCHOOL MANDI'}"
              </p>
              <p className="text-xs text-slate-600">
                This watermark automatically stays synchronized with whatever institution name is typed in the exam header at the top of the canvas.
              </p>
            </div>
          )}

          {/* Image / Logo Upload Mode */}
          {watermarkType === 'image' && (
            <div className="p-4 bg-classic-surface-muted rounded-classic border border-classic-border space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={onUploadWatermarkImage}
                className="hidden"
              />
              {watermarkImageUrl ? (
                <div className="flex items-center space-x-3.5 bg-white p-3 rounded-classic border border-classic-border">
                  <div className="w-16 h-16 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={watermarkImageUrl}
                      alt="Watermark preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-classic-navy block">Custom Watermark Graphic</span>
                    <span className="text-[11px] text-emerald-600 font-semibold block">✓ Image loaded &amp; active</span>
                    <div className="flex items-center space-x-3 mt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-classic-navy hover:underline font-bold"
                      >
                        Change Image
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          setWatermarkImageUrl(null);
                          setWatermarkType('school');
                        }}
                        className="text-xs text-rose-600 hover:underline font-bold"
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 px-3 bg-white hover:bg-blue-50/70 text-classic-navy border-2 border-dashed border-classic-navy/40 hover:border-classic-navy rounded-classic text-xs font-bold flex flex-col items-center justify-center space-y-1.5 transition-all shadow-sm"
                >
                  <Upload className="w-5 h-5 text-classic-navy" />
                  <span>Upload Watermark Image / Logo (PNG, SVG, JPG)</span>
                  <span className="text-[11px] text-slate-500 font-normal">Transparent PNG or SVG recommended</span>
                </button>
              )}
            </div>
          )}

          {/* Transparency / Opacity Level Slider & Presets */}
          <div className="p-4 bg-classic-surface-muted rounded-classic border border-classic-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-classic-navy uppercase tracking-wide block">
                  2. Transparency / Opacity Level
                </label>
                <span className="text-[11px] text-classic-text-muted">
                  Control how faint or prominent the watermark appears behind exam questions
                </span>
              </div>
              <div className="px-2.5 py-1 bg-white border border-classic-border rounded-classic text-xs font-mono font-bold text-classic-navy shadow-2xs">
                {Math.round(watermarkOpacity * 100)}% Opacity
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min={2}
                max={60}
                step={1}
                value={Math.round(watermarkOpacity * 100)}
                onChange={(e) => {
                  const val = (parseInt(e.target.value, 10) || 6) / 100;
                  setWatermarkOpacity(val);
                  if (!showWatermark) setShowWatermark(true);
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-classic-navy"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>2% (Faintest)</span>
                <span>10%</span>
                <span>20%</span>
                <span>35%</span>
                <span>60% (Darkest)</span>
              </div>
            </div>

            {/* Quick Opacity Preset Buttons */}
            <div>
              <span className="text-[11px] font-bold text-classic-text-muted uppercase tracking-wider block mb-1">
                Quick Transparency Presets:
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: 'Subtle', val: 0.04 },
                  { label: 'Normal', val: 0.06 },
                  { label: 'Medium', val: 0.12 },
                  { label: 'Prominent', val: 0.20 },
                  { label: 'Bold', val: 0.35 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setWatermarkOpacity(p.val);
                      if (!showWatermark) setShowWatermark(true);
                    }}
                    className={`py-1 px-1 text-[11px] rounded font-semibold text-center transition-all border ${
                      Math.abs(watermarkOpacity - p.val) < 0.015
                        ? 'bg-classic-navy text-white border-classic-navy shadow-xs font-bold'
                        : 'bg-white text-classic-text-secondary hover:text-classic-navy border-classic-border hover:bg-slate-100'
                    }`}
                  >
                    {p.label} ({Math.round(p.val * 100)}%)
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Watermark Size & Angle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-classic-surface-muted rounded-classic border border-classic-border">
            {/* Size Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-classic-navy">
                <span>3. Watermark Size:</span>
                <span className="font-mono text-classic-navy">{watermarkSize}px</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const min = watermarkType === 'image' ? 80 : 28;
                    setWatermarkSize(Math.max(min, watermarkSize - (watermarkType === 'image' ? 20 : 6)));
                  }}
                  className="w-7 h-7 bg-white hover:bg-slate-100 text-classic-navy border border-classic-border rounded text-xs font-bold flex items-center justify-center shrink-0"
                >-</button>
                <input
                  type="range"
                  min={watermarkType === 'image' ? 80 : 28}
                  max={watermarkType === 'image' ? 600 : 140}
                  step={watermarkType === 'image' ? 10 : 2}
                  value={watermarkSize}
                  onChange={(e) => setWatermarkSize(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-classic-navy"
                />
                <button
                  type="button"
                  onClick={() => {
                    const max = watermarkType === 'image' ? 600 : 140;
                    setWatermarkSize(Math.min(max, watermarkSize + (watermarkType === 'image' ? 20 : 6)));
                  }}
                  className="w-7 h-7 bg-white hover:bg-slate-100 text-classic-navy border border-classic-border rounded text-xs font-bold flex items-center justify-center shrink-0"
                >+</button>
              </div>
            </div>

            {/* Angle Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-classic-navy">
                <span>4. Orientation / Angle:</span>
                <span className="font-mono text-classic-navy">{watermarkRotation}°</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: '-30° Diagonal', angle: -30 },
                  { label: '-45° Steep', angle: -45 },
                  { label: '0° Flat', angle: 0 },
                  { label: '-90° Vertical', angle: -90 },
                ].map((item) => (
                  <button
                    key={item.angle}
                    type="button"
                    onClick={() => setWatermarkRotation(item.angle)}
                    className={`py-1 text-[11px] font-bold rounded border transition-all ${
                      watermarkRotation === item.angle
                        ? 'bg-classic-navy text-white border-classic-navy shadow-xs font-bold'
                        : 'bg-white text-classic-text-secondary border-classic-border hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-classic-border bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onRemoveWatermark}
            className="px-3 py-2 text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 rounded-classic flex items-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Remove Watermark</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="classic-button-secondary rounded-classic px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSaveWatermark}
              className="classic-button-primary rounded-classic px-5 py-2 text-xs font-bold shadow-classic flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply &amp; Save Watermark</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
