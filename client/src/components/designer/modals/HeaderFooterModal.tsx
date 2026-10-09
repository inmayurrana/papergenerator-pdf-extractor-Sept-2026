import React, { useRef } from 'react';
import {
  FileText,
  Stamp,
  School,
  Type,
  Image,
  Check,
  Upload,
  AlignJustify,
} from 'lucide-react';

export interface HeaderFooterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Watermark
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
  // Running Header & Footer
  showPageHeader: boolean;
  setShowPageHeader: (v: boolean) => void;
  customPageHeader: string;
  setCustomPageHeader: React.Dispatch<React.SetStateAction<string>>;
  showPageFooter: boolean;
  setShowPageFooter: (v: boolean) => void;
  customPageFooter: string;
  setCustomPageFooter: React.Dispatch<React.SetStateAction<string>>;
  onSave: () => void;
}

export const HeaderFooterModal: React.FC<HeaderFooterModalProps> = ({
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
  showPageHeader,
  setShowPageHeader,
  customPageHeader,
  setCustomPageHeader,
  showPageFooter,
  setShowPageFooter,
  customPageFooter,
  setCustomPageFooter,
  onSave,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print">
      <div className="bg-white border border-classic-border rounded-classic w-full max-w-2xl p-6 shadow-2xl space-y-5 animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-classic-border">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-classic bg-classic-surface-muted text-classic-navy flex items-center justify-center border border-classic-border">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-classic-navy">
                Running Header, Footer &amp; Watermark Setup
              </h2>
              <p className="text-xs text-classic-text-muted">
                Configure page headers, footers, page numbering, and school watermark for canvas &amp; print
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-classic-text-muted hover:text-classic-navy text-lg font-bold p-1 rounded-classic hover:bg-classic-surface-muted transition-colors"
          >
            ✕
          </button>
        </div>

        {/* School Name Watermark Configuration */}
        <div className="p-4 rounded-classic bg-classic-surface-muted border border-classic-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Stamp className="w-4 h-4 text-classic-navy" />
              <span className="text-xs font-bold text-classic-navy">Page Watermark Overlay</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showWatermark}
                onChange={(e) => setShowWatermark(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-classic-navy"></div>
            </label>
          </div>

          {showWatermark && (
            <div className="space-y-3 pt-1">
              {/* Watermark Type Selector Tabs */}
              <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-classic border border-classic-border">
                <button
                  type="button"
                  onClick={() => setWatermarkType('school')}
                  className={`py-1.5 text-xs font-bold rounded-classic flex items-center justify-center space-x-1.5 transition-all ${
                    watermarkType === 'school'
                      ? 'bg-classic-navy text-white shadow-sm'
                      : 'text-classic-text-secondary hover:text-classic-navy hover:bg-slate-50'
                  }`}
                >
                  <School className="w-3.5 h-3.5" />
                  <span>School Name (Default)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkType('custom_text')}
                  className={`py-1.5 text-xs font-bold rounded-classic flex items-center justify-center space-x-1.5 transition-all ${
                    watermarkType === 'custom_text'
                      ? 'bg-classic-navy text-white shadow-sm'
                      : 'text-classic-text-secondary hover:text-classic-navy hover:bg-slate-50'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Custom Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWatermarkType('image');
                    if (watermarkSize < 80) setWatermarkSize(280);
                  }}
                  className={`py-1.5 text-xs font-bold rounded-classic flex items-center justify-center space-x-1.5 transition-all ${
                    watermarkType === 'image'
                      ? 'bg-classic-navy text-white shadow-sm'
                      : 'text-classic-text-secondary hover:text-classic-navy hover:bg-slate-50'
                  }`}
                >
                  <Image className="w-3.5 h-3.5" />
                  <span>Logo / Image</span>
                </button>
              </div>

              {/* School Mode Info */}
              {watermarkType === 'school' && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-classic text-xs text-classic-navy space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Using Active School Name</span>
                  </div>
                  <p className="text-xs text-slate-700 font-mono italic">
                    "{schoolName || 'CAMBRIDGE INTERNATIONAL SCHOOL MANDI'}"
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Default watermark updates in real time whenever the school name on the paper canvas is changed.
                  </p>
                </div>
              )}

              {/* Custom Text Mode */}
              {watermarkType === 'custom_text' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-classic-text-secondary flex items-center justify-between">
                    <span>Custom Watermark Text:</span>
                    <button
                      type="button"
                      onClick={() => setWatermarkText('CAMBRIDGE INTERNATIONAL SCHOOL MANDI')}
                      className="text-[11px] text-classic-navy hover:underline font-bold"
                    >
                      Reset School
                    </button>
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="e.g. CONFIDENTIAL, SAMPLE PAPER"
                    className="w-full bg-white border border-classic-border text-classic-text text-xs rounded-classic px-3 py-2 font-semibold focus:outline-none focus:border-classic-navy"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['CONFIDENTIAL', 'SAMPLE PAPER', 'PRE-BOARD 2026', 'DO NOT COPY'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setWatermarkText(preset)}
                        className="text-xs bg-white hover:bg-slate-100 text-classic-text-secondary hover:text-classic-navy border border-classic-border px-2 py-0.5 rounded font-mono transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Mode */}
              {watermarkType === 'image' && (
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={onUploadWatermarkImage}
                    className="hidden"
                  />
                  {watermarkImageUrl ? (
                    <div className="flex items-center space-x-3 bg-white p-2.5 rounded-classic border border-classic-border">
                      <div className="w-14 h-14 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={watermarkImageUrl}
                          alt="Watermark preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-classic-navy block">Custom Watermark Graphic</span>
                        <span className="text-[11px] text-emerald-600 block">✓ Image ready</span>
                        <div className="flex items-center space-x-3 mt-1.5">
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
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 px-3 bg-white hover:bg-blue-50/60 text-classic-navy border border-dashed border-classic-navy/40 hover:border-classic-navy rounded-classic text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-sm"
                    >
                      <Upload className="w-4 h-4 text-classic-navy" />
                      <span>Upload Watermark Image / Logo</span>
                    </button>
                  )}
                </div>
              )}

              {/* Size and Transparency Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-classic-border/60">
                {/* Size Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-classic-text-secondary font-semibold">
                    <span>Watermark Size:</span>
                    <span className="font-mono font-bold text-classic-navy">{watermarkSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={watermarkType === 'image' ? 80 : 28}
                    max={watermarkType === 'image' ? 600 : 130}
                    step={watermarkType === 'image' ? 10 : 2}
                    value={watermarkSize}
                    onChange={(e) => setWatermarkSize(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-classic-navy"
                  />
                </div>

                {/* Transparency / Opacity Slider */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-classic-text-secondary font-semibold">
                    <span>Transparency (Opacity):</span>
                    <span className="font-mono font-bold text-classic-navy">{Math.round(watermarkOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={40}
                    step={1}
                    value={Math.round(watermarkOpacity * 100)}
                    onChange={(e) => setWatermarkOpacity((parseInt(e.target.value, 10) || 6) / 100)}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-classic-navy"
                  />
                </div>
              </div>

              {/* Angle / Rotation Selector */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-xs text-classic-text-secondary font-semibold">
                  <span>Orientation / Angle:</span>
                  <span className="font-mono font-bold text-classic-navy">{watermarkRotation}°</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '-30° Diagonal', angle: -30 },
                    { label: '-45° Steep', angle: -45 },
                    { label: '0° Horizontal', angle: 0 },
                    { label: '-90° Vertical', angle: -90 },
                  ].map((item) => (
                    <button
                      key={item.angle}
                      type="button"
                      onClick={() => setWatermarkRotation(item.angle)}
                      className={`py-1 text-xs font-mono font-bold rounded border transition-all ${
                        watermarkRotation === item.angle
                          ? 'bg-classic-navy text-white border-classic-navy shadow-sm'
                          : 'bg-white text-classic-text-secondary border-classic-border hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Running Page Header Configuration */}
        <div className="p-4 rounded-classic bg-classic-surface-muted border border-classic-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlignJustify className="w-4 h-4 text-classic-navy" />
              <span className="text-xs font-bold text-classic-navy">Running Page Header (Print &amp; PDF)</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showPageHeader}
                onChange={(e) => setShowPageHeader(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-classic-navy"></div>
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-classic-text-secondary">
              Header Content / Template:
            </label>
            <input
              type="text"
              value={customPageHeader}
              onChange={(e) => setCustomPageHeader(e.target.value)}
              placeholder="{SCHOOL} | {EXAM} - {CODE}"
              className="w-full classic-input rounded-classic px-3 py-2 text-xs"
            />
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-classic-text-muted font-semibold mr-1">Insert Tag:</span>
              {[
                { tag: '{SCHOOL}', label: 'School' },
                { tag: '{EXAM}', label: 'Exam' },
                { tag: '{CODE}', label: 'Code' },
                { tag: '{CLASS}', label: 'Class' },
                { tag: '{SUBJECT}', label: 'Subject' },
                { tag: '{DATE}', label: 'Date' },
              ].map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => setCustomPageHeader((prev) => (prev ? `${prev} | ${t.tag}` : t.tag))}
                  className="px-2 py-0.5 rounded-classic text-xs font-mono font-semibold bg-white hover:bg-classic-navy hover:text-white text-classic-navy border border-classic-border shadow-sm transition-colors"
                >
                  {t.tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Running Page Footer Configuration */}
        <div className="p-4 rounded-classic bg-classic-surface-muted border border-classic-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlignJustify className="w-4 h-4 text-classic-navy" />
              <span className="text-xs font-bold text-classic-navy">Running Page Footer (Print &amp; PDF)</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={showPageFooter}
                onChange={(e) => setShowPageFooter(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-classic-navy"></div>
            </label>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-classic-text-secondary">
              Footer Content / Template:
            </label>
            <input
              type="text"
              value={customPageFooter}
              onChange={(e) => setCustomPageFooter(e.target.value)}
              placeholder="{SCHOOL} | {EXAM} | Page {PAGE}"
              className="w-full classic-input rounded-classic px-3 py-2 text-xs"
            />
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-classic-text-muted font-semibold mr-1">Insert Tag:</span>
              {[
                { tag: '{SCHOOL}', label: 'School' },
                { tag: '{EXAM}', label: 'Exam' },
                { tag: '{CODE}', label: 'Code' },
                { tag: '{PAGE}', label: 'Page Number' },
              ].map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => setCustomPageFooter((prev) => (prev ? `${prev} | ${t.tag}` : t.tag))}
                  className="px-2 py-0.5 rounded-classic text-xs font-mono font-semibold bg-white hover:bg-classic-navy hover:text-white text-classic-navy border border-classic-border shadow-sm transition-colors"
                >
                  {t.tag}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomPageFooter('{SCHOOL} | {EXAM} | Page {PAGE}')}
                className="px-2 py-0.5 rounded-classic text-xs font-semibold bg-white hover:bg-slate-100 text-classic-text-secondary border border-classic-border shadow-sm transition-colors ml-auto"
              >
                Reset Footer
              </button>
            </div>
          </div>
        </div>

        {/* Live Template Dynamic Tags Guide */}
        <div className="p-3 rounded-classic bg-classic-surface-muted border border-classic-border text-xs space-y-1 text-classic-text-secondary">
          <span className="font-bold text-classic-navy">Supported Dynamic Replacement Tags:</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
            <div className="p-1.5 rounded-classic bg-white border border-classic-border">
              <span className="text-classic-navy font-bold">{'{SCHOOL}'}</span>: School Name
            </div>
            <div className="p-1.5 rounded-classic bg-white border border-classic-border">
              <span className="text-classic-navy font-bold">{'{EXAM}'}</span>: Exam Title
            </div>
            <div className="p-1.5 rounded-classic bg-white border border-classic-border">
              <span className="text-classic-navy font-bold">{'{CODE}'}</span>: Exam Code
            </div>
            <div className="p-1.5 rounded-classic bg-white border border-classic-border">
              <span className="text-emerald-800 font-bold">{'{PAGE}'}</span>: Current Page
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-classic-border text-xs">
          <button
            type="button"
            onClick={onClose}
            className="classic-button-secondary rounded-classic px-4 py-2 font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="classic-button-primary rounded-classic px-5 py-2.5 font-bold shadow-classic flex items-center space-x-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Save &amp; Apply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
