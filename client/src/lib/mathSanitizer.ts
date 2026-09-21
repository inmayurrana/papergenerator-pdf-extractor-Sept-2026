/**
 * Universal Mathematical & Educational Exam Text Sanitizer
 * Automatically corrects legacy PDF symbol font encoding corruption:
 * - Acute accent ´ (U+00B4), prime ′, graves ` -> \times (×)
 * - Resolves 'imes' -> \times
 * - Super/subscript numbers e.g. 60 2 \times -> 60^2
 * - Scientific notation 1.6 x 10 -19 -> 1.6 \times 10^{-19}
 * - Units m/s 2 -> m/s^2, cm 3 -> cm^3
 * - Symbol-font contextual fallbacks: sin q -> \sin\theta, coefficient of friction m -> \mu
 */

export function sanitizeMathAndExamText(rawText: string): string {
  if (!rawText) return '';

  let s = rawText;

  // 1. Fix any broken 'imes' back to '\times'
  s = s.replace(/\bimes\b/g, '\\times');
  s = s.replace(/(\d+|\))\s*imes\s*(\d+|\()/g, '$1 \\times $2');
  s = s.replace(/(\d+)\s*imes\b/g, '$1 \\times');

  // 2. Acute accent ´ (U+00B4), backtick `, prime ′, or quotes between numbers / math tokens -> \times
  s = s.replace(/(\d+|\))\s*[´`\u2018\u2019′×✕✖]\s*(\d+|\()/g, '$1 \\times $2');

  // Stray acute accent with surrounding spaces or following numbers -> \times
  s = s.replace(/\s+[´`\u2018\u2019′]\s+/g, ' \\times ');
  s = s.replace(/(\d+)\s*[´`\u2018\u2019′]\s*/g, '$1 \\times ');

  // 3. Unicode superscripts -> LaTeX ^
  const supMap: Record<string, string> = {
    '\u2070': '0', '\u00b9': '1', '\u00b2': '2', '\u00b3': '3', '\u2074': '4',
    '\u2075': '5', '\u2076': '6', '\u2077': '7', '\u2078': '8', '\u2079': '9',
    '\u207a': '+', '\u207b': '-', '\u207c': '=', '\u207d': '(', '\u207e': ')',
    '\u207f': 'n', '\u2071': 'i',
  };
  s = s.replace(/([a-zA-Z0-9\)])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ]+)/g, (_, base, sups) => {
    const translated = sups.split('').map((c: string) => supMap[c] || c).join('');
    return `${base}^{${translated}}`;
  });

  // 4. Spurious space before superscript in math expressions: e.g. 60 2 \times -> 60^2 \times
  // IMPORTANT: use [ \t]+ (not \s+) so we NEVER collapse cross-line stacked fractions (1\n2).
  s = s.replace(/(\d+)[ \t]+([23456789])(?=[ \t]*(?:\\times|[×´\+\-\/\*]))/g, '$1^$2');

  // 5. Units normalization
  s = s.replace(/m\/s\s*2\b/g, 'm/s^2');
  s = s.replace(/m\/s\s*[-\u2013]\s*2\b/g, 'm/s^{-2}');
  s = s.replace(/\bcm\s*2\b/g, 'cm^2');
  s = s.replace(/\bcm\s*3\b/g, 'cm^3');
  s = s.replace(/\bm\s*2\b/g, 'm^2');
  s = s.replace(/\bm\s*3\b/g, 'm^3');
  s = s.replace(/\bmm\s*2\b/g, 'mm^2');
  s = s.replace(/\bmm\s*3\b/g, 'mm^3');

  // Fix any corrupted bracket patterns e.g. cm^[2] -> cm^2
  s = s.replace(/\^\[([0-9a-zA-Z+\-]+)\]/g, '^$1');
  s = s.replace(/\_\[([0-9a-zA-Z+\-]+)\]/g, '_$1');

  // 6. Scientific notation: 1.6 x 10 -19 -> 1.6 \times 10^{-19}
  s = s.replace(/(\d+(?:\.\d+)?)\s*(?:\\times|x|×|´)\s*10\s*[-\u2013\u2014]\s*(\d+)/g, '$1 \\times 10^{-$2}');
  s = s.replace(/(\d+(?:\.\d+)?)\s*(?:\\times|x|×|´)\s*10\s*([0-9]+)/g, '$1 \\times 10^{$2}');

  // 7. Fractions & Derivatives integrity self-healing
  s = s.replace(/\\frac\{\\frac\{d([A-Za-z])\s*\/\s*d([A-Za-z])\}\}/g, '\\frac{d$1}{d$2}');
  s = s.replace(/\\frac\{\\frac\{([^}]+)\}\}/g, '\\frac{$1}');
  s = s.replace(/\\frac\{d([A-Za-z])\s*\/\s*d([A-Za-z])\}/g, '\\frac{d$1}{d$2}');
  s = s.replace(/\\frac\{([a-zA-Z0-9]+)\s*\/\s*([a-zA-Z0-9]+)\}/g, '\\frac{$1}{$2}');

  // Collapse duplicate backslashes before LaTeX macros (e.g. \\theta -> \theta)
  s = s.replace(/\\{2,}(theta|Theta|thita|Thita|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|sin|cos|tan|cot|sec|csc|cosec|frac|sqrt|times|pm|div|approx|le|ge|neq|circ|infty)\b/g, '\\$1');

  // 8. Theta / Thita normalization
  s = s.replace(/\\thita\b/gi, '\\theta');
  s = s.replace(/\\Thita\b/g, '\\Theta');
  s = s.replace(/(?<!\\)\b(sin|cos|tan|cot|sec|csc|cosec)\s*(?:\\theta|\\thita|theta|thita|θ|ϑ|0)\b/gi, '\\$1\\theta');
  s = s.replace(/\\(sin|cos|tan|cot|sec|csc|cosec)\s*(?:\\theta|\\thita|theta|thita|θ|ϑ|0)\b/gi, '\\$1\\theta');
  s = s.replace(/\b(?:angle|at an angle of|angle of)\s+(?:\\?theta|\\?thita|θ|ϑ)\b/gi, 'angle \\theta');
  s = s.replace(/(?<!\\)\b(?:theta|thita)\b/gi, '\\theta');
  s = s.replace(/(?<!\\)\b(?:Theta|Thita)\b/g, '\\Theta');
  s = s.replace(/[θϑ]/g, '\\theta');
  s = s.replace(/Θ/g, '\\Theta');

  // 9. Symbol-font contextual fallbacks (for text where font info is unavailable in JS)
  // Trig functions followed by bare 'q' (Symbol-font theta that survived backend processing)
  s = s.replace(/\b(sin|cos|tan|cot|sec|csc)\s+q\b/gi, '\\$1\\theta');
  // Angle phrase followed by bare 'q'
  s = s.replace(/\b(slope angle|at an angle of|angle of|angle)\s+q\b/gi, '$1 \\theta');
  // Coefficient of friction followed by bare 'm' (Symbol-font mu)
  s = s.replace(/(coefficient of (?:static |kinetic |sliding |rolling )?friction\s*(?:is|,)?\s*)m\b/gi, '$1\\mu');
  // mu_s: 'coefficient of static friction, m s'
  s = s.replace(/(coefficient of (?:static |kinetic )?friction\s*,\s*)m\s+s\b/gi, '$1\\mu_s');
  // mu_k: 'coefficient of kinetic friction, m k'
  s = s.replace(/(coefficient of (?:kinetic |sliding )?friction\s*,\s*)m\s+k\b/gi, '$1\\mu_k');

  // Final pass: ensure no double backslashes leaked into macros
  s = s.replace(/\\{2,}(theta|Theta|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega|sin|cos|tan|cot|sec|csc|cosec|frac|sqrt|times|pm|div|approx|le|ge|neq|circ|infty)\b/g, '\\$1');

  return s;
}
