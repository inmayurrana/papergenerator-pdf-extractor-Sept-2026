import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

// Map unicode symbols to LaTeX equivalents
const UNICODE_MATH_MAP: Record<string, string> = {
  // Greek Lowercase
  'α': '\\alpha ', 'β': '\\beta ', 'γ': '\\gamma ', 'δ': '\\delta ',
  'ε': '\\epsilon ', 'ϵ': '\\varepsilon ', 'ζ': '\\zeta ', 'η': '\\eta ',
  'θ': '\\theta ', 'ϑ': '\\vartheta ', 'ι': '\\iota ', 'κ': '\\kappa ',
  'λ': '\\lambda ', 'μ': '\\mu ', 'ν': '\\nu ', 'ξ': '\\xi ',
  'π': '\\pi ', 'ϖ': '\\varpi ', 'ρ': '\\rho ', 'ϱ': '\\varrho ',
  'σ': '\\sigma ', 'ς': '\\varsigma ', 'τ': '\\tau ', 'υ': '\\upsilon ',
  'φ': '\\phi ', 'ϕ': '\\varphi ', 'χ': '\\chi ', 'ψ': '\\psi ', 'ω': '\\omega ',
  // Greek Uppercase
  'Γ': '\\Gamma ', 'Δ': '\\Delta ', 'Θ': '\\Theta ', 'Λ': '\\Lambda ',
  'Ξ': '\\Xi ', 'Π': '\\Pi ', 'Σ': '\\Sigma ', 'Υ': '\\Upsilon ',
  'Φ': '\\Phi ', 'Ψ': '\\Psi ', 'Ω': '\\Omega ',
  // Operators & Relations
  '±': '\\pm ', '∓': '\\mp ', '×': '\\times ', '✕': '\\times ', '✖': '\\times ',
  '÷': '\\div ', '·': '\\cdot ', '•': '\\cdot ', '∙': '\\cdot ',
  '≠': '\\neq ', '≤': '\\le ', '⩽': '\\le ', '≥': '\\ge ', '⩾': '\\ge ',
  '≈': '\\approx ', '≃': '\\simeq ', '≅': '\\cong ', '≡': '\\equiv ',
  '∞': '\\infty ', '∝': '\\propto ', '∼': '\\sim ',
  // Calculus & Sets
  '∂': '\\partial ', '∇': '\\nabla ', '∫': '\\int ', '∬': '\\iint ', '∭': '\\iiint ', '∮': '\\oint ',
  '∑': '\\sum ', '∏': '\\prod ',
  '∈': '\\in ', '∉': '\\notin ', '∋': '\\ni ',
  '⊂': '\\subset ', '⊃': '\\supset ', '⊆': '\\subseteq ', '⊇': '\\supseteq ',
  '∪': '\\cup ', '∩': '\\cap ', '∅': '\\emptyset ',
  '∀': '\\forall ', '∃': '\\exists ', '∄': '\\nexists ',
  '∴': '\\therefore ', '∵': '\\because ',
  // Geometry & Arrows
  '⊥': '\\perp ', '∥': '\\parallel ', '∠': '\\angle ', '°': '^\\circ ',
  '→': '\\to ', '⟶': '\\to ', '←': '\\leftarrow ', '⟵': '\\leftarrow ',
  '⇒': '\\implies ', '⇔': '\\iff ', '↔': '\\leftrightarrow ',
  // Number Sets
  'ℝ': '\\mathbb{R}', 'ℂ': '\\mathbb{C}', 'ℕ': '\\mathbb{N}',
  'ℤ': '\\mathbb{Z}', 'ℚ': '\\mathbb{Q}',
  // Fractions
  '½': '\\frac{1}{2}', '⅓': '\\frac{1}{3}', '⅔': '\\frac{2}{3}',
  '¼': '\\frac{1}{4}', '¾': '\\frac{3}{4}', '⅕': '\\frac{1}{5}',
  '⅖': '\\frac{2}{5}', '⅗': '\\frac{3}{5}', '⅘': '\\frac{4}{5}',
  '⅙': '\\frac{1}{6}', '⅚': '\\frac{5}{6}', '⅛': '\\frac{1}{8}',
  '⅜': '\\frac{3}{8}', '⅝': '\\frac{5}{8}', '⅞': '\\frac{7}{8}',
};

