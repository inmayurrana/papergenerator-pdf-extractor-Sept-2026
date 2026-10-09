import React from 'react';
import { Maximize2, Check } from 'lucide-react';

export interface PageMarginsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageMargin: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  onApplyMargins: (top: number, bottom: number, left: number, right: number) => void;
}

export const PageMarginsModal: React.FC<PageMarginsModalProps> = ({
  isOpen,
  onClose,
  pageMargin,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  onApplyMargins,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white border border-classic-border rounded-classic w-full max-w-xl p-6 shadow-2xl space-y-5 animate-fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-classic-border">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-classic bg-classic-surface-muted text-classic-navy flex items-center justify-center border border-classic-border">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-classic-navy">
                Page Setup: Margins (Print &amp; PDF)
              </h2>
              <p className="text-xs text-classic-text-muted">
                Customize boundary margins for screen preview, PDF export, and Word documents
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

        {/* Quick Presets Grid */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-classic-text">Quick Margins Presets:</label>
          <div className="grid grid-cols-5 gap-2">
            {[
              { id: 'zero', label: 'Eco Zero', t: 4, b: 4, l: 5, r: 5, desc: '4mm' },
              { id: 'narrow', label: 'Narrow', t: 8, b: 8, l: 10, r: 10, desc: '8mm' },
              { id: 'normal', label: 'Normal', t: 15, b: 15, l: 18, r: 18, desc: '15mm' },
              { id: 'wide', label: 'Wide', t: 25, b: 25, l: 25, r: 25, desc: '25mm' },
              { id: 'binding', label: 'Binding', t: 15, b: 15, l: 25, r: 15, desc: '25mm L' },
            ].map((preset) => {
              const isCur = pageMargin === preset.id || (
                pageMargin === 'custom' &&
                marginLeft === preset.l &&
                marginRight === preset.r &&
                marginTop === preset.t &&
                marginBottom === preset.b
              );
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onApplyMargins(preset.t, preset.b, preset.l, preset.r)}
                  className={`p-2 rounded-classic text-center border transition-all ${
                    isCur
                      ? 'bg-classic-navy border-classic-navy text-white shadow-classic'
                      : 'bg-white hover:bg-classic-surface-muted text-classic-text-secondary border-classic-border'
                  }`}
                >
                  <div className="text-xs font-bold">{preset.label}</div>
                  <div className="text-xs opacity-70 font-mono mt-0.5">{preset.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visual Page Margin Preview & Numeric Steppers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-classic-surface-muted p-4 rounded-classic border border-classic-border">
          {/* Visual Diagram Preview */}
          <div className="flex flex-col items-center justify-center p-2">
            <span className="text-xs text-classic-text-secondary font-semibold mb-2">Live Page Boundary Representation:</span>
            <div
              className="w-36 h-48 bg-white rounded-classic shadow-classic border border-classic-border relative flex flex-col justify-between"
              style={{
                paddingTop: `${Math.min(30, Math.max(4, marginTop * 0.8))}px`,
                paddingBottom: `${Math.min(30, Math.max(4, marginBottom * 0.8))}px`,
                paddingLeft: `${Math.min(30, Math.max(4, marginLeft * 0.8))}px`,
                paddingRight: `${Math.min(30, Math.max(4, marginRight * 0.8))}px`,
              }}
            >
              <div className="w-full h-full border border-dashed border-classic-navy bg-blue-50/50 rounded-classic flex flex-col items-center justify-center text-xs font-mono text-classic-navy font-bold select-none text-center p-1">
                <span>Printable Body</span>
                <span className="text-xs font-normal opacity-80 mt-0.5">{marginLeft}L &bull; {marginRight}R</span>
              </div>
            </div>
          </div>

          {/* 4 Inputs */}
          <div className="space-y-2.5">
            {/* Left Margin (Binding Side) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-classic-text">
                <span>Left Margin (Binding/Punch):</span>
                <span className="font-mono text-classic-navy font-bold">{marginLeft} mm</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => onApplyMargins(marginTop, marginBottom, Math.max(0, marginLeft - 1), marginRight)}
                  className="w-8 h-8 rounded-classic bg-white hover:bg-slate-100 text-classic-navy border border-classic-border font-bold text-sm shadow-sm"
                >-</button>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={marginLeft}
                  onChange={(e) => onApplyMargins(marginTop, marginBottom, parseInt(e.target.value, 10) || 0, marginRight)}
                  className="w-full bg-white border border-classic-border rounded-classic text-center text-sm font-mono font-bold text-classic-text py-1 focus:outline-none focus:border-classic-navy"
                />
                <button
                  type="button"
                  onClick={() => onApplyMargins(marginTop, marginBottom, Math.min(60, marginLeft + 1), marginRight)}
                  className="w-8 h-8 rounded-classic bg-white hover:bg-slate-100 text-classic-navy border border-classic-border font-bold text-sm shadow-sm"
                >+</button>
              </div>
            </div>

            {/* Right Margin */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-classic-text">
                <span>Right Margin:</span>
                <span className="font-mono text-classic-navy font-bold">{marginRight} mm</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => onApplyMargins(marginTop, marginBottom, marginLeft, Math.max(0, marginRight - 1))}
                  className="w-8 h-8 rounded-classic bg-white hover:bg-slate-100 text-classic-navy border border-classic-border font-bold text-sm shadow-sm"
                >-</button>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={marginRight}
                  onChange={(e) => onApplyMargins(marginTop, marginBottom, marginLeft, parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-white border border-classic-border rounded-classic text-center text-sm font-mono font-bold text-classic-text py-1 focus:outline-none focus:border-classic-navy"
                />
                <button
                  type="button"
                  onClick={() => onApplyMargins(marginTop, marginBottom, marginLeft, Math.min(60, marginRight + 1))}
                  className="w-8 h-8 rounded-classic bg-white hover:bg-slate-100 text-classic-navy border border-classic-border font-bold text-sm shadow-sm"
                >+</button>
              </div>
            </div>

            {/* Top Margin */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-classic-text">
                <span>Top Margin:</span>
                <span className="font-mono text-classic-navy font-bold">{marginTop} mm</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => onApplyMargins(Math.max(0, marginTop - 1), marginBottom, marginLeft, marginRight)}
                  className="w-8 h-8 rounded-classic bg-white hover:bg-slate-100 text-classic-navy border border-classic-border font-bold text-sm shadow-sm"
                >-</button>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={marginTop}
                  onChange={(e) => onApplyMargins(parseInt(e.target.value, 10) || 0, marginBottom, marginLeft, marginRight)}
                  className="w-full bg-white border border-classic-border rounded-classic text-center text-sm font-mono font-bold text-classic-text py-1 focus:outline-none focus:border-classic-navy"
                />
                <button
                  type="button"
                  onClick={() => onApplyMargins(Math.min(60, marginTop + 1), marginBottom, marginLeft, marginRight)}
                  className="w-8 h-8 rounded-classic bg-white hover:bg-slate-100 text-classic-navy border border-classic-border font-bold text-sm shadow-sm"
                >+</button>
              </div>
            </div>

            {/* Bottom Margin */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-classic-text">
                <span>Bottom Margin:</span>
                <span className="font-mono text-classic-navy font-bold">{marginBottom} mm</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => onApplyMargins(marginTop, Math.max(0, marginBottom - 1), marginLeft, marginRight)}
                  className="w-8 h-8 rounded-classic bg-white hover:bg-slate-100 text-classic-navy border border-classic-border font-bold text-sm shadow-sm"
                >-</button>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={marginBottom}
                  onChange={(e) => onApplyMargins(marginTop, parseInt(e.target.value, 10) || 0, marginLeft, marginRight)}
                  className="w-full bg-white border border-classic-border rounded-classic text-center text-sm font-mono font-bold text-classic-text py-1 focus:outline-none focus:border-classic-navy"
                />
                <button
                  type="button"
                  onClick={() => onApplyMargins(marginTop, Math.min(60, marginBottom + 1), marginLeft, marginRight)}
                  className="w-8 h-8 rounded-classic bg-white hover:bg-slate-100 text-classic-navy border border-classic-border font-bold text-sm shadow-sm"
                >+</button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-classic-border text-xs">
          <span className="text-classic-text-muted text-xs">
            💡 Tip: Set Left margin to 25mm if stapling or punch-binding exams.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="classic-button-primary rounded-classic px-5 py-2.5 font-bold shadow-classic flex items-center space-x-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Apply &amp; Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
