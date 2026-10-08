import katex from 'katex';

/**
 * Unicode maps for plain text / PDF export fallbacks
 */
const SUPERSCRIPTS: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
  "n": "ⁿ", "i": "ⁱ", "x": "ˣ", "y": "ʸ", "t": "ᵗ"
};

const SUBSCRIPTS: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
  "a": "ₐ", "e": "ₑ", "o": "ₒ", "x": "ₓ", "u": "ᵤ", "v": "ᵥ"
};

/**
 * Cleans and normalizes LaTeX formula before feeding into KaTeX
 */
export function normalizeLatex(raw: string): string {
  let m = raw.trim();

  // Strip math delimiters
  if (m.startsWith('$$') && m.endsWith('$$')) m = m.slice(2, -2).trim();
  else if (m.startsWith('$') && m.endsWith('$')) m = m.slice(1, -1).trim();
  else if (m.startsWith('\\[') && m.endsWith('\\]')) m = m.slice(2, -2).trim();
  else if (m.startsWith('\\(') && m.endsWith('\\)')) m = m.slice(2, -2).trim();

  // Replace double backslashes
  m = m.replace(/\\{2,}/g, '\\');

  // Fix common typos
  m = m.replace(/\\thita\b/gi, '\\theta');
  m = m.replace(/\\Thita\b/g, '\\Theta');

  // Ensure spacing after Greek macros if immediately followed by alphanumeric
  m = m.replace(/\\(pi|alpha|beta|gamma|delta|theta|lambda|mu|nu|xi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)([a-zA-Z0-9])/g, '\\$1 $2');

  // Convert plain 'pi' words in math expressions: e.g. 8pi or 4 pi -> 8\pi
  m = m.replace(/(\d+)\s*pi\b/gi, '$1\\pi ');

  // Self-heal corrupted fraction patterns
  m = m.replace(/\\frac\{\\frac\{d([A-Za-z])\s*\/\s*d([A-Za-z])\}\}/g, '\\frac{d$1}{d$2}')
       .replace(/\\frac\{\\frac\{([^}]+)\}\}/g, '\\frac{$1}')
       .replace(/\\frac\{d([A-Za-z])\s*\/\s*d([A-Za-z])\}/g, '\\frac{d$1}{d$2}')
       .replace(/\\frac\{([a-zA-Z0-9]+)\s*\/\s*([a-zA-Z0-9]+)\}/g, '\\frac{$1}{$2}');

  return m;
}

/**
 * Strips KaTeX semantic metadata and converts non-ASCII characters to HTML numeric entities
 * so that Microsoft Word Equation Editor and browsers parse MathML with zero character corruption.
 */
export function cleanKaTeXMathML(mathmlStr: string): string {
  const match = mathmlStr.match(/<math[^>]*>([\s\S]*?)<\/math>/);
  if (!match) return mathmlStr;
  let inner = match[1];

  // Remove annotation and semantics wrapper tags
  inner = inner.replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '');
  inner = inner.replace(/<\/?semantics[^>]*>/g, '');

  // Convert non-ASCII characters to HTML numeric entities e.g. &#960; for π
  inner = inner.replace(/[\u0080-\uFFFF]/g, (c) => `&#${c.charCodeAt(0)};`);

  return `<math xmlns="http://www.w3.org/1998/Math/MathML">${inner.trim()}</math>`;
}

/**
 * Converts a LaTeX formula to clean, native MathML
 */
export function latexToMathML(latex: string): string {
  try {
    const math = normalizeLatex(latex);
    const raw = katex.renderToString(math, {
      displayMode: false,
      output: 'mathml',
      throwOnError: false,
    });
    return cleanKaTeXMathML(raw);
  } catch {
    return latex;
  }
}

/**
 * Converts question stem, options, diagrams, or solution text into rich MathML + HTML
 * for Microsoft Word (.doc) exports. Microsoft Word converts MathML elements directly into
 * native Office Equation objects with genuine fraction bars, square roots, exponents, and Greek symbols.
 */
export function formatMathForWordDoc(text: string): string {
  if (!text) return '';
  let str = text;

  // 1. Delimited LaTeX: $$...$$, $...$, \[...\], \(...\)
  const mathDelim = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]*?\\\]|\\\([^\)]+?\\\))/g;
  str = str.replace(mathDelim, (m) => `&nbsp;${latexToMathML(m)}&nbsp;`);

  // 2. Unwrapped fractions and radicals: \frac{..}{..}, \sqrt{..}
  str = str.replace(/(\\frac\{[^}]+\}\{[^}]+\}|\\sqrt(?:\[[^\]]+\])?\{[^}]+\})/g, (m) => `&nbsp;${latexToMathML(m)}&nbsp;`);

  // 3. Units with powers: e.g. cm^2, cm^{2}, cm^3, cm^{3}, m^2, m^{2}, m^3, m^{3}
  str = str.replace(/\b(cm|mm|km|m)\^\{?([23])\}?/g, (_, unit, p) => {
    return `${unit}<sup>${p}</sup>`;
  });

  // 4. Algebraic powers: e.g. t^{3}, 12t^{2}, x^{2}, r^{3}
  str = str.replace(/([a-zA-Z0-9\)])\^\{([^}]+)\}/g, (_, base, exp) => {
    return `<math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>${base}</mi><mn>${exp}</mn></msup></math>`;
  });
  str = str.replace(/([a-zA-Z0-9\)])\^([0-9a-zA-Z])/g, (_, base, exp) => {
    return `<math xmlns="http://www.w3.org/1998/Math/MathML"><msup><mi>${base}</mi><mn>${exp}</mn></msup></math>`;
  });

  // 5. Clean up duplicate non-breaking spaces or awkward spacing before punctuation
  str = str.replace(/(?:&nbsp;)+/g, '&nbsp;')
           .replace(/\s*&nbsp;\s*([,\.\?\!\:])/g, '$1&nbsp;');

  return str.trim();
}

