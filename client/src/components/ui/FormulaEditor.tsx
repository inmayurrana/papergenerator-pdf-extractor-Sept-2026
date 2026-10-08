import React, { useState } from 'react';
import { MathRenderer } from '../common/MathRenderer';
import { SymbolPalette } from '../common/SymbolPalette';
import { Button } from './Button';
import { Tabs } from './Tabs';
import { Code, Eye, Sparkles } from 'lucide-react';

export interface FormulaEditorProps {
  initialLatex: string;
  onSave: (latex: string) => void;
  onCancel?: () => void;
  className?: string;
}

export const FormulaEditor: React.FC<FormulaEditorProps> = ({
  initialLatex,
  onSave,
  onCancel,
  className = '',
}) => {
  const [latex, setLatex] = useState(initialLatex);
  const [activeTab, setActiveTab] = useState('PALETTE');

  const handleInsertSymbol = (symbolLatex: string) => {
    setLatex((prev) => {
      let clean = prev.trim();
      const hasWrap = clean.startsWith('$') && clean.endsWith('$');
      if (hasWrap) clean = clean.slice(1, -1);
      clean += (clean.length > 0 && !clean.endsWith(' ') ? ' ' : '') + symbolLatex;
      return hasWrap ? `$${clean}$` : clean;
    });
  };

  return (
    <div className={`space-y-4 bg-white border border-classic-border rounded-card p-5 shadow-classic text-left ${className}`}>
      {/* Live Preview Box */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-classic-text-secondary">
          Live KaTeX Mathematical Preview
        </label>
        <div className="min-h-[80px] p-4 bg-slate-50 border border-classic-border rounded-classic flex items-center justify-center overflow-x-auto text-classic-text-primary text-base">
          <MathRenderer content={latex.startsWith('$') ? latex : `$${latex}$`} />
        </div>
      </div>

      {/* LaTeX Input Area */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-classic-text-secondary">
            LaTeX Expression Code
          </label>
          <span className="text-[11px] text-classic-text-muted font-mono">
            Wrap with $ or raw code
          </span>
        </div>
        <textarea
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
          rows={3}
          className="w-full bg-white text-classic-text-primary border border-classic-border rounded-classic p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-700"
          placeholder="\frac{a}{b} = c"
        />
      </div>

      {/* Symbol Palette Tabs */}
      <div className="space-y-2 border-t border-classic-border-light pt-3">
        <Tabs
          tabs={[
            { id: 'PALETTE', label: 'Symbol Palette', icon: Sparkles },
            { id: 'RAW', label: 'Raw Preview', icon: Code },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="underline"
        />

        {activeTab === 'PALETTE' && (
          <div className="pt-2">
            <SymbolPalette onSelectSymbol={handleInsertSymbol} />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-classic-border">
        {onCancel && (
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button variant="primary" size="sm" onClick={() => onSave(latex)}>
          Save Formula
        </Button>
      </div>
    </div>
  );
};
