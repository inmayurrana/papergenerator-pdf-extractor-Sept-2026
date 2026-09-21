import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  RefreshCw,
  Eye,
  Code,
  Sparkles,
  AlertTriangle,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { MathRenderer } from './MathRenderer';
import { SymbolPalette } from './SymbolPalette';
import { api } from '../../lib/api';

interface FormulaEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (editedLatex: string, meta?: any) => void;
  initialLatex?: string;
  originalCropUrl?: string;
  cropBbox?: number[];
  initialConfidence?: any;
  initialAst?: any;
  initialMode?: string;
}

export const FormulaEditorModal: React.FC<FormulaEditorModalProps> = ({
  isOpen,
  onClose,
  onAccept,
  initialLatex = '',
  originalCropUrl,
  cropBbox,
  initialConfidence,
  initialAst,
  initialMode = 'MATH',
}) => {
  const [latex, setLatex] = useState<string>(initialLatex);
  const [activeTab, setActiveTab] = useState<'PALETTE' | 'MATHML' | 'AST' | 'OVERLAY'>('PALETTE');
  const [mode, setMode] = useState<string>(initialMode);
  const [validating, setValidating] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<any>(initialConfidence);
  const [ast, setAst] = useState<any>(initialAst);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.5);

  useEffect(() => {
    setLatex(initialLatex);
    setConfidence(initialConfidence);
    setAst(initialAst);
    setMode(initialMode);
  }, [initialLatex, initialConfidence, initialAst, initialMode]);

  if (!isOpen) return null;

  const handleInsertSymbol = (symbolLatex: string) => {
    setLatex((prev) => {
      // Clean display wrappers if present
      let clean = prev.trim();
      const hasWrap = clean.startsWith('$') && clean.endsWith('$');
      if (hasWrap) clean = clean.slice(1, -1);
      clean += (clean.length > 0 && !clean.endsWith(' ') ? ' ' : '') + symbolLatex;
      return hasWrap ? `$${clean}$` : clean;
    });
  };

  const handleValidateVisually = async () => {
    setValidating(true);
    try {
      const res = await api.post('/scientific/validate', {
        latex,
        cropPath: originalCropUrl,
        mode,
      });
      if (res.data?.data) {
        setConfidence(res.data.data);
      }
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setValidating(false);
    }
  };

  const handleReprocessWithMode = async (targetMode: string) => {
    setValidating(true);
    try {
      const res = await api.post('/scientific/recognize', {
        cropPath: originalCropUrl,
        ocrText: latex,
        mode: targetMode,
      });
      if (res.data?.data) {
        setLatex(res.data.data.latex || latex);
        setConfidence(res.data.data.confidence);
        setAst(res.data.data.structured_ast);
        setMode(targetMode);
      }
    } catch (err: any) {
      alert(`Reprocessing failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setValidating(false);
    }
  };

  const overallScore = Math.round((confidence?.overall_confidence || 0.90) * 100);
  const isHighConfidence = overallScore >= 85;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Scientific Formula & Equation Editor</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30">
                  {mode}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Visual KaTeX rendering &bull; AST Expression Tree &bull; Multi-Scale Validation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Comparison Panel: Original Image vs Rendered Formula */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original Crop */}
            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Original Source Crop
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Source of Truth</span>
              </div>
              <div className="flex items-center justify-center min-h-[90px] bg-slate-900/50 rounded-lg p-2 border border-slate-800/60 overflow-hidden">
                {originalCropUrl ? (
                  <img
                    src={originalCropUrl}
                    alt="Original Formula Crop"
                    className="max-h-24 max-w-full object-contain rounded"
                  />
                ) : (
                  <span className="text-xs text-slate-600 font-mono">No image crop attached</span>
                )}
              </div>
            </div>

            {/* Live Rendered LaTeX */}
            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Rendered Mathematical Output
                </span>
                <div className="flex items-center space-x-1.5">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isHighConfidence
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {overallScore}% Match
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center min-h-[90px] bg-slate-900/50 rounded-lg p-2 border border-slate-800/60 text-center">
                <div className="text-lg text-white font-medium">
                  <MathRenderer content={latex || 'x = 0'} />
                </div>
              </div>
            </div>
          </div>

          {/* LaTeX Input / Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Code className="w-3.5 h-3.5 text-violet-400" />
                <span>LaTeX Source Code</span>
              </label>
              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={handleValidateVisually}
                  disabled={validating}
                  className="text-violet-400 hover:text-violet-300 flex items-center space-x-1 text-[11px] font-medium"
                >
                  <RefreshCw className={`w-3 h-3 ${validating ? 'animate-spin' : ''}`} />
                  <span>Re-Validate Visual Match</span>
                </button>
              </div>
            </div>
            <textarea
              rows={2}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              placeholder="e.g. 10\sqrt{3}\,\mathrm{g} or \frac{v}{\sin\theta}"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-violet-500 transition-all"
            />
            {/* Quick Fraction Templates */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mr-1">Fractions:</span>
              {[
                { label: 'a/b', val: '\\frac{a}{b}' },
                { label: '(a/b) F', val: '\\left( \\frac{a}{b} \\right) F' },
                { label: '(M₁+M₂)/(M₁+M₂+M₃) F', val: '\\left( \\frac{M_{1}+M_{2}}{M_{1}+M_{2}+M_{3}} \\right) F' },
                { label: '1 ½', val: '1\\,\\frac{1}{2}' },
                { label: '√(a/b)', val: '\\sqrt{\\frac{a}{b}}' },
                { label: '√a / b', val: '\\frac{\\sqrt{a}}{b}' },
                { label: '(a/b)/c', val: '\\frac{\\frac{a}{b}}{c}' },
              ].map((tmpl) => (
                <button
                  key={tmpl.label}
                  type="button"
                  onClick={() => setLatex(tmpl.val)}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-violet-900/40 text-slate-300 hover:text-violet-300 border border-slate-800 text-[10px] font-mono transition-all"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs: Symbol Palette | Overlay Mode | AST Tree | MathML */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('PALETTE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'PALETTE'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Symbol Palette (15 Categories)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('OVERLAY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'OVERLAY'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Original Overlay Mode</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('AST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'AST'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Structural AST Tree
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('MATHML')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'MATHML'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                MathML Output
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'PALETTE' && (
              <SymbolPalette onSelectSymbol={handleInsertSymbol} />
            )}

            {activeTab === 'OVERLAY' && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold">Overlay Opacity Slider:</span>
                  <span className="font-mono text-violet-400 font-bold">{Math.round(overlayOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                  className="w-full accent-violet-500 cursor-pointer"
                />
                <div className="relative min-h-[120px] bg-slate-900 rounded-lg p-3 flex items-center justify-center overflow-hidden border border-slate-800">
                  {originalCropUrl && (
                    <img
                      src={originalCropUrl}
                      alt="Crop Underlay"
                      className="absolute max-h-24 max-w-full object-contain pointer-events-none transition-opacity"
                      style={{ opacity: overlayOpacity }}
                    />
                  )}
                  <div
                    className="relative text-xl text-emerald-400 font-bold select-none transition-opacity"
                    style={{ opacity: 1 - overlayOpacity * 0.3 }}
                  >
                    <MathRenderer content={latex} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Slide opacity to verify radical bounds, division line horizontal positions, and superscript alignments directly over the source crop.
                </p>
              </div>
            )}

            {activeTab === 'AST' && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <pre className="text-[11px] font-mono text-violet-300 overflow-x-auto max-h-48">
                  {JSON.stringify(ast || { note: 'No AST generated yet' }, null, 2)}
                </pre>
              </div>
            )}

            {activeTab === 'MATHML' && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {confidence?.mathml || `<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow><mi>${latex}</mi></mrow></math>`}
                </pre>
              </div>
            )}
          </div>

          {/* Mode Switcher & Reprocess Toolbar */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-400">
              Reprocess with Engine:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {['MATH', 'PHYSICS', 'CHEMISTRY', 'FRACTION', 'AUTO'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleReprocessWithMode(m)}
                  disabled={validating}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all active:scale-95"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            Cancel
          </button>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => onAccept(latex, { confidence, ast, mode })}
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-5 py-2 rounded-xl shadow-lg shadow-violet-600/20 flex items-center space-x-1.5 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Accept & Apply Formula</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
