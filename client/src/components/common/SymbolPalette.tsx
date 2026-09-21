import React, { useState, useEffect } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';

export interface SymbolItem {
  label: string;
  latex: string;
  unicode?: string;
}

export interface SymbolCategory {
  id: string;
  name: string;
  symbols: SymbolItem[];
}

interface SymbolPaletteProps {
  onSelectSymbol: (latex: string) => void;
  className?: string;
}

export const SymbolPalette: React.FC<SymbolPaletteProps> = ({ onSelectSymbol, className = '' }) => {
  const [categories, setCategories] = useState<SymbolCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('arithmetic');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSymbols = async () => {
      try {
        const res = await api.get('/scientific/symbols');
        if (res.data?.categories) {
          setCategories(res.data.categories);
          if (res.data.categories.length > 0) {
            setActiveCategory(res.data.categories[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch symbols from backend, using fallback palette:', err);
        // Fallback default categories
        setCategories([
          {
            id: 'arithmetic',
            name: 'Arithmetic',
            symbols: [
              { label: '+', latex: '+' },
              { label: '−', latex: '-' },
              { label: '×', latex: '\\times' },
              { label: '÷', latex: '\\div' },
              { label: '=', latex: '=' },
              { label: '≠', latex: '\\neq' },
              { label: '±', latex: '\\pm' },
              { label: '%', latex: '\\%' },
            ],
          },
          {
            id: 'algebra',
            name: 'Algebra',
            symbols: [
              { label: '√x', latex: '\\sqrt{x}' },
              { label: '∛x', latex: '\\sqrt[3]{x}' },
              { label: 'x²', latex: 'x^2' },
              { label: 'x³', latex: 'x^3' },
              { label: 'xⁿ', latex: 'x^n' },
              { label: 'x₁', latex: 'x_1' },
              { label: 'a/b', latex: '\\frac{a}{b}' },
              { label: '∝', latex: '\\propto' },
              { label: '≈', latex: '\\approx' },
            ],
          },
          {
            id: 'greek',
            name: 'Greek',
            symbols: [
              { label: 'α', latex: '\\alpha' },
              { label: 'β', latex: '\\beta' },
              { label: 'γ', latex: '\\gamma' },
              { label: 'θ', latex: '\\theta' },
              { label: 'λ', latex: '\\lambda' },
              { label: 'μ', latex: '\\mu' },
              { label: 'π', latex: '\\pi' },
              { label: 'σ', latex: '\\sigma' },
              { label: 'ω', latex: '\\omega' },
              { label: 'Δ', latex: '\\Delta' },
              { label: 'Ω', latex: '\\Omega' },
            ],
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchSymbols();
  }, []);

  // Filter symbols based on search
  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      symbols: cat.symbols.filter(
        (s) =>
          s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.latex.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.unicode && s.unicode.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    }))
    .filter((cat) => cat.symbols.length > 0);

  const displayCategory = searchQuery
    ? null
    : categories.find((c) => c.id === activeCategory);

  return (
    <div className={`flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden ${className}`}>
      {/* Search Bar */}
      <div className="p-2 border-b border-slate-800 bg-slate-950/80 flex items-center space-x-2">
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search symbols (e.g. sqrt, theta, ohm, integral)..."
          className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full font-mono"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-[10px] text-slate-400 hover:text-white px-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Pills (when not searching) */}
      {!searchQuery && (
        <div className="flex items-center space-x-1 p-2 overflow-x-auto border-b border-slate-800 bg-slate-950/40 text-[11px] scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Symbols Grid */}
      <div className="p-2.5 max-h-56 overflow-y-auto space-y-3">
        {loading ? (
          <div className="text-center py-6 text-xs text-slate-500 flex items-center justify-center space-x-2">
            <Sparkles className="w-4 h-4 animate-spin text-violet-400" />
            <span>Loading scientific symbol palette...</span>
          </div>
        ) : searchQuery ? (
          filteredCategories.length > 0 ? (
            filteredCategories.map((cat) => (
              <div key={cat.id} className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                  {cat.name}
                </span>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                  {cat.symbols.map((sym, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSelectSymbol(sym.latex)}
                      title={`${sym.label} (${sym.latex})`}
                      className="p-1.5 bg-slate-800/80 hover:bg-violet-600 hover:text-white rounded-lg border border-slate-700/60 text-center font-mono text-xs text-slate-200 transition-all flex flex-col items-center justify-center shadow-sm active:scale-95"
                    >
                      <span>{sym.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-slate-500 font-mono">
              No symbols matching "{searchQuery}"
            </div>
          )
        ) : (
          displayCategory && (
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
              {displayCategory.symbols.map((sym, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectSymbol(sym.latex)}
                  title={`${sym.label} (${sym.latex})`}
                  className="p-1.5 bg-slate-800/80 hover:bg-violet-600 hover:text-white rounded-lg border border-slate-700/60 text-center font-mono text-xs text-slate-200 transition-all flex flex-col items-center justify-center shadow-sm active:scale-95"
                >
                  <span>{sym.label}</span>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