/**
 * Formats LaTeX formulas into clean, high-fidelity Unicode math text
 * for PyMuPDF PDF generation and CSV exports where MathML is not supported.
 */
export function formatMathForUnicodeText(text: string): string {
  if (!text) return '';

  let out = text;
  const mathDelim = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]*?\\\]|\\\([^\)]+?\\\))/g;

  out = out.replace(mathDelim, (delimited) => {
    let m = normalizeLatex(delimited);

    // Standard fractions
    m = m.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (_, num, den) => {
      const cleanNum = num.trim();
      const cleanDen = den.trim();
      if (cleanNum === "1" && cleanDen === "2") return "½";
      if (cleanNum === "1" && cleanDen === "3") return "⅓";
      if (cleanNum === "2" && cleanDen === "3") return "⅔";
      if (cleanNum === "1" && cleanDen === "4") return "¼";
      if (cleanNum === "3" && cleanDen === "4") return "¾";
      if (cleanNum === "4" && cleanDen === "3") return "⁴⁄₃";
      if (cleanNum === "4\\pi" && cleanDen === "3") return "⁴⁄₃π";
      if (cleanNum === "4 \\pi" && cleanDen === "3") return "⁴⁄₃π";
      return `(${cleanNum}/${cleanDen})`;
    });

    // Radicals
    m = m.replace(/\\sqrt\[3\]\{([^}]+)\}/g, "∛$1");
    m = m.replace(/\\sqrt\[4\]\{([^}]+)\}/g, "∜$1");
    m = m.replace(/\\sqrt\{([^}]+)\}/g, "√$1");

    // Superscripts
    m = m.replace(/([a-zA-Z0-9\)])\^\{([^}]+)\}/g, (_, base, exp) => {
      const sup = exp.split("").map((c: string) => SUPERSCRIPTS[c] || c).join("");
      return `${base}${sup}`;
    });
    m = m.replace(/([a-zA-Z0-9\)])\^([0-9a-zA-Z])/g, (_, base, exp) => {
      return `${base}${SUPERSCRIPTS[exp] || `^${exp}`}`;
    });

    // Subscripts
    m = m.replace(/([a-zA-Z0-9\)])\_\{([^}]+)\}/g, (_, base, sub) => {
      const s = sub.split("").map((c: string) => SUBSCRIPTS[c] || c).join("");
      return `${base}${s}`;
    });
    m = m.replace(/([a-zA-Z0-9\)])\_([0-9a-zA-Z])/g, (_, base, sub) => {
      return `${base}${SUBSCRIPTS[sub] || `_${sub}`}`;
    });

    // Greek letters
    m = m.replace(/\\pi\b/g, "π")
         .replace(/\\theta\b/g, "θ")
         .replace(/\\Theta\b/g, "Θ")
         .replace(/\\alpha\b/g, "α")
         .replace(/\\beta\b/g, "β")
         .replace(/\\gamma\b/g, "γ")
         .replace(/\\delta\b/g, "δ")
         .replace(/\\lambda\b/g, "λ")
         .replace(/\\mu\b/g, "μ")
         .replace(/\\sigma\b/g, "σ")
         .replace(/\\omega\b/g, "ω")
         .replace(/\\Delta\b/g, "Δ")
         .replace(/\\Omega\b/g, "Ω");

    // Operators
    m = m.replace(/\\times\b/g, "×")
         .replace(/\\pm\b/g, "±")
         .replace(/\\mp\b/g, "∓")
         .replace(/\\div\b/g, "÷")
         .replace(/\\cdot\b/g, "·")
         .replace(/\\le\b|\\leq\b/g, "≤")
         .replace(/\\ge\b|\\geq\b/g, "≥")
         .replace(/\\neq\b/g, "≠")
         .replace(/\\approx\b/g, "≈")
         .replace(/\\infty\b/g, "∞")
         .replace(/\\circ\b/g, "°");

    // Clean formatting macros
    m = m.replace(/\\mathrm\{([^}]+)\}/g, "$1")
         .replace(/\\mathbf\{([^}]+)\}/g, "$1")
         .replace(/\\text\{([^}]+)\}/g, "$1")
         .replace(/\\left\(/g, "(").replace(/\\right\)/g, ")")
         .replace(/\\left\[/g, "[").replace(/\\right\]/g, "]")
         .replace(/\\left\\\{/g, "{").replace(/\\right\\\}/g, "}")
         .replace(/\\,/g, " ").replace(/\\;/g, " ").replace(/\\!/g, "");

    return m;
  });

  // Common units
  out = out.replace(/\bcm\^\{?2\}?/g, "cm²")
           .replace(/\bcm\^\{?3\}?/g, "cm³")
           .replace(/\bm\^\{?2\}?/g, "m²")
           .replace(/\bm\^\{?3\}?/g, "m³");

  // Algebraic superscripts outside math mode
  out = out.replace(/([a-zA-Z0-9\)])\^\{?([23])\}?/g, (_, base, p) => `${base}${SUPERSCRIPTS[p] || p}`);

  return out;
}

/**
 * Wraps complete HTML into a UTF-16 LE buffer with Byte Order Mark (\uFEFF)
 * for pristine, error-free Microsoft Word equation rendering.
 */
export function wrapWordDocumentBuffer(htmlContent: string): Buffer {
  return Buffer.from('\uFEFF' + htmlContent, 'utf16le');
}