const SUP_MAP: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')',
  'ⁿ': 'n', 'ⁱ': 'i', 'ˣ': 'x', 'ʸ': 'y'
};

const SUB_MAP: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')',
  'ₐ': 'a', 'ₑ': 'e', 'ₒ': 'o', 'ₓ': 'x', 'ᵤ': 'u', 'ᵥ': 'v'
};

function normalizeMathString(str: string): string {
  let s = str.replace(/\u2212/g, '-').replace(/\u2013/g, '-');

  // Replace unicode Greek and math symbols that sneak into LaTeX math blocks
  for (const [sym, ltx] of Object.entries(UNICODE_MATH_MAP)) {
    if (s.includes(sym)) {
      s = s.split(sym).join(ltx);
    }
  }

  // Ensure spacing after \pi or greek letters if followed by alphanumeric
  s = s.replace(/\\(pi|alpha|beta|gamma|delta|theta|lambda|mu|sigma|omega)([a-zA-Z0-9])/g, '\\$1 $2');

  // Superscripts e.g. x² -> x^{2}
  s = s.replace(/([a-zA-Z0-9\)])([\u2070\u00B9\u00B2\u00B3\u2074-\u2079\u207A\u207B\u207C\u207D\u207E\u207F\u2071]+)/g, (_, base, sups) => {
    const translated = sups.split('').map((c: string) => SUP_MAP[c] || c).join('');
    return `${base}^{${translated}}`;
  });

  // Subscripts e.g. a₁ -> a_{1}
  s = s.replace(/([a-zA-Z0-9\)])([\u2080-\u208E\u2090-\u209C]+)/g, (_, base, subs) => {
    const translated = subs.split('').map((c: string) => SUB_MAP[c] || c).join('');
    return `${base}_{${translated}}`;
  });

  // Radicals e.g. √x
  s = s.replace(/\u221C\(([^)]+)\)/g, '\\sqrt[4]{$1}');
  s = s.replace(/\u221C([a-zA-Z0-9]+)/g, '\\sqrt[4]{$1}');
  s = s.replace(/\u221B\(([^)]+)\)/g, '\\sqrt[3]{$1}');
  s = s.replace(/\u221B([a-zA-Z0-9]+)/g, '\\sqrt[3]{$1}');
  s = s.replace(/(?:\u221A|sqrt)\(([^)]+)\)/gi, '\\sqrt{$1}');
  s = s.replace(/\u221A([a-zA-Z0-9]+)/g, '\\sqrt{$1}');

  // Degree symbol: 30° -> 30^\circ
  s = s.replace(/(\d+)\s*\u00B0/g, '$1^\\circ');

  // Collapse duplicate backslashes before LaTeX macros (e.g. \\theta -> \theta)
  s = s.replace(/\\{2,}(theta|Theta|thita|Thita|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|sin|cos|tan|cot|sec|csc|cosec|frac|sqrt|times|pm|div|approx|le|ge|neq|circ|infty)\b/g, '\\$1');

  // Fix \thita typo
  s = s.replace(/\\thita\b/gi, '\\theta');
  s = s.replace(/\\Thita\b/g, '\\Theta');

  // Convert plain 'pi' in math mode to '\pi' e.g. '8 pi' -> '8 \pi ' or '4pi' -> '4\pi '
  s = s.replace(/(\d+)\s*pi\b/gi, '$1 \\pi ');
  s = s.replace(/(^|[\s\+\-\*\/\=\(])pi\b/gi, '$1\\pi ');

  // Convert plain 'theta' or 'thita' in math mode to '\theta'
  s = s.replace(/(?<!\\)\b(sin|cos|tan|cot|sec|csc|cosec)\s*(?:theta|thita|0)\b/gi, '\\$1\\theta');
  s = s.replace(/(?<!\\)\b(sin|cos|tan|cot|sec|csc|cosec)\s*θ\b/gi, '\\$1\\theta');
  s = s.replace(/\\(sin|cos|tan|cot|sec|csc|cosec)\s*\\?theta\b/gi, '\\$1\\theta');
  s = s.replace(/(^|[\s\+\-\*\/\=\(\,\.\;\:\<\>\!\?\[\]])(?<!\\)(?:theta|thita)\b/gi, '$1\\theta ');
  s = s.replace(/(^|[\s\+\-\*\/\=\(\,\.\;\:\<\>\!\?\[\]])(?<!\\)(?:Theta|Thita)\b/g, '$1\\Theta ');

  // Other common Greek words in math mode
  s = s.replace(/(^|[\s\+\-\*\/\=\(])(?<!\\)alpha\b/gi, '$1\\alpha ');
  s = s.replace(/(^|[\s\+\-\*\/\=\(])(?<!\\)beta\b/gi, '$1\\beta ');
  s = s.replace(/(^|[\s\+\-\*\/\=\(])(?<!\\)gamma\b/gi, '$1\\gamma ');
  s = s.replace(/(^|[\s\+\-\*\/\=\(])(?<!\\)delta\b/gi, '$1\\delta ');
  s = s.replace(/(^|[\s\+\-\*\/\=\(])(?<!\\)lambda\b/gi, '$1\\lambda ');
  s = s.replace(/(^|[\s\+\-\*\/\=\(])(?<!\\)omega\b/gi, '$1\\omega ');

  // Final pass on double backslashes in math mode
  s = s.replace(/\\{2,}(theta|Theta|thita|Thita|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|sin|cos|tan|cot|sec|csc|cosec|frac|sqrt|times|pm|div|approx|le|ge|neq|circ|infty)\b/g, '\\$1');

  // Self-heal corrupted fraction patterns e.g. \frac{\frac{dr/dt}} or \frac{dr/dt}
  s = s.replace(/\\frac\{\\frac\{d([A-Za-z])\s*\/\s*d([A-Za-z])\}\}/g, '\\frac{d$1}{d$2}')
       .replace(/\\frac\{\\frac\{([^}]+)\}\}/g, '\\frac{$1}')
       .replace(/\\frac\{d([A-Za-z])\s*\/\s*d([A-Za-z])\}/g, '\\frac{d$1}{d$2}')
       .replace(/\\frac\{([a-zA-Z0-9]+)\s*\/\s*([a-zA-Z0-9]+)\}/g, '\\frac{$1}{$2}');

  return s;
}

/**
 * Renders mixed educational text containing plain words, powers (cm², cm^2, cm^{2}, cm^[2]),
 * subscripts, fractions, degree symbols, and unwrapped math symbols.
 */
function renderRichTextSegment(text: string, keyPrefix: string | number): React.ReactNode {
  if (!text) return null;

  // Clean any corrupted bracket patterns, normalize theta/thita typos, and recognize embedded math
  const sanitized = text
    .replace(/\\thita\b/gi, '\\theta')
    .replace(/\\Thita\b/g, '\\Theta')
    .replace(/\^\[([0-9a-zA-Z+\-]+)\]/g, '^{$1}')
    .replace(/\_\[([0-9a-zA-Z+\-]+)\]/g, '_{$1}')
    .replace(/\\frac\{\\frac\{d([A-Za-z])\s*\/\s*d([A-Za-z])\}\}/g, '\\frac{d$1}{d$2}')
    .replace(/\\frac\{\\frac\{([^}]+)\}\}/g, '\\frac{$1}')
    .replace(/\\frac\{d([A-Za-z])\s*\/\s*d([A-Za-z])\}/g, '\\frac{d$1}{d$2}')
    .replace(/\\frac\{([a-zA-Z0-9]+)\s*\/\s*([a-zA-Z0-9]+)\}/g, '\\frac{$1}{$2}')
    // Normalize trigonometric functions with theta, thita, or OCR zero
    .replace(/\b(sin|cos|tan|cot|sec|csc)\^?([0-9]*)\s*(?:theta|thita|0)\b/gi, (_, fn, p) => p ? `$\\${fn}^{${p}}\\theta$` : `$\\${fn}\\theta$`)
    .replace(/\b(sin|cos|tan|cot|sec|csc)\^?([0-9]*)\s*θ\b/gi, (_, fn, p) => p ? `$\\${fn}^{${p}}\\theta$` : `$\\${fn}\\theta$`)
    .replace(/\b(sin|cos|tan|cot|sec|csc)\s*\(\s*(?:theta|thita|0|θ)\s*\)/gi, '$\\$1(\\theta)$')
    // Angle of theta / at angle theta
    .replace(/\b(?:angle|at an angle of|angle of)\s+(?:theta|thita)\b/gi, 'angle $\\theta$')
    // Theta equations / subscripts
    .replace(/\b(?:theta|thita)\s*([=><≤≥≈])/gi, '$\\theta$ $1')
    .replace(/\b(?:theta|thita)_([0-9a-zA-Z]+)\b/gi, '$\\theta_{$1}$')
    // Standalone words theta/thita -> θ
    .replace(/\b(?:theta|thita)\b/gi, 'θ')
    .replace(/\b(?:Theta|Thita)\b/g, 'Θ')
    // Convert ASCII operator sequences to standard math symbols
    .replace(/(?<=\s|\d|\))\+-(?=\s|\d|\w|\\)/g, '±')
    .replace(/(?<=\s|\d|\))<=(?=\s|\d|\w|\\)/g, '≤')
    .replace(/(?<=\s|\d|\))>(?==)(?=\s|\d|\w|\\)/g, '≥')
    .replace(/(?<=\s|\d|\))!=(?=\s|\d|\w|\\)/g, '≠');

  // Tokenize by:
  // 1. Unwrapped LaTeX expressions: e.g. \frac{...}{...}, \sqrt{...}, \pi, \theta, etc.
  // 2. Radicals: 10√2, √2, √(D)
  // 3. Exponents / powers: e.g. cm^2, cm^{2}, m^3, 10^-19, x^2, t^3, 12t^2, or unicode cm², m³, r³
  // 4. Subscripts: e.g. a_1, H_2O, a₁
  // 5. Degree: 30°
  // 6. Unicode Greek letters: π, θ, α, etc.
  // 7. Operators: ±, ×, ÷, ≤, ≥, ≠, ≈
  const richPattern = /(\\frac\{[^}]+\}\{[^}]+\}|\\sqrt(?:\[[^\]]+\])?\{[^}]+\}|\\[a-zA-Z]+|\d*\s*[√∛∜]\s*(?:\([^\)]+\)|[a-zA-Z0-9]+)|[a-zA-Z0-9\)]\^(?:\{[^}]+\}|[-+]?[0-9a-zA-Z]+)|[a-zA-Z0-9\)](?:[\u2070\u00B9\u00B2\u00B3\u2074-\u2079\u207A\u207B\u207C\u207D\u207E\u207F\u2071]+)|[a-zA-Z0-9\)]\_(?:\{[^}]+\}|[0-9a-zA-Z]+)|[a-zA-Z0-9\)](?:[\u2080-\u208E\u2090-\u209C]+)|\d+\s*°|[αβγδεϵζηθϑικλμνξπϖρϱσςτυφϕχψωΓΔΘΛΞΠΣΥΦΨΩ]|[±∓×÷·•≠≤≥≈∞])/g;

  const parts = sanitized.split(richPattern);

  return (
    <React.Fragment key={keyPrefix}>
      {parts.map((tok, tIdx) => {
        if (!tok) return null;

        // A. Unwrapped LaTeX command: \frac, \sqrt, \pi, \pm, etc.
        if (tok.startsWith('\\')) {
          const normTok = normalizeMathString(tok);
          try {
            const html = katex.renderToString(normTok, { displayMode: false, throwOnError: false, output: 'html' });
            return <span key={tIdx} dangerouslySetInnerHTML={{ __html: html }} className="inline-block mx-0.5 align-baseline" />;
          } catch {
            return <span key={tIdx}>{tok}</span>;
          }
        }

        // B. Unicode Radical: 10√2, √2, √(D)
        if (/[√∛∜]/.test(tok)) {
          const normRadical = normalizeMathString(tok);
          try {
            const html = katex.renderToString(normRadical, { displayMode: false, throwOnError: false, output: 'html' });
            return <span key={tIdx} dangerouslySetInnerHTML={{ __html: html }} className="inline-block mx-0.5 align-baseline" />;
          } catch {
            return <span key={tIdx}>{tok}</span>;
          }
        }

        // C. Powers with ASCII caret: e.g. cm^2, cm^{2}, x^2, t^3, 10^-19
        const caretMatch = tok.match(/^([a-zA-Z0-9\)])\^(?:\{([^}]+)\}|([-+]?[0-9a-zA-Z]+))$/);
        if (caretMatch) {
          const base = caretMatch[1];
          const exp = caretMatch[2] || caretMatch[3];
          return (
            <span key={tIdx} className="inline-block">
              {base}
              <sup className="text-[0.8em] font-sans font-medium">{exp}</sup>
            </span>
          );
        }

        // D. Powers with Unicode superscripts: e.g. cm², m³, t³, 10⁻¹⁹
        const uniSupMatch = tok.match(/^([a-zA-Z0-9\)])([\u2070\u00B9\u00B2\u00B3\u2074-\u2079\u207A\u207B\u207C\u207D\u207E\u207F\u2071]+)$/);
        if (uniSupMatch) {
          const base = uniSupMatch[1];
          const rawSup = uniSupMatch[2];
          const exp = rawSup.split('').map((c) => SUP_MAP[c] || c).join('');
          return (
            <span key={tIdx} className="inline-block">
              {base}
              <sup className="text-[0.8em] font-sans font-medium">{exp}</sup>
            </span>
          );
        }

        // E. Subscripts: e.g. a_1, H_2O, a₁
        const caretSubMatch = tok.match(/^([a-zA-Z0-9\)])\_(?:\{([^}]+)\}|([0-9a-zA-Z]+))$/);
        if (caretSubMatch) {
          const base = caretSubMatch[1];
          const sub = caretSubMatch[2] || caretSubMatch[3];
          return (
            <span key={tIdx} className="inline-block">
              {base}
              <sub className="text-[0.8em] font-sans">{sub}</sub>
            </span>
          );
        }

        const uniSubMatch = tok.match(/^([a-zA-Z0-9\)])([\u2080-\u208E\u2090-\u209C]+)$/);
        if (uniSubMatch) {
          const base = uniSubMatch[1];
          const rawSub = uniSubMatch[2];
          const sub = rawSub.split('').map((c) => SUB_MAP[c] || c).join('');
          return (
            <span key={tIdx} className="inline-block">
              {base}
              <sub className="text-[0.8em] font-sans">{sub}</sub>
            </span>
          );
        }

        // F. Degree: 30°
        const degreeMatch = tok.match(/^(\d+)\s*°$/);
        if (degreeMatch) {
          return <span key={tIdx}>{degreeMatch[1]}°</span>;
        }

        // G. Unicode Greek or Math Operators
        if (UNICODE_MATH_MAP[tok]) {
          const ltx = UNICODE_MATH_MAP[tok];
          try {
            const html = katex.renderToString(ltx, { displayMode: false, throwOnError: false, output: 'html' });
            return <span key={tIdx} dangerouslySetInnerHTML={{ __html: html }} className="inline-block mx-0.5 align-baseline" />;
          } catch {
            return <span key={tIdx}>{tok}</span>;
          }
        }

        return <span key={tIdx}>{tok}</span>;
      })}
    </React.Fragment>
  );
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '', inline = false }) => {
  const renderedContent = useMemo(() => {
    if (!content) return '';

    // Pre-sanitize corrupted fractions, derivatives, theta/thita typos, and mathematical symbols
    let cleanContent = content
      .replace(/\\{2,}(theta|Theta|thita|Thita|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|sin|cos|tan|cot|sec|csc|cosec|frac|sqrt|times|pm|div|approx|le|ge|neq|circ|infty)\b/g, '\\$1')
      .replace(/\\thita\b/gi, '\\theta')
      .replace(/\\Thita\b/g, '\\Theta')
      // Only wrap trig functions if NOT already inside LaTeX/math ($ or \)
      .replace(/(?<![\$\\\w])(sin|cos|tan|cot|sec|csc)\^?([0-9]*)\s*(?:theta|thita|0)(?![\$\w])/gi, (_, fn, p) => p ? `$\\${fn}^{${p}}\\theta$` : `$\\${fn}\\theta$`)
      .replace(/(?<![\$\\\w])(sin|cos|tan|cot|sec|csc)\^?([0-9]*)\s*θ(?![\$\w])/gi, (_, fn, p) => p ? `$\\${fn}^{${p}}\\theta$` : `$\\${fn}\\theta$`)
      .replace(/(?<![\$\\\w])(sin|cos|tan|cot|sec|csc)\s*\\theta(?![\$\w])/gi, '$\\$1\\theta$')
      .replace(/(?<![\$\\\w])(sin|cos|tan|cot|sec|csc)\s*\(\s*(?:theta|thita|0|θ|\\theta)\s*\)(?![\$\w])/gi, '$\\$1(\\theta)$')
      .replace(/\b(?:angle|at an angle of|angle of)\s+(?:theta|thita|θ|ϑ)\b/gi, 'angle $\\theta$')
      .replace(/(?<![\$\\\w])(?:theta|thita)\s*([=><≤≥≈])\s*([0-9]+(?:\.[0-9]+)?(?:\s*°)?)(?!\w)/gi, (_, op, val) => `$\\theta ${op} ${val.replace('°', '^\\circ')}$`)
      .replace(/\\frac\{\\frac\{d([A-Za-z])\s*\/\s*d([A-Za-z])\}\}/g, '\\frac{d$1}{d$2}')
      .replace(/\\frac\{\\frac\{([^}]+)\}\}/g, '\\frac{$1}')
      .replace(/\\frac\{d([A-Za-z])\s*\/\s*d([A-Za-z])\}/g, '\\frac{d$1}{d$2}')
      .replace(/\\frac\{([a-zA-Z0-9]+)\s*\/\s*([a-zA-Z0-9]+)\}/g, '\\frac{$1}{$2}')
      // Convert unwrapped derivatives e.g. 'dr/dt = 0.01' -> '$\frac{dr}{dt} = 0.01$'
      .replace(/(?<!\$|\w)(d[A-Za-z]\s*\/\s*d[A-Za-z])(?!\$|\w)(\s*=\s*[-+]?[0-9.]+)?/g, (_, deriv, eq) => {
        const [num, den] = deriv.split('/').map((x: string) => x.trim());
        return `$\\frac{${num}}{${den}}${eq || ''}$`;
      })
      // Normalize common unit powers with caret e.g. cm^{3} -> cm³, m^{2} -> m²
      .replace(/\bcm\^\{?2\}?/g, 'cm²')
      .replace(/\bcm\^\{?3\}?/g, 'cm³')
      .replace(/\bm\^\{?2\}?/g, 'm²')
      .replace(/\bm\^\{?3\}?/g, 'm³')
      .replace(/\bmm\^\{?2\}?/g, 'mm²')
      .replace(/\bmm\^\{?3\}?/g, 'mm³');

    // Split text by:
    // 1. Display equations: $$...$$ or \[...\]
    // 2. Inline equations: $...$ or \(...\)
    const delimiterPattern = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$[^\$\n]+?\$|\\\([^\)]+?\\\))/g;
    const parts = cleanContent.split(delimiterPattern);

    return parts.map((part, idx) => {
      if (!part) return null;

      // Case 1: Display Equation $$...$$ or \[...\]
      if ((part.startsWith('$$') && part.endsWith('$$')) || (part.startsWith('\\[') && part.endsWith('\\]'))) {
        const rawMath = (part.startsWith('$$') ? part.slice(2, -2) : part.slice(2, -2)).trim();
        const math = normalizeMathString(rawMath);
        try {
          const html = katex.renderToString(math, { displayMode: true, throwOnError: false, output: 'html' });
          return <span key={idx} dangerouslySetInnerHTML={{ __html: html }} className="block my-1.5 overflow-x-auto" />;
        } catch {
          return <span key={idx} className="text-amber-400 font-mono text-sm block my-1">{part}</span>;
        }
      }

      // Case 2: Inline Equation $...$ or \(...\)
      const isInlineDollar = part.startsWith('$') && part.endsWith('$') && part.length >= 2;
      const isInlineParen = part.startsWith('\\(') && part.endsWith('\\)') && part.length >= 4;
      if (isInlineDollar || isInlineParen) {
        const rawMath = (isInlineDollar ? part.slice(1, -1) : part.slice(2, -2)).trim();
        const math = normalizeMathString(rawMath);
        try {
          const html = katex.renderToString(math, { displayMode: false, throwOnError: false, output: 'html' });
          return <span key={idx} dangerouslySetInnerHTML={{ __html: html }} className="inline-block mx-0.5 align-baseline" />;
        } catch {
          return <span key={idx} className="text-amber-400 font-mono text-sm">{part}</span>;
        }
      }

      // Case 3: Mixed text with plain words, powers (cm², cm^2, m³, x²), subscripts, degrees, and symbols
      return renderRichTextSegment(part, idx);
    });
  }, [content]);

  if (inline) {
    return <span className={`inline ${className}`}>{renderedContent}</span>;
  }

  return <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>{renderedContent}</div>;
};

