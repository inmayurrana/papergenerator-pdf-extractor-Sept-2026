import React, { useEffect, useRef } from 'react';

/**
 * ScientificBackground
 * 
 * Renders an expansive, densely populated, interactive cosmos of scientific formulas,
 * chemistry equations, mathematical relations, diagrams, and physical constants.
 * 
 * Features:
 * - 75+ uniquely positioned scientific entities filling the entire canvas around the login card.
 * - Multi-directional drifting motion (each item travels along its own unique trajectory).
 * - Multi-sized scale hierarchy (ranging from delicate compact glyphs to bold hero expressions).
 * - Vibrant jewel-tone scientific palette (Indigo, Cobalt, Emerald, Amber, Crimson, Cyan, Violet, Teal, Coral, Lime, Fuchsia, Sky Blue).
 * - Interactive Mouse Repulsion: Elements smoothly glide away from the mouse pointer upon proximity,
 *   and gracefully return to their orbital paths when the cursor moves away.
 */
export const ScientificBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const originsRef = useRef<{ x: number; y: number }[]>([]);
  const isUpdatingRef = useRef<boolean>(false);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);

  // Diverse repulsion sensitivities (mass / inertia simulation: 85px to 135px push distance)
  const repelSensitivities: number[] = [
    115, 95, 130, 90, 120, 105, 135, 85, 125, 100,
    120, 105, 130, 90, 115, 125, 95, 135, 85, 120,
    105, 125, 90, 115, 130, 95, 120, 85, 135, 105,
    115, 95, 125, 90, 130, 105, 120, 85, 135, 95,
    125, 100, 130, 85, 115, 95, 120, 110, 135, 90,
    105, 125, 95, 130, 85, 115, 100, 120, 135, 90,
    110, 95, 125, 85, 130, 105, 115, 120, 90, 135,
    100, 125, 85, 115, 105, 130, 95, 120, 110, 135,
  ];

  // Measure and cache unshifted resting coordinates of all items
  const updateOrigins = () => {
    itemsRef.current.forEach((el, idx) => {
      if (!el) return;
      const prevTransition = el.style.transition;
      const prevTransform = el.style.transform;
      el.style.transition = 'none';
      el.style.transform = 'none';
      const rect = el.getBoundingClientRect();
      el.style.transform = prevTransform;
      // Restore smooth spring transition
      void el.offsetWidth;
      el.style.transition = prevTransition || 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
      originsRef.current[idx] = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    });
  };

  useEffect(() => {
    // Initial measurement after DOM render
    const timer = setTimeout(() => {
      updateOrigins();
    }, 120);

    const handleResize = () => {
      updateOrigins();
    };

    const handleScroll = () => {
      updateOrigins();
    };

    const applyRepulsion = () => {
      isUpdatingRef.current = false;
      const mouse = mousePosRef.current;

      itemsRef.current.forEach((el, idx) => {
        if (!el) return;
        const origin = originsRef.current[idx];
        if (!origin) return;

        if (!mouse) {
          if (el.style.transform && el.style.transform !== 'translate3d(0px, 0px, 0px)') {
            el.style.transform = 'translate3d(0px, 0px, 0px)';
          }
          return;
        }

        const dx = origin.x - mouse.x;
        const dy = origin.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        const radius = 250; // Proximity trigger sphere

        if (dist < radius && dist > 0.1) {
          const power = Math.pow(1 - dist / radius, 1.25);
          const maxPush = repelSensitivities[idx % repelSensitivities.length] || 105;
          const push = power * maxPush;
          const pushX = (dx / dist) * push;
          const pushY = (dy / dist) * push;
          el.style.transform = `translate3d(${pushX.toFixed(1)}px, ${pushY.toFixed(1)}px, 0)`;
        } else {
          if (el.style.transform && el.style.transform !== 'translate3d(0px, 0px, 0px)') {
            el.style.transform = 'translate3d(0px, 0px, 0px)';
          }
        }
      });
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        return;
      }

      mousePosRef.current = { x: clientX, y: clientY };

      if (!originsRef.current.length) {
        updateOrigins();
      }

      if (!isUpdatingRef.current) {
        isUpdatingRef.current = true;
        requestAnimationFrame(applyRepulsion);
      }
    };

    const handlePointerLeave = () => {
      mousePosRef.current = null;
      if (!isUpdatingRef.current) {
        isUpdatingRef.current = true;
        requestAnimationFrame(applyRepulsion);
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('touchend', handlePointerLeave);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('touchend', handlePointerLeave);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const registerItem = (index: number) => (el: HTMLDivElement | null) => {
    itemsRef.current[index] = el;
  };

  const wrapperStyle: React.CSSProperties = {
    transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: 'transform',
  };

  return (
    <div
      ref={containerRef}
      className="pointer-events-none select-none fixed inset-0 overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* =========================================================================
          GROUP 1: MATHEMATICAL & PHYSICS FORMULAS
          ========================================================================= */}

      {/* Item 0: Physics & Relativity: E = mc² (Hero Extra-Large, Electric Indigo, Drift: Up-Left) */}
      <div ref={registerItem(0)} className="absolute top-4 left-5 sm:top-7 sm:left-8 font-serif" style={wrapperStyle}>
        <div className="space-y-1.5 text-indigo-600/75 animate-path-left-to-right">
          <div className="text-2xl sm:text-3xl font-extrabold italic tracking-wide text-indigo-700/90">E = mc²</div>
          <div className="text-base sm:text-lg font-bold italic text-indigo-600/80">iℏ ∂Ψ/∂t = ĤΨ</div>
          <div className="text-xs font-mono tracking-normal text-indigo-600/65">PV = nRT &bull; Δx·Δp ≥ ℏ/2</div>
        </div>
      </div>

      {/* Item 1: Fundamental Calculus & Electrodynamics (Large, Cobalt Blue, Drift: Down-Right) */}
      <div ref={registerItem(1)} className="absolute top-4 right-5 sm:top-8 sm:right-10 font-serif text-right" style={wrapperStyle}>
        <div className="space-y-1.5 text-blue-600/75 animate-path-top-to-bottom">
          <div className="text-xl sm:text-2xl font-extrabold italic text-blue-700/90">∫ₐᵇ f(x) dx = F(b) - F(a)</div>
          <div className="text-sm sm:text-base font-bold italic text-blue-600/80">∇ × B = μ₀J + μ₀ε₀ ∂E/∂t</div>
          <div className="text-xs font-mono text-blue-600/65">limₓ→₀ (sin x / x) = 1</div>
        </div>
      </div>

      {/* Item 2: Quadratic Formula & Greek Sequence (Ruby Crimson, Medium-Large, Drift: Horizontal-Right) */}
      <div ref={registerItem(2)} className="absolute top-[40%] -translate-y-1/2 left-4 sm:left-9 font-serif" style={wrapperStyle}>
        <div className="space-y-2 text-rose-600/75 animate-path-right-to-left">
          <div className="text-base sm:text-lg italic font-extrabold text-rose-700/90">x = (-b ± √(b² - 4ac)) / 2a</div>
          <div className="text-xl sm:text-2xl font-bold tracking-widest text-rose-600/80">π &bull; ∑ &bull; ∫ &bull; √ &bull; ∞ &bull; θ &bull; Ω</div>
          <div className="text-xs font-mono italic text-rose-700/70">e^(iπ) + 1 = 0</div>
        </div>
      </div>

      {/* Item 3: Infinite Series & General Relativity (Carmine Red, Medium-Large, Drift: Down-Left) */}
      <div ref={registerItem(3)} className="absolute top-[48%] right-4 sm:right-9 text-right font-serif" style={wrapperStyle}>
        <div className="space-y-2 text-red-600/75 animate-path-bottom-to-top">
          <div className="text-lg sm:text-xl font-extrabold italic text-red-700/90">∑ (1/n²) = π² / 6</div>
          <div className="text-xs font-mono text-red-600/70">F = G (m₁ m₂) / r²</div>
          <div className="text-xs sm:text-sm font-serif italic text-red-700/80">G_μν + Λ g_μν = (8πG/c⁴) T_μν</div>
        </div>
      </div>

      {/* Item 4: Thermodynamics & Entropy Formula (Deep Sea Teal, Medium, Drift: Vertical-Up) */}
      <div ref={registerItem(4)} className="absolute top-[80%] left-5 sm:left-12 font-serif hidden sm:block" style={wrapperStyle}>
        <div className="space-y-1 text-teal-600/75 animate-path-diag-tl-br">
          <div className="text-base sm:text-lg font-bold italic text-teal-700/90">S = k_B ln Ω</div>
          <div className="text-xs font-mono font-medium text-teal-600/70">ΔG = ΔH - TΔS</div>
          <div className="text-xs font-mono font-medium text-teal-600/70">dQ = dU + dW</div>
        </div>
      </div>

      {/* Item 5: Fourier Transform & Matrices (Warm Golden Amber, Medium, Drift: Up-Right) */}
      <div ref={registerItem(5)} className="absolute top-[76%] right-5 sm:right-12 text-right font-serif hidden sm:block" style={wrapperStyle}>
        <div className="space-y-1 text-amber-600/75 animate-path-diag-br-tl">
          <div className="text-base sm:text-lg font-bold italic text-amber-700/90">f̂(ξ) = ∫ f(x) e^(-2πixξ) dx</div>
          <div className="text-xs font-mono text-amber-600/70">f(x) = ∑ [f^(n)(a)/n!] (x-a)^n</div>
          <div className="text-xs font-mono text-amber-600/70">det(A - λI) = 0</div>
        </div>
      </div>

      {/* Item 6: Quantum Matter Waves & Constant of Light (Emerald Green, Compact-Medium, Drift: Down-Left) */}
      <div ref={registerItem(6)} className="absolute bottom-5 left-20 sm:bottom-7 sm:left-32 font-serif italic hidden sm:block" style={wrapperStyle}>
        <div className="space-y-1 text-emerald-600/75 animate-path-diag-bl-tr">
          <div className="font-bold text-sm sm:text-base text-emerald-700/90">λ = h / mv</div>
          <div className="font-mono text-xs not-italic text-emerald-600/70">c = 299,792,458 m/s</div>
          <div className="font-mono text-xs not-italic text-emerald-600/70">E = hν</div>
        </div>
      </div>

      {/* Item 7: Chemical Kinetics & Arrhenius Equation (Royal Amethyst Violet, Compact, Drift: Orbit-CW) */}
      <div ref={registerItem(7)} className="absolute bottom-5 right-20 sm:bottom-7 sm:right-32 font-serif italic hidden sm:block" style={wrapperStyle}>
        <div className="space-y-1 text-violet-600/75 animate-path-diag-tr-bl">
          <div className="font-bold text-sm sm:text-base text-violet-700/90">k = A e^(-Ea/RT)</div>
          <div className="font-mono text-xs text-violet-600/70">pH = -log[H⁺]</div>
          <div className="font-mono text-xs text-violet-600/70">K_eq = [C]ᶜ [D]ᵈ / ([A]ᵃ [B]ᵇ)</div>
        </div>
      </div>

      {/* Item 8: Statistical Velocity & Mechanics (Electric Cyan, Compact, Drift: Horizontal-Left) */}
      <div ref={registerItem(8)} className="absolute top-[28%] left-8 sm:left-16 font-serif italic hidden md:block" style={wrapperStyle}>
        <div className="space-y-1 text-cyan-600/75 animate-path-steep-up-right">
          <div className="font-bold text-sm text-cyan-700/90">v_rms = √(3RT/M)</div>
          <div className="font-mono text-xs text-cyan-600/70">F_net = m · a &bull; W = ∫ F·dr</div>
        </div>
      </div>

      {/* Item 9: Stokes Theorem & Multivariable Vector Calculus (Sky Blue, Compact, Drift: Vertical-Down) */}
      <div ref={registerItem(9)} className="absolute top-[32%] right-8 sm:right-16 font-serif italic text-right hidden md:block" style={wrapperStyle}>
        <div className="space-y-1 text-sky-600/75 animate-path-steep-down-left">
          <div className="font-bold text-sm text-sky-700/90">∮_C F · dr = ∬_S (∇ × F) · dS</div>
          <div className="font-mono text-xs text-sky-600/70">div(F) = ∇ · F &bull; curl(F) = ∇ × F</div>
        </div>
      </div>

      {/* =========================================================================
          GROUP 2: EXISTING SCIENTIFIC DIAGRAMS
          ========================================================================= */}

      {/* Item 10: Cartesian Coordinate Grid with Sine Wave (Cobalt Blue, Drift: Sine Wave) */}
      <div ref={registerItem(10)} className="absolute top-24 left-4 sm:top-28 sm:left-14 hidden md:block text-blue-600/65" style={wrapperStyle}>
        <div className="animate-path-shallow-right">
          <svg width="150" height="90" viewBox="0 0 160 100" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="10" y1="50" x2="150" y2="50" strokeWidth="1.3" />
            <line x1="80" y1="10" x2="80" y2="90" strokeWidth="1.3" />
            <polyline points="146,47 150,50 146,53" />
            <polyline points="77,14 80,10 83,14" />
            <path d="M 15,50 Q 47.5,10 80,50 T 145,50" fill="none" strokeWidth="2.2" />
            <path d="M 15,18 Q 47.5,50 80,18 T 145,18" fill="none" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
            <text x="142" y="42" fontSize="10" fill="currentColor" fontFamily="sans-serif">x</text>
            <text x="86" y="18" fontSize="10" fill="currentColor" fontFamily="sans-serif">y</text>
            <text x="96" y="34" fontSize="10" fill="currentColor" fontStyle="italic" fontFamily="serif">y = sin(x)</text>
          </svg>
        </div>
      </div>

      {/* Item 11: DNA Double Helix (Emerald Green, Drift: Tilt Sway) */}
      <div ref={registerItem(11)} className="absolute top-48 left-3 sm:top-52 sm:left-6 hidden md:block text-emerald-600/65" style={wrapperStyle}>
        <div className="animate-path-shallow-left">
          <svg width="90" height="120" viewBox="0 0 100 120" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M 25,10 Q 75,35 25,60 Q -25,85 25,110" strokeWidth="2" />
            <path d="M 75,10 Q 25,35 75,60 Q 125,85 75,110" strokeWidth="2" />
            <line x1="38" y1="20" x2="62" y2="20" strokeWidth="1.3" />
            <circle cx="50" cy="20" r="2.5" fill="currentColor" />
            <line x1="26" y1="36" x2="74" y2="36" strokeWidth="1.3" />
            <circle cx="50" cy="36" r="2.5" fill="currentColor" />
            <line x1="25" y1="60" x2="75" y2="60" strokeWidth="1.3" />
            <circle cx="50" cy="60" r="2.5" fill="currentColor" />
            <line x1="26" y1="84" x2="74" y2="84" strokeWidth="1.3" />
            <circle cx="50" cy="84" r="2.5" fill="currentColor" />
            <line x1="38" y1="100" x2="62" y2="100" strokeWidth="1.3" />
            <circle cx="50" cy="100" r="2.5" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Item 12: Rutherford-Bohr Atomic Orbit Model (Royal Violet, Drift: Orbit-CCW) */}
      <div ref={registerItem(12)} className="absolute top-24 right-4 sm:top-28 sm:right-16 hidden md:block text-violet-600/65" style={wrapperStyle}>
        <div className="animate-path-left-to-right">
          <svg width="130" height="130" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.4">
            <ellipse cx="60" cy="60" rx="52" ry="19" transform="rotate(0 60 60)" />
            <ellipse cx="60" cy="60" rx="52" ry="19" transform="rotate(60 60 60)" />
            <ellipse cx="60" cy="60" rx="52" ry="19" transform="rotate(120 60 60)" />
            <circle cx="60" cy="60" r="7" fill="currentColor" />
            <circle cx="106" cy="60" r="3" fill="currentColor" />
            <circle cx="37" cy="20" r="3" fill="currentColor" />
            <circle cx="83" cy="100" r="3" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Item 13: Magnetic Dipole Field Loops (Electric Cyan, Drift: Figure-8) */}
      <div ref={registerItem(13)} className="absolute top-52 right-3 sm:top-60 sm:right-8 hidden md:block text-cyan-600/65" style={wrapperStyle}>
        <div className="animate-path-top-to-bottom">
          <svg width="110" height="95" viewBox="0 0 120 100" fill="none" stroke="currentColor" strokeWidth="1.3">
            <rect x="48" y="25" width="24" height="50" rx="3" strokeWidth="1.6" />
            <line x1="48" y1="50" x2="72" y2="50" strokeWidth="1.2" />
            <text x="56" y="42" fontSize="10" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">N</text>
            <text x="57" y="67" fontSize="10" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">S</text>
            <path d="M 54,25 C 20,-5 5,50 54,75" strokeWidth="1.2" />
            <path d="M 50,30 C -5,5 -15,75 50,70" strokeWidth="1.1" strokeDasharray="3 2" />
            <path d="M 66,25 C 100,-5 115,50 66,75" strokeWidth="1.2" />
            <path d="M 70,30 C 125,5 135,75 70,70" strokeWidth="1.1" strokeDasharray="3 2" />
            <polyline points="22,30 20,35 25,36" strokeWidth="1.1" />
            <polyline points="98,30 100,35 95,36" strokeWidth="1.1" />
          </svg>
        </div>
      </div>

      {/* Item 14: Pythagoras Right Triangle (Warm Amber Gold, Drift: Diagonal-1) */}
      <div ref={registerItem(14)} className="absolute top-[58%] left-4 sm:left-14 hidden md:block text-amber-600/65" style={wrapperStyle}>
        <div className="animate-path-right-to-left">
          <svg width="120" height="90" viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="10,80 110,80 10,20" strokeWidth="1.8" />
            <polyline points="10,70 20,70 20,80" strokeWidth="1.2" />
            <line x1="10" y1="20" x2="60" y2="80" strokeDasharray="3 3" strokeWidth="1.2" />
            <path d="M 90,80 A 20,20 0 0,0 85,73" strokeWidth="1.2" />
            <text x="75" y="75" fontSize="10" fill="currentColor" fontFamily="serif" fontStyle="italic">θ</text>
            <text x="6" y="52" fontSize="10" fill="currentColor" fontFamily="serif" fontStyle="italic">a</text>
            <text x="58" y="88" fontSize="10" fill="currentColor" fontFamily="serif" fontStyle="italic">b</text>
            <text x="66" y="44" fontSize="10" fill="currentColor" fontFamily="serif" fontStyle="italic">c</text>
            <text x="14" y="16" fontSize="9" fill="currentColor" fontFamily="serif" fontWeight="bold">a² + b² = c²</text>
          </svg>
        </div>
      </div>

      {/* Item 15: Optical Prism Refraction (Amethyst Purple, Drift: Up-Right) */}
      <div ref={registerItem(15)} className="absolute top-[68%] left-6 sm:left-20 hidden md:block text-purple-600/65" style={wrapperStyle}>
        <div className="animate-path-bottom-to-top">
          <svg width="120" height="85" viewBox="0 0 130 90" fill="none" stroke="currentColor" strokeWidth="1.4">
            <polygon points="65,12 115,80 15,80" strokeWidth="1.8" />
            <line x1="5" y1="58" x2="40" y2="48" strokeWidth="1.6" />
            <polyline points="20,53 25,52 22,48" strokeWidth="1.2" />
            <line x1="40" y1="48" x2="80" y2="42" strokeWidth="1.3" strokeDasharray="3 2" />
            <line x1="80" y1="42" x2="125" y2="30" strokeWidth="1.4" opacity="0.9" />
            <line x1="80" y1="42" x2="125" y2="42" strokeWidth="1.4" opacity="0.75" />
            <line x1="80" y1="42" x2="125" y2="54" strokeWidth="1.4" opacity="0.6" />
            <text x="110" y="24" fontSize="8" fill="currentColor" fontFamily="sans-serif">λ₁</text>
            <text x="115" y="64" fontSize="8" fill="currentColor" fontFamily="sans-serif">λ₂</text>
          </svg>
        </div>
      </div>

      {/* Item 16: 3D Wireframe Isometric Cube (Electric Indigo, Drift: Diagonal-2) */}
      <div ref={registerItem(16)} className="absolute top-[36%] -translate-y-1/2 right-4 sm:right-14 hidden md:block text-indigo-600/65" style={wrapperStyle}>
        <div className="animate-path-diag-tl-br">
          <svg width="110" height="110" viewBox="0 0 110 110" fill="none" stroke="currentColor" strokeWidth="1.4">
            <polygon points="55,15 95,38 55,61 15,38" />
            <polygon points="15,38 55,61 55,105 15,82" />
            <polygon points="55,61 95,38 95,82 55,105" />
            <line x1="15" y1="38" x2="55" y2="61" strokeDasharray="3 3" />
            <line x1="55" y1="15" x2="55" y2="61" strokeDasharray="3 3" />
          </svg>
        </div>
      </div>

      {/* Item 17: Parabolic Projectile Motion (Sea Teal, Drift: Down-Left) */}
      <div ref={registerItem(17)} className="absolute top-[62%] right-4 sm:right-16 hidden md:block text-teal-600/65" style={wrapperStyle}>
        <div className="animate-path-diag-br-tl">
          <svg width="125" height="90" viewBox="0 0 130 90" fill="none" stroke="currentColor" strokeWidth="1.4">
            <line x1="15" y1="75" x2="120" y2="75" strokeWidth="1.4" />
            <line x1="15" y1="15" x2="15" y2="75" strokeWidth="1.4" />
            <polyline points="12,20 15,15 18,20" strokeWidth="1.2" />
            <polyline points="115,72 120,75 115,78" strokeWidth="1.2" />
            <path d="M 15,75 Q 60,15 105,75" strokeWidth="1.8" strokeDasharray="4 2" />
            <line x1="15" y1="75" x2="42" y2="40" strokeWidth="1.6" />
            <polyline points="37,40 42,40 42,45" strokeWidth="1.3" />
            <line x1="60" y1="45" x2="60" y2="75" strokeDasharray="2 2" strokeWidth="1" />
            <text x="44" y="38" fontSize="9" fill="currentColor" fontFamily="serif" fontStyle="italic">v₀</text>
            <text x="63" y="60" fontSize="8" fill="currentColor" fontFamily="serif">h_max</text>
            <text x="100" y="85" fontSize="8" fill="currentColor" fontFamily="serif">R</text>
          </svg>
        </div>
      </div>

      {/* Item 18: Benzene Ring Lattice (Mint Emerald, Drift: Orbit-CW) */}
      <div ref={registerItem(18)} className="absolute bottom-5 left-4 sm:bottom-7 sm:left-10 text-emerald-600/65" style={wrapperStyle}>
        <div className="animate-path-diag-bl-tr">
          <svg width="85" height="85" viewBox="0 0 100 110" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="50,10 90,32 90,78 50,100 10,78 10,32" strokeWidth="1.8" />
            <circle cx="50" cy="55" r="23" strokeDasharray="4 3" strokeWidth="1.3" />
            <line x1="50" y1="10" x2="50" y2="0" strokeWidth="1.5" />
            <line x1="90" y1="78" x2="98" y2="83" strokeWidth="1.5" />
            <line x1="10" y1="78" x2="2" y2="83" strokeWidth="1.5" />
          </svg>
        </div>
      </div>

      {/* Item 19: Harmonic Simple Pendulum (Warm Tangerine, Drift: Pendulum Arc) */}
      <div ref={registerItem(19)} className="absolute bottom-2 left-[30%] sm:bottom-4 sm:left-[27%] hidden md:block text-orange-600/65" style={wrapperStyle}>
        <div className="animate-path-diag-tr-bl">
          <svg width="90" height="105" viewBox="0 0 100 110" fill="none" stroke="currentColor" strokeWidth="1.4">
            <line x1="20" y1="10" x2="80" y2="10" strokeWidth="2" />
            <circle cx="50" cy="10" r="3" fill="currentColor" />
            <line x1="50" y1="10" x2="50" y2="95" strokeDasharray="3 3" strokeWidth="1" />
            <line x1="50" y1="10" x2="76" y2="80" strokeWidth="1.6" />
            <circle cx="76" cy="80" r="7" fill="currentColor" />
            <path d="M 24,80 Q 50,95 76,80" strokeDasharray="2 2" strokeWidth="1.2" />
            <path d="M 50,35 A 25,25 0 0,0 58,33" strokeWidth="1.2" />
            <text x="54" y="44" fontSize="9" fill="currentColor" fontFamily="serif" fontStyle="italic">θ</text>
            <text x="78" y="96" fontSize="8" fill="currentColor" fontFamily="serif" fontStyle="italic">mg</text>
          </svg>
        </div>
      </div>

      {/* Item 20: Gaussian Bell Distribution (Deep Royal Blue, Drift: Horizontal-R) */}
      <div ref={registerItem(20)} className="absolute bottom-5 right-4 sm:bottom-7 sm:right-10 hidden sm:block text-blue-700/65" style={wrapperStyle}>
        <div className="animate-path-steep-up-right">
          <svg width="145" height="75" viewBox="0 0 140 80" fill="none" stroke="currentColor" strokeWidth="1.4">
            <line x1="10" y1="68" x2="130" y2="68" strokeWidth="1.3" />
            <line x1="70" y1="16" x2="70" y2="68" strokeDasharray="3 3" strokeWidth="1.2" />
            <path d="M 15,67 C 40,67 50,18 70,18 C 90,18 100,67 125,67" fill="none" strokeWidth="2.2" />
            <text x="73" y="27" fontSize="9" fill="currentColor" fontFamily="serif" fontStyle="italic">μ</text>
            <text x="96" y="64" fontSize="8" fill="currentColor" fontFamily="serif">μ+σ</text>
            <text x="32" y="64" fontSize="8" fill="currentColor" fontFamily="serif">μ-σ</text>
          </svg>
        </div>
      </div>

      {/* Item 21: Graduated Chemistry Flask (Spring Lime, Drift: Vertical-U) */}
      <div ref={registerItem(21)} className="absolute bottom-2 right-[30%] sm:bottom-4 sm:right-[27%] hidden md:block text-lime-600/65" style={wrapperStyle}>
        <div className="animate-path-steep-down-left">
          <svg width="85" height="95" viewBox="0 0 90 100" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M 38,10 L 52,10 L 52,30 L 78,82 C 80,86 78,90 73,90 L 17,90 C 12,90 10,86 12,82 L 38,30 Z" strokeWidth="1.7" />
            <line x1="35" y1="10" x2="55" y2="10" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 22,65 Q 45,68 68,65" strokeWidth="1.3" />
            <circle cx="42" cy="74" r="2" fill="currentColor" />
            <circle cx="52" cy="68" r="1.5" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Item 22: Convex Optics Lens (Vivid Coral, Drift: Horizontal-L) */}
      <div ref={registerItem(22)} className="absolute top-[16%] left-[36%] hidden md:block text-orange-600/65" style={wrapperStyle}>
        <div className="animate-path-shallow-right">
          <svg width="120" height="75" viewBox="0 0 130 80" fill="none" stroke="currentColor" strokeWidth="1.4">
            <line x1="5" y1="40" x2="125" y2="40" strokeWidth="1.1" strokeDasharray="3 3" />
            <path d="M 50,8 Q 65,40 50,72 Q 35,40 50,8 Z" strokeWidth="1.8" />
            <line x1="10" y1="20" x2="50" y2="20" strokeWidth="1.3" />
            <line x1="50" y1="20" x2="105" y2="40" strokeWidth="1.3" />
            <line x1="10" y1="60" x2="50" y2="60" strokeWidth="1.3" />
            <line x1="50" y1="60" x2="105" y2="40" strokeWidth="1.3" />
            <circle cx="105" cy="40" r="2" fill="currentColor" />
            <text x="108" y="38" fontSize="8" fill="currentColor" fontFamily="serif" fontStyle="italic">F</text>
          </svg>
        </div>
      </div>

      {/* =========================================================================
          GROUP 3: GREEK & SCIENTIFIC CONSTANTS
          ========================================================================= */}

      {/* Item 23: α (Alpha) */}
      <div ref={registerItem(23)} className="absolute top-[15%] left-[27%] hidden sm:block font-serif font-bold text-3xl sm:text-4xl text-indigo-600/70" style={wrapperStyle}>
        <div className="animate-path-shallow-left">α</div>
      </div>

      {/* Item 24: β (Beta) */}
      <div ref={registerItem(24)} className="absolute top-[19%] right-[29%] hidden sm:block font-serif font-bold text-2xl sm:text-3xl text-blue-600/70" style={wrapperStyle}>
        <div className="animate-path-left-to-right">β</div>
      </div>

      {/* Item 25: λ (Lambda) */}
      <div ref={registerItem(25)} className="absolute top-[28%] left-[21%] hidden md:block font-serif font-bold text-3xl sm:text-4xl text-emerald-600/70" style={wrapperStyle}>
        <div className="animate-path-top-to-bottom">λ</div>
      </div>

      {/* Item 26: Δ (Delta) */}
      <div ref={registerItem(26)} className="absolute top-[27%] right-[22%] hidden md:block font-serif font-bold text-2xl sm:text-3xl text-amber-600/70" style={wrapperStyle}>
        <div className="animate-path-right-to-left">Δ</div>
      </div>

      {/* Item 27: ∮ (Contour Integral) */}
      <div ref={registerItem(27)} className="absolute top-[43%] left-[17%] hidden md:block font-serif font-bold text-4xl sm:text-5xl text-purple-600/70" style={wrapperStyle}>
        <div className="animate-path-bottom-to-top">∮</div>
      </div>

      {/* Item 28: ∇ (Nabla) */}
      <div ref={registerItem(28)} className="absolute top-[45%] right-[18%] hidden md:block font-serif font-bold text-3xl sm:text-4xl text-rose-600/70" style={wrapperStyle}>
        <div className="animate-path-diag-tl-br">∇</div>
      </div>

      {/* Item 29: Ψ (Psi) */}
      <div ref={registerItem(29)} className="absolute bottom-[27%] left-[23%] hidden sm:block font-serif font-bold text-4xl sm:text-5xl text-teal-600/70" style={wrapperStyle}>
        <div className="animate-path-diag-br-tl">Ψ</div>
      </div>

      {/* Item 30: ℏ (Planck Constant) */}
      <div ref={registerItem(30)} className="absolute bottom-[25%] right-[23%] hidden sm:block font-serif font-bold text-xl sm:text-2xl text-cyan-600/70" style={wrapperStyle}>
        <div className="animate-path-diag-bl-tr">ℏ</div>
      </div>

      {/* Item 31: Ω (Omega) */}
      <div ref={registerItem(31)} className="absolute bottom-[16%] left-[34%] hidden md:block font-serif font-bold text-3xl sm:text-4xl text-violet-600/70" style={wrapperStyle}>
        <div className="animate-path-diag-tr-bl">Ω</div>
      </div>

      {/* Item 32: π (Pi) */}
      <div ref={registerItem(32)} className="absolute top-[67%] left-[24%] hidden md:block font-serif font-bold text-3xl sm:text-4xl text-orange-600/70" style={wrapperStyle}>
        <div className="animate-path-steep-up-right">π</div>
      </div>

      {/* Item 33: ∑ (Sigma) */}
      <div ref={registerItem(33)} className="absolute top-[71%] right-[25%] hidden md:block font-serif font-bold text-5xl sm:text-6xl text-sky-600/70" style={wrapperStyle}>
        <div className="animate-path-steep-down-left">∑</div>
      </div>

      {/* Item 34: ∞ (Infinity) */}
      <div ref={registerItem(34)} className="absolute bottom-[14%] right-[35%] hidden md:block font-serif font-bold text-4xl sm:text-5xl text-indigo-600/70" style={wrapperStyle}>
        <div className="animate-path-shallow-right">∞</div>
      </div>

      {/* Item 35: θ (Theta) */}
      <div ref={registerItem(35)} className="absolute top-[34%] left-[30%] hidden md:block font-serif font-bold text-2xl sm:text-3xl text-fuchsia-600/70" style={wrapperStyle}>
        <div className="animate-path-shallow-left">θ</div>
      </div>

      {/* Item 36: μ (Mu) */}
      <div ref={registerItem(36)} className="absolute top-[37%] right-[31%] hidden md:block font-serif font-bold text-xl sm:text-2xl text-lime-600/70" style={wrapperStyle}>
        <div className="animate-path-left-to-right">μ</div>
      </div>

      {/* Item 37: ∫ (Integral Hero) */}
      <div ref={registerItem(37)} className="absolute top-[52%] left-[19%] hidden md:block font-serif font-extrabold text-5xl sm:text-6xl text-[#0B1F3A]/70" style={wrapperStyle}>
        <div className="animate-path-top-to-bottom">∫</div>
      </div>

      {/* Item 38: φ (Phi Golden Ratio) */}
      <div ref={registerItem(38)} className="absolute bottom-[34%] right-[19%] hidden md:block font-serif font-bold text-2xl sm:text-3xl text-amber-700/70" style={wrapperStyle}>
        <div className="animate-path-right-to-left">φ</div>
      </div>

      {/* Item 39: √ (Radical) */}
      <div ref={registerItem(39)} className="absolute top-[75%] left-[18%] hidden md:block font-serif font-extrabold text-3xl sm:text-4xl text-emerald-700/70" style={wrapperStyle}>
        <div className="animate-path-bottom-to-top">√</div>
      </div>

      {/* =========================================================================
          GROUP 4: NEW CHEMISTRY EQUATIONS & BIOCHEMISTRY (Filling Empty Spaces)
          ========================================================================= */}

      {/* Item 40: Photosynthesis Equation (Top Center-Left, Emerald Green, Drift: Horizontal-R) */}
      <div ref={registerItem(40)} className="absolute top-2 left-[36%] sm:top-3 sm:left-[36%] font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-emerald-600/75 animate-path-diag-tl-br">
          <div className="text-xs sm:text-sm font-bold tracking-tight text-emerald-700/90">
            6CO₂ + 6H₂O ⟶ C₆H₁₂O₆ + 6O₂
          </div>
          <div className="text-[11px] font-mono text-emerald-600/65">
            ΔH° = +2803 kJ &bull; Chlorophyll hν
          </div>
        </div>
      </div>

      {/* Item 41: Hydrocarbon Combustion (Top Center-Right, Warm Amber, Drift: Horizontal-L) */}
      <div ref={registerItem(41)} className="absolute top-2 right-[36%] sm:top-3 sm:right-[36%] text-right font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-amber-600/75 animate-path-diag-br-tl">
          <div className="text-xs sm:text-sm font-bold tracking-tight text-amber-700/90">
            CH₄ + 2O₂ ⟶ CO₂ + 2H₂O
          </div>
          <div className="text-[11px] font-mono text-amber-600/65">
            ΔH° = -890.3 kJ/mol &bull; Exothermic
          </div>
        </div>
      </div>

      {/* Item 42: Euler's Complex Formula (Top Mid-Left, Electric Indigo, Drift: Orbit-CW) */}
      <div ref={registerItem(42)} className="absolute top-12 left-[33%] sm:top-14 sm:left-[33%] font-serif hidden xl:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-indigo-600/75 animate-path-diag-bl-tr">
          <div className="text-xs sm:text-sm font-extrabold italic text-indigo-700/90">
            e^(iθ) = cos θ + i sin θ
          </div>
          <div className="text-[11px] font-mono text-indigo-600/65">
            |e^(iθ)| = 1 &bull; Arg(z) = θ
          </div>
        </div>
      </div>

      {/* Item 43: Nernst Electrochemistry Equation (Top Mid-Right, Royal Violet, Drift: Orbit-CCW) */}
      <div ref={registerItem(43)} className="absolute top-12 right-[33%] sm:top-14 sm:right-[33%] text-right font-serif hidden xl:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-violet-600/75 animate-path-diag-tr-bl">
          <div className="text-xs sm:text-sm font-bold italic text-violet-700/90">
            E = E° - (RT/nF) ln Q
          </div>
          <div className="text-[11px] font-mono text-violet-600/65">
            ΔG = -nFE &bull; F = 96485 C/mol
          </div>
        </div>
      </div>

      {/* Item 44: Henderson-Hasselbalch Buffer (Bottom Center, Deep Sea Teal, Drift: Horizontal-R) */}
      <div ref={registerItem(44)} className="absolute bottom-1 left-[44%] -translate-x-1/2 sm:bottom-2 font-serif hidden md:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-center text-teal-600/75 animate-path-steep-up-right">
          <div className="text-xs sm:text-sm font-bold italic text-teal-700/90">
            pH = pK_a + log([A⁻]/[HA])
          </div>
          <div className="text-[11px] font-mono text-teal-600/65">
            K_w = [H⁺][OH⁻] = 1.0 × 10⁻¹⁴
          </div>
        </div>
      </div>

      {/* Item 45: Maxwell's Gauss Laws (Bottom Mid-Left, Cobalt Blue, Drift: Vertical-U) */}
      <div ref={registerItem(45)} className="absolute bottom-10 left-[35%] sm:bottom-12 sm:left-[35%] font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-blue-600/75 animate-path-steep-down-left">
          <div className="text-xs sm:text-sm font-bold italic text-blue-700/90">
            ∇ · E = ρ / ε₀
          </div>
          <div className="text-[11px] font-mono text-blue-600/65">
            ∇ · B = 0 &bull; No monopoles
          </div>
        </div>
      </div>

      {/* Item 46: van der Waals Real Gas Equation (Bottom Mid-Right, Ruby Crimson, Drift: Vertical-D) */}
      <div ref={registerItem(46)} className="absolute bottom-10 right-[35%] sm:bottom-12 sm:right-[35%] text-right font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-rose-600/75 animate-path-shallow-right">
          <div className="text-xs sm:text-sm font-bold italic text-rose-700/90">
            (P + a/V²)(V - b) = RT
          </div>
          <div className="text-[11px] font-mono text-rose-600/65">
            Z = PV / nRT &bull; T_c = 8a/(27Rb)
          </div>
        </div>
      </div>

      {/* Item 47: Organic Esterification Mechanism (Mid-Left Gap, Ruby Crimson, Drift: Up-Right) */}
      <div ref={registerItem(47)} className="absolute top-[22%] left-[16%] sm:top-[24%] sm:left-[17%] font-serif hidden md:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-rose-600/75 animate-path-shallow-left">
          <div className="text-xs sm:text-sm font-bold text-rose-700/90">
            R-COOH + R'OH ⇌ R-COOR' + H₂O
          </div>
          <div className="text-[11px] font-mono text-rose-600/65">
            C₂H₅OH ⟶ C₂H₄ + H₂O (conc. H₂SO₄)
          </div>
        </div>
      </div>

      {/* Item 48: Binomial Probability & Bayes (Mid-Left Gap, Sky Blue, Drift: Figure-8) */}
      <div ref={registerItem(48)} className="absolute top-[34%] left-[21%] sm:top-[36%] sm:left-[21%] font-serif hidden md:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-sky-600/75 animate-path-left-to-right">
          <div className="text-xs sm:text-sm font-bold italic text-sky-700/90">
            (x+y)ⁿ = ∑ ⁿC_k x^(n-k) y^k
          </div>
          <div className="text-[11px] font-mono text-sky-600/65">
            P(A|B) = P(B|A)P(A) / P(B)
          </div>
        </div>
      </div>

      {/* Item 49: Coulomb's Electrostatic Law (Mid-Left Lower Gap, Electric Cyan, Drift: Down-Right) */}
      <div ref={registerItem(49)} className="absolute top-[54%] left-[24%] sm:top-[56%] sm:left-[24%] font-serif hidden md:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-cyan-600/75 animate-path-top-to-bottom">
          <div className="text-xs sm:text-sm font-bold italic text-cyan-700/90">
            F = (1/4πε₀) · (|q₁q₂| / r²)
          </div>
          <div className="text-[11px] font-mono text-cyan-600/65">
            V = (1/4πε₀) · (q/r) &bull; U = qV
          </div>
        </div>
      </div>

      {/* Item 50: Radioactive Half-Life & Decay (Mid-Left Bottom Gap, Amethyst Purple, Drift: Diagonal-2) */}
      <div ref={registerItem(50)} className="absolute top-[72%] left-[26%] sm:top-[74%] sm:left-[26%] font-serif hidden md:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-purple-600/75 animate-path-right-to-left">
          <div className="text-xs sm:text-sm font-bold italic text-purple-700/90">
            N(t) = N₀ e^(-λt)
          </div>
          <div className="text-[11px] font-mono text-purple-600/65">
            t₁/₂ = ln(2) / λ &bull; A = λN
          </div>
        </div>
      </div>

      {/* Item 51: Nuclear Fission Reaction (Mid-Right Gap, Cobalt Blue, Drift: Up-Left) */}
      <div ref={registerItem(51)} className="absolute top-[22%] right-[16%] sm:top-[24%] right-[17%] text-right font-serif hidden md:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-blue-600/75 animate-path-bottom-to-top">
          <div className="text-xs sm:text-sm font-bold text-blue-700/90">
            ²³⁵U + n ⟶ ¹⁴¹Ba + ⁹²Kr + 3n
          </div>
          <div className="text-[11px] font-mono text-blue-600/65">
            Q ≈ 200 MeV &bull; E = Δm · c²
          </div>
        </div>
      </div>

      {/* Item 52: Laplace Transform & Oscillations (Mid-Right Gap, Royal Violet, Drift: Down-Left) */}
      <div ref={registerItem(52)} className="absolute top-[34%] right-[22%] sm:top-[36%] right-[22%] text-right font-serif hidden md:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-violet-600/75 animate-path-diag-tl-br">
          <div className="text-xs sm:text-sm font-bold italic text-violet-700/90">
            ℒ{'{f(t)}'} = ∫₀^∞ e^(-st) f(t) dt
          </div>
          <div className="text-[11px] font-mono text-violet-600/65">
            y'' + ω²y = 0 &bull; y(t) = A cos(ωt)
          </div>
        </div>
      </div>

      {/* Item 53: Lorentz Force Law & Faraday (Mid-Right Lower Gap, Vivid Coral, Drift: Orbit-CCW) */}
      <div ref={registerItem(53)} className="absolute top-[54%] right-[24%] sm:top-[56%] right-[24%] text-right font-serif hidden md:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-orange-600/75 animate-path-diag-br-tl">
          <div className="text-xs sm:text-sm font-bold italic text-orange-700/90">
            F = q(E + v × B)
          </div>
          <div className="text-[11px] font-mono text-orange-600/65">
            ℰ = -dΦ_B / dt &bull; B = μ₀nI
          </div>
        </div>
      </div>

      {/* Item 54: Gibbs-Helmholtz Equilibrium (Mid-Right Bottom Gap, Golden Amber, Drift: Up-Left) */}
      <div ref={registerItem(54)} className="absolute top-[72%] right-[26%] sm:top-[74%] right-[26%] text-right font-serif hidden md:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-amber-600/75 animate-path-diag-bl-tr">
          <div className="text-xs sm:text-sm font-bold italic text-amber-700/90">
            ΔG° = -RT ln K_eq
          </div>
          <div className="text-[11px] font-mono text-amber-600/65">
            ΔS_univ = ΔS_sys + ΔS_surr ≥ 0
          </div>
        </div>
      </div>

      {/* Item 55: Taylor Series Expansion (Outer Left Flank, Warm Amber, Drift: Down-Right) */}
      <div ref={registerItem(55)} className="absolute top-[12%] left-2 sm:left-4 font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-amber-600/75 animate-path-diag-tr-bl">
          <div className="text-xs sm:text-sm font-bold italic text-amber-700/90">
            f(x) = ∑ [fⁿ(0)/n!] xⁿ
          </div>
          <div className="text-[11px] font-mono text-amber-600/65">
            sin x = x - x³/3! + x⁵/5! - ...
          </div>
        </div>
      </div>

      {/* Item 56: Gauss Divergence Theorem (Outer Right Flank, Emerald Green, Drift: Down-Left) */}
      <div ref={registerItem(56)} className="absolute top-[12%] right-2 sm:right-4 text-right font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-emerald-600/75 animate-path-steep-up-right">
          <div className="text-xs sm:text-sm font-bold italic text-emerald-700/90">
            ∭_V (∇·F) dV = ∬_S (F·n) dS
          </div>
          <div className="text-[11px] font-mono text-emerald-600/65">
            V - E + F = 2 &bull; Euler Topology
          </div>
        </div>
      </div>

      {/* Item 57: Beer-Lambert Law (Lower Left Flank, Fuchsia Magenta, Drift: Vertical-U) */}
      <div ref={registerItem(57)} className="absolute top-[72%] left-2 sm:left-3 font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-fuchsia-600/75 animate-path-steep-down-left">
          <div className="text-xs sm:text-sm font-bold italic text-fuchsia-700/90">
            A = ε · c · l
          </div>
          <div className="text-[11px] font-mono text-fuchsia-600/65">
            I = I₀ e^(-αx) &bull; %T = 10^(-A)
          </div>
        </div>
      </div>

      {/* Item 58: Kepler's Planetary Laws (Lower Right Flank, Deep Sea Teal, Drift: Vertical-D) */}
      <div ref={registerItem(58)} className="absolute top-[72%] right-2 sm:right-3 text-right font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-teal-600/75 animate-path-shallow-right">
          <div className="text-xs sm:text-sm font-bold italic text-teal-700/90">
            T² = (4π²/GM) · r³
          </div>
          <div className="text-[11px] font-mono text-teal-600/65">
            L = r × p = const &bull; dA/dt = const
          </div>
        </div>
      </div>

      {/* =========================================================================
          GROUP 5: NEW SCIENTIFIC DIAGRAMS (SVG Vector Diagrams Filling Empty Spots)
          ========================================================================= */}

      {/* Item 59: Parallel Plate Capacitor Electric Field (Top Center, Electric Cyan, Drift: Sine Wave) */}
      <div ref={registerItem(59)} className="absolute top-16 left-[48%] -translate-x-1/2 hidden xl:block text-cyan-600/65" style={wrapperStyle}>
        <div className="animate-path-shallow-left">
          <svg width="105" height="65" viewBox="0 0 110 70" fill="none" stroke="currentColor" strokeWidth="1.4">
            <line x1="20" y1="15" x2="90" y2="15" strokeWidth="3" />
            <line x1="20" y1="55" x2="90" y2="55" strokeWidth="3" />
            <text x="93" y="18" fontSize="10" fontWeight="bold" fill="currentColor">+</text>
            <text x="93" y="58" fontSize="12" fontWeight="bold" fill="currentColor">-</text>
            <line x1="32" y1="18" x2="32" y2="52" strokeDasharray="3 2" />
            <line x1="55" y1="18" x2="55" y2="52" strokeDasharray="3 2" />
            <line x1="78" y1="18" x2="78" y2="52" strokeDasharray="3 2" />
            <polyline points="52,38 55,42 58,38" />
            <text x="60" y="38" fontSize="8" fill="currentColor" fontStyle="italic">E</text>
            <text x="35" y="8" fontSize="8" fill="currentColor" fontFamily="sans-serif">C = ε₀A/d</text>
          </svg>
        </div>
      </div>

      {/* Item 60: Water Molecule Dipole (H₂O) (Mid-Left Gap, Deep Sea Teal, Drift: Tilt Sway) */}
      <div ref={registerItem(60)} className="absolute top-[26%] left-[29%] hidden lg:block text-teal-600/65" style={wrapperStyle}>
        <div className="animate-path-left-to-right">
          <svg width="95" height="85" viewBox="0 0 100 90" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="50" cy="30" r="14" fill="currentColor" opacity="0.15" />
            <circle cx="50" cy="30" r="14" strokeWidth="1.8" />
            <text x="45" y="35" fontSize="12" fontWeight="bold" fill="currentColor">O</text>
            <text x="44" y="12" fontSize="8" fill="currentColor">δ⁻</text>
            <line x1="40" y1="39" x2="22" y2="60" strokeWidth="2" />
            <circle cx="18" cy="65" r="9" strokeWidth="1.5" />
            <text x="14" y="69" fontSize="9" fontWeight="bold" fill="currentColor">H</text>
            <text x="8" y="80" fontSize="8" fill="currentColor">δ⁺</text>
            <line x1="60" y1="39" x2="78" y2="60" strokeWidth="2" />
            <circle cx="82" cy="65" r="9" strokeWidth="1.5" />
            <text x="78" y="69" fontSize="9" fontWeight="bold" fill="currentColor">H</text>
            <text x="88" y="80" fontSize="8" fill="currentColor">δ⁺</text>
            <path d="M 33,48 A 20,20 0 0,0 67,48" strokeDasharray="2 2" strokeWidth="1" />
            <text x="40" y="58" fontSize="8" fill="currentColor">104.5°</text>
          </svg>
        </div>
      </div>

      {/* Item 61: Wheatstone Bridge Electrical Diamond (Mid-Left Gap, Electric Indigo, Drift: Diagonal-1) */}
      <div ref={registerItem(61)} className="absolute top-[46%] left-[28%] hidden lg:block text-indigo-600/65" style={wrapperStyle}>
        <div className="animate-path-top-to-bottom">
          <svg width="100" height="95" viewBox="0 0 100 95" fill="none" stroke="currentColor" strokeWidth="1.4">
            <polygon points="50,10 90,48 50,85 10,48" strokeWidth="1.6" />
            <line x1="10" y1="48" x2="90" y2="48" strokeDasharray="3 2" strokeWidth="1.2" />
            <circle cx="50" cy="48" r="8" fill="white" strokeWidth="1.3" />
            <text x="47" y="52" fontSize="9" fontWeight="bold" fill="currentColor">G</text>
            <text x="24" y="26" fontSize="8" fill="currentColor">R₁</text>
            <text x="70" y="26" fontSize="8" fill="currentColor">R₂</text>
            <text x="24" y="74" fontSize="8" fill="currentColor">R₃</text>
            <text x="70" y="74" fontSize="8" fill="currentColor">R₄</text>
          </svg>
        </div>
      </div>

      {/* Item 62: Tetrahedral Methane Molecule (CH₄) (Mid-Left Lower Gap, Emerald Green, Drift: Orbit-CW) */}
      <div ref={registerItem(62)} className="absolute top-[62%] left-[29%] hidden lg:block text-emerald-600/65" style={wrapperStyle}>
        <div className="animate-path-right-to-left">
          <svg width="95" height="90" viewBox="0 0 100 95" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="50" cy="50" r="12" fill="currentColor" opacity="0.15" />
            <circle cx="50" cy="50" r="12" strokeWidth="1.8" />
            <text x="46" y="54" fontSize="11" fontWeight="bold" fill="currentColor">C</text>
            <line x1="50" y1="38" x2="50" y2="15" strokeWidth="2" />
            <circle cx="50" cy="12" r="7" strokeWidth="1.4" />
            <text x="47" y="15" fontSize="8" fontWeight="bold" fill="currentColor">H</text>
            <line x1="40" y1="58" x2="18" y2="76" strokeWidth="2.5" />
            <circle cx="15" cy="79" r="7" strokeWidth="1.4" />
            <text x="12" y="82" fontSize="8" fontWeight="bold" fill="currentColor">H</text>
            <line x1="60" y1="58" x2="82" y2="76" strokeWidth="1.5" strokeDasharray="3 2" />
            <circle cx="85" cy="79" r="7" strokeWidth="1.4" />
            <text x="82" y="82" fontSize="8" fontWeight="bold" fill="currentColor">H</text>
            <text x="60" y="32" fontSize="8" fill="currentColor">109.5°</text>
          </svg>
        </div>
      </div>

      {/* Item 63: Solenoid Coil Magnetic Induction (Mid-Right Gap, Electric Cyan, Drift: Figure-8) */}
      <div ref={registerItem(63)} className="absolute top-[26%] right-[29%] hidden lg:block text-cyan-600/65" style={wrapperStyle}>
        <div className="animate-path-bottom-to-top">
          <svg width="105" height="75" viewBox="0 0 110 80" fill="none" stroke="currentColor" strokeWidth="1.4">
            <ellipse cx="25" cy="40" rx="8" ry="25" strokeWidth="1.6" />
            <ellipse cx="45" cy="40" rx="8" ry="25" strokeWidth="1.6" />
            <ellipse cx="65" cy="40" rx="8" ry="25" strokeWidth="1.6" />
            <ellipse cx="85" cy="40" rx="8" ry="25" strokeWidth="1.6" />
            <line x1="5" y1="40" x2="105" y2="40" strokeDasharray="4 2" strokeWidth="1.2" />
            <polyline points="100,37 105,40 100,43" strokeWidth="1.2" />
            <text x="96" y="32" fontSize="9" fill="currentColor" fontStyle="italic">B</text>
            <text x="45" y="75" fontSize="8" fill="currentColor">B = μ₀nI</text>
          </svg>
        </div>
      </div>

      {/* Item 64: Electronic Logic AND/OR Gates (Mid-Right Gap, Electric Indigo, Drift: Horizontal-R) */}
      <div ref={registerItem(64)} className="absolute top-[46%] right-[28%] hidden lg:block text-indigo-600/65" style={wrapperStyle}>
        <div className="animate-path-diag-tl-br">
          <svg width="105" height="80" viewBox="0 0 110 80" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M 15,15 L 45,15 C 60,15 65,30 65,30 C 65,30 60,45 45,45 L 15,45 Z" strokeWidth="1.6" />
            <line x1="5" y1="23" x2="15" y2="23" strokeWidth="1.3" />
            <line x1="5" y1="37" x2="15" y2="37" strokeWidth="1.3" />
            <line x1="65" y1="30" x2="85" y2="30" strokeWidth="1.3" />
            <text x="2" y="24" fontSize="7" fill="currentColor">A</text>
            <text x="2" y="39" fontSize="7" fill="currentColor">B</text>
            <text x="88" y="33" fontSize="8" fontWeight="bold" fill="currentColor">Y=A·B</text>
            <text x="28" y="34" fontSize="8" fill="currentColor">AND</text>
          </svg>
        </div>
      </div>

      {/* Item 65: Double Slit Wave Interference (Mid-Right Lower Gap, Sky Blue, Drift: Sine Wave) */}
      <div ref={registerItem(65)} className="absolute top-[62%] right-[29%] hidden lg:block text-sky-600/65" style={wrapperStyle}>
        <div className="animate-path-diag-br-tl">
          <svg width="105" height="80" viewBox="0 0 110 80" fill="none" stroke="currentColor" strokeWidth="1.4">
            <line x1="20" y1="10" x2="20" y2="32" strokeWidth="2.5" />
            <line x1="20" y1="38" x2="20" y2="52" strokeWidth="2.5" />
            <line x1="20" y1="58" x2="20" y2="75" strokeWidth="2.5" />
            <path d="M 22,35 A 25,25 0 0,1 60,15" strokeDasharray="2 2" strokeWidth="1" />
            <path d="M 22,55 A 25,25 0 0,1 60,75" strokeDasharray="2 2" strokeWidth="1" />
            <line x1="85" y1="10" x2="85" y2="75" strokeWidth="1.5" />
            <path d="M 85,25 Q 98,25 85,32 Q 102,40 85,48 Q 98,55 85,62" fill="none" strokeWidth="1.5" />
            <text x="40" y="78" fontSize="8" fill="currentColor">d sin θ = mλ</text>
          </svg>
        </div>
      </div>

      {/* Item 66: Hooke's Spring-Mass Oscillator (Bottom Center, Warm Amber, Drift: Pendulum Arc) */}
      <div ref={registerItem(66)} className="absolute bottom-16 left-[48%] -translate-x-1/2 hidden xl:block text-amber-600/65" style={wrapperStyle}>
        <div className="animate-path-diag-bl-tr">
          <svg width="105" height="75" viewBox="0 0 110 75" fill="none" stroke="currentColor" strokeWidth="1.4">
            <line x1="10" y1="38" x2="10" y2="8" strokeWidth="3" />
            <path d="M 10,25 L 20,15 L 28,35 L 36,15 L 44,35 L 52,15 L 60,35 L 68,25" strokeWidth="1.6" />
            <rect x="68" y="15" width="22" height="20" rx="2" strokeWidth="1.6" fill="currentColor" opacity="0.15" />
            <rect x="68" y="15" width="22" height="20" rx="2" strokeWidth="1.6" />
            <text x="75" y="29" fontSize="9" fontWeight="bold" fill="currentColor">m</text>
            <line x1="90" y1="25" x2="105" y2="25" strokeWidth="1.3" />
            <polyline points="101,22 105,25 101,28" strokeWidth="1.3" />
            <text x="35" y="55" fontSize="8" fill="currentColor">F = -kx &bull; T = 2π√(m/k)</text>
          </svg>
        </div>
      </div>

      {/* Item 67: Resistor-Capacitor Circuit (Outer Left Flank, Royal Cobalt, Drift: Horizontal-R) */}
      <div ref={registerItem(67)} className="absolute top-[44%] left-2 sm:left-3 hidden xl:block text-blue-600/65" style={wrapperStyle}>
        <div className="animate-path-diag-tr-bl">
          <svg width="95" height="80" viewBox="0 0 100 80" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="15" y="15" width="70" height="50" rx="3" strokeWidth="1.5" />
            <rect x="35" y="10" width="30" height="10" fill="white" strokeWidth="1.5" />
            <text x="45" y="18" fontSize="8" fontWeight="bold" fill="currentColor">R</text>
            <line x1="42" y1="60" x2="42" y2="70" strokeWidth="2.5" />
            <line x1="50" y1="58" x2="50" y2="72" strokeWidth="2.5" />
            <text x="42" y="52" fontSize="8" fontWeight="bold" fill="currentColor">C</text>
            <text x="25" y="42" fontSize="7" fill="currentColor">τ = RC</text>
          </svg>
        </div>
      </div>

      {/* Item 68: Unit Trigonometric Circle (Outer Right Flank, Ruby Crimson, Drift: Horizontal-L) */}
      <div ref={registerItem(68)} className="absolute top-[44%] right-2 sm:right-3 hidden xl:block text-rose-600/65" style={wrapperStyle}>
        <div className="animate-path-steep-up-right">
          <svg width="95" height="90" viewBox="0 0 100 90" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="50" cy="45" r="32" strokeWidth="1.6" />
            <line x1="12" y1="45" x2="88" y2="45" strokeWidth="1.2" />
            <line x1="50" y1="8" x2="50" y2="82" strokeWidth="1.2" />
            <line x1="50" y1="45" x2="74" y2="24" strokeWidth="1.6" />
            <circle cx="74" cy="24" r="2.5" fill="currentColor" />
            <path d="M 62,45 A 12,12 0 0,0 60,37" strokeWidth="1" />
            <text x="64" y="42" fontSize="7" fontStyle="italic" fill="currentColor">θ</text>
            <text x="30" y="88" fontSize="7" fill="currentColor">sin²θ + cos²θ = 1</text>
          </svg>
        </div>
      </div>

      {/* Item 69: Atwood's Machine Pulley System (Bottom Outer Left, Vivid Coral, Drift: Pendulum Arc) */}
      <div ref={registerItem(69)} className="absolute top-[86%] left-6 sm:left-12 hidden xl:block text-orange-600/65" style={wrapperStyle}>
        <div className="animate-path-steep-down-left">
          <svg width="85" height="90" viewBox="0 0 90 95" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="45" cy="25" r="14" strokeWidth="1.8" />
            <circle cx="45" cy="25" r="3" fill="currentColor" />
            <line x1="31" y1="25" x2="31" y2="65" strokeWidth="1.5" />
            <rect x="23" y="65" width="16" height="18" rx="1" strokeWidth="1.5" />
            <text x="27" y="78" fontSize="8" fontWeight="bold" fill="currentColor">m₁</text>
            <line x1="59" y1="25" x2="59" y2="52" strokeWidth="1.5" />
            <rect x="52" y="52" width="14" height="15" rx="1" strokeWidth="1.5" />
            <text x="55" y="63" fontSize="8" fontWeight="bold" fill="currentColor">m₂</text>
            <text x="28" y="92" fontSize="7" fill="currentColor">a = (m₁-m₂)g/(m₁+m₂)</text>
          </svg>
        </div>
      </div>

      {/* Item 70: Functionalized Benzene Ring (Bottom Outer Right, Spring Lime, Drift: Orbit-CW) */}
      <div ref={registerItem(70)} className="absolute top-[86%] right-6 sm:right-12 hidden xl:block text-lime-600/65" style={wrapperStyle}>
        <div className="animate-path-shallow-right">
          <svg width="85" height="95" viewBox="0 0 90 100" fill="none" stroke="currentColor" strokeWidth="1.4">
            <polygon points="45,25 75,42 75,76 45,93 15,76 15,42" strokeWidth="1.8" />
            <circle cx="45" cy="59" r="18" strokeDasharray="3 2" strokeWidth="1.3" />
            <line x1="45" y1="25" x2="45" y2="12" strokeWidth="1.8" />
            <text x="37" y="10" fontSize="10" fontWeight="bold" fill="currentColor">OH</text>
            <text x="22" y="99" fontSize="7" fill="currentColor">Phenol (C₆H₅OH)</text>
          </svg>
        </div>
      </div>

      {/* =========================================================================
          GROUP 6: EXTRA GREEK & SCIENCE CONSTANTS (Filling Open Canvas Crevices)
          ========================================================================= */}

      {/* Item 71: γ (Lorentz Gamma factor) */}
      <div ref={registerItem(71)} className="absolute top-[18%] left-[10%] hidden md:block font-serif font-bold text-2xl sm:text-3xl text-emerald-600/70" style={wrapperStyle}>
        <div className="animate-path-shallow-left">γ</div>
      </div>

      {/* Item 72: ε₀ (Vacuum Permittivity) */}
      <div ref={registerItem(72)} className="absolute top-[18%] right-[11%] hidden md:block font-serif font-bold text-xl sm:text-2xl text-blue-600/70" style={wrapperStyle}>
        <div className="animate-path-left-to-right">ε₀</div>
      </div>

      {/* Item 73: τ (Torque / Time Constant) */}
      <div ref={registerItem(73)} className="absolute bottom-[36%] left-[12%] hidden md:block font-serif font-bold text-3xl sm:text-4xl text-amber-600/70" style={wrapperStyle}>
        <div className="animate-path-top-to-bottom">τ</div>
      </div>

      {/* Item 74: ω (Angular Frequency) */}
      <div ref={registerItem(74)} className="absolute bottom-[36%] right-[12%] hidden md:block font-serif font-bold text-3xl sm:text-4xl text-violet-600/70" style={wrapperStyle}>
        <div className="animate-path-right-to-left">ω</div>
      </div>

      {/* Item 75: ∂ (Partial Derivative Operator) */}
      <div ref={registerItem(75)} className="absolute top-[50%] left-[12%] hidden md:block font-serif font-extrabold text-4xl sm:text-5xl text-rose-600/70" style={wrapperStyle}>
        <div className="animate-path-bottom-to-top">∂</div>
      </div>

      {/* Item 76: ∇× (Curl Vector Operator) */}
      <div ref={registerItem(76)} className="absolute top-[50%] right-[12%] hidden md:block font-serif font-extrabold text-2xl sm:text-3xl text-indigo-600/70" style={wrapperStyle}>
        <div className="animate-path-diag-tl-br">∇×</div>
      </div>

      {/* Item 77: ℵ₀ (Aleph-Null Cardinality) */}
      <div ref={registerItem(77)} className="absolute bottom-[20%] left-[16%] hidden lg:block font-serif font-bold text-2xl sm:text-3xl text-teal-600/70" style={wrapperStyle}>
        <div className="animate-path-diag-br-tl">ℵ₀</div>
      </div>

      {/* Item 78: ⊗ (Tensor Product) */}
      <div ref={registerItem(78)} className="absolute bottom-[20%] right-[16%] hidden lg:block font-serif font-bold text-2xl sm:text-3xl text-sky-600/70" style={wrapperStyle}>
        <div className="animate-path-diag-bl-tr">⊗</div>
      </div>
      {/* =========================================================================
          GROUP 7: HIGHER DIMENSIONS & 3D GEOMETRY SCHEMATICS (More Dimensions!)
          ========================================================================= */}

      {/* Item 79: 4D Hypercube / Tesseract Wireframe Projection (Electric Indigo, Drift: Figure-8) */}
      <div ref={registerItem(79)} className="absolute top-[6%] left-[20%] hidden lg:block text-indigo-600/70" style={wrapperStyle}>
        <div className="animate-path-diag-tr-bl">
          <svg width="105" height="100" viewBox="0 0 110 105" fill="none" stroke="currentColor" strokeWidth="1.4">
            {/* Outer 3D Cube */}
            <polygon points="15,28 65,28 65,78 15,78" strokeWidth="1.6" />
            <polygon points="35,12 85,12 85,62 35,62" strokeWidth="1.3" strokeDasharray="3 2" />
            <line x1="15" y1="28" x2="35" y2="12" strokeWidth="1.4" />
            <line x1="65" y1="28" x2="85" y2="12" strokeWidth="1.4" />
            <line x1="65" y1="78" x2="85" y2="62" strokeWidth="1.4" />
            <line x1="15" y1="78" x2="35" y2="62" strokeWidth="1.4" />
            {/* Inner 3D Cube (4th Dimension Projection) */}
            <polygon points="32,44 55,44 55,67 32,67" strokeWidth="1.5" />
            <polygon points="42,36 65,36 65,59 42,59" strokeWidth="1.2" strokeDasharray="2 2" />
            <line x1="32" y1="44" x2="42" y2="36" strokeWidth="1.2" />
            <line x1="55" y1="44" x2="65" y2="36" strokeWidth="1.2" />
            <line x1="55" y1="67" x2="65" y2="59" strokeWidth="1.2" />
            <line x1="32" y1="67" x2="42" y2="59" strokeWidth="1.2" />
            {/* 4D Hyper-edges connecting inner to outer vertices */}
            <line x1="15" y1="28" x2="32" y2="44" strokeWidth="1.2" strokeDasharray="3 2" />
            <line x1="65" y1="28" x2="55" y2="44" strokeWidth="1.2" strokeDasharray="3 2" />
            <line x1="65" y1="78" x2="55" y2="67" strokeWidth="1.2" strokeDasharray="3 2" />
            <line x1="15" y1="78" x2="32" y2="67" strokeWidth="1.2" strokeDasharray="3 2" />
            <text x="14" y="96" fontSize="8" fontWeight="bold" fill="currentColor">4D Tesseract (2⁴=16V, 32E)</text>
          </svg>
        </div>
      </div>

      {/* Item 80: 3D Cartesian Coordinate Sphere & Basis Vectors (Sky Blue, Drift: Sine Wave) */}
      <div ref={registerItem(80)} className="absolute top-[6%] right-[20%] hidden lg:block text-sky-600/70" style={wrapperStyle}>
        <div className="animate-path-steep-up-right">
          <svg width="105" height="100" viewBox="0 0 110 105" fill="none" stroke="currentColor" strokeWidth="1.4">
            {/* 3D Axes */}
            <line x1="55" y1="52" x2="98" y2="52" strokeWidth="1.6" />
            <polyline points="94,49 98,52 94,55" />
            <text x="100" y="55" fontSize="9" fontWeight="bold" fill="currentColor">y</text>
            <line x1="55" y1="52" x2="55" y2="10" strokeWidth="1.6" />
            <polyline points="52,14 55,10 58,14" />
            <text x="52" y="8" fontSize="9" fontWeight="bold" fill="currentColor">z</text>
            <line x1="55" y1="52" x2="22" y2="80" strokeWidth="1.6" />
            <polyline points="23,75 22,80 27,78" />
            <text x="14" y="86" fontSize="9" fontWeight="bold" fill="currentColor">x</text>
            {/* Sphere Equator & Meridian Wireframe */}
            <circle cx="55" cy="52" r="34" strokeDasharray="4 2" strokeWidth="1.1" />
            <ellipse cx="55" cy="52" rx="34" ry="12" strokeWidth="1.2" />
            {/* Basis Vector r */}
            <line x1="55" y1="52" x2="78" y2="28" strokeWidth="1.8" />
            <circle cx="78" cy="28" r="2.5" fill="currentColor" />
            <text x="82" y="27" fontSize="8" fontStyle="italic" fill="currentColor">r(θ,φ)</text>
            <text x="32" y="100" fontSize="7.5" fill="currentColor">x² + y² + z² = r²</text>
          </svg>
        </div>
      </div>

      {/* Item 81: 3D Torus Donut Topology (Emerald Green, Drift: Orbit-CW) */}
      <div ref={registerItem(81)} className="absolute top-[62%] left-[17%] hidden lg:block text-emerald-600/70" style={wrapperStyle}>
        <div className="animate-path-steep-down-left">
          <svg width="105" height="75" viewBox="0 0 110 80" fill="none" stroke="currentColor" strokeWidth="1.4">
            {/* Outer boundary */}
            <ellipse cx="55" cy="40" rx="46" ry="24" strokeWidth="1.6" />
            {/* Inner hole */}
            <ellipse cx="55" cy="40" rx="19" ry="9" strokeWidth="1.5" />
            {/* Torus wireframe meridians */}
            <ellipse cx="30" cy="40" rx="10" ry="21" strokeDasharray="3 2" strokeWidth="1" />
            <ellipse cx="80" cy="40" rx="10" ry="21" strokeDasharray="3 2" strokeWidth="1" />
            <line x1="55" y1="40" x2="80" y2="40" strokeWidth="1.2" />
            <text x="64" y="37" fontSize="8" fontStyle="italic" fill="currentColor">R</text>
            <text x="22" y="74" fontSize="8" fill="currentColor">T² Torus: V = 2π²Rr²</text>
          </svg>
        </div>
      </div>

      {/* Item 82: 3D Hyperbolic Paraboloid / Saddle Surface (Amethyst Violet, Drift: Orbit-CCW) */}
      <div ref={registerItem(82)} className="absolute top-[62%] right-[17%] hidden lg:block text-violet-600/70" style={wrapperStyle}>
        <div className="animate-path-shallow-right">
          <svg width="105" height="75" viewBox="0 0 110 80" fill="none" stroke="currentColor" strokeWidth="1.4">
            {/* Saddle wireframe curves */}
            <path d="M 15,22 Q 55,60 95,22" strokeWidth="1.6" />
            <path d="M 20,40 Q 55,75 90,40" strokeWidth="1.2" strokeDasharray="3 2" />
            <path d="M 35,70 Q 55,30 75,70" strokeWidth="1.6" />
            <path d="M 22,50 Q 55,18 88,50" strokeWidth="1.2" strokeDasharray="3 2" />
            <line x1="55" y1="12" x2="55" y2="68" strokeDasharray="2 2" strokeWidth="1" />
            <circle cx="55" cy="42" r="2.5" fill="currentColor" />
            <text x="59" y="44" fontSize="7" fill="currentColor">Saddle (0,0,0)</text>
            <text x="26" y="76" fontSize="8" fill="currentColor">z = (x²/a²) - (y²/b²)</text>
          </svg>
        </div>
      </div>

      {/* Item 83: Möbius Strip Non-orientable 2-Manifold (Warm Golden Amber, Drift: Tilt Sway) */}
      <div ref={registerItem(83)} className="absolute bottom-[17%] left-[27%] hidden xl:block text-amber-600/70" style={wrapperStyle}>
        <div className="animate-path-shallow-left">
          <svg width="100" height="70" viewBox="0 0 110 75" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M 18,38 C 18,15 50,15 65,38 C 80,60 100,55 95,38 C 90,20 65,30 50,45 C 35,60 18,55 18,38 Z" strokeWidth="1.6" />
            <path d="M 24,38 C 24,22 48,22 62,38 C 76,54 94,50 90,38" strokeDasharray="3 2" strokeWidth="1.2" />
            <circle cx="65" cy="38" r="2" fill="currentColor" />
            <text x="20" y="71" fontSize="8" fill="currentColor">Möbius Strip (χ = 0, 1-Sided)</text>
          </svg>
        </div>
      </div>

      {/* Item 84: 3D Cone & Cylinder Differential Element (Ruby Crimson, Drift: Vertical-U) */}
      <div ref={registerItem(84)} className="absolute bottom-[17%] right-[27%] hidden xl:block text-rose-600/70" style={wrapperStyle}>
        <div className="animate-path-left-to-right">
          <svg width="95" height="75" viewBox="0 0 100 80" fill="none" stroke="currentColor" strokeWidth="1.4">
            {/* Cylinder Base */}
            <ellipse cx="50" cy="62" rx="36" ry="12" strokeWidth="1.5" />
            {/* Cone Lines */}
            <line x1="50" y1="14" x2="14" y2="62" strokeWidth="1.6" />
            <line x1="50" y1="14" x2="86" y2="62" strokeWidth="1.6" />
            <line x1="50" y1="14" x2="50" y2="62" strokeDasharray="3 2" strokeWidth="1.2" />
            <text x="52" y="40" fontSize="8" fontStyle="italic" fill="currentColor">h</text>
            <line x1="50" y1="62" x2="86" y2="62" strokeDasharray="2 2" strokeWidth="1.2" />
            <text x="65" y="60" fontSize="8" fontStyle="italic" fill="currentColor">r</text>
            <text x="18" y="77" fontSize="7.5" fill="currentColor">V = ⅓πr²h &bull; l = √(r²+h²)</text>
          </svg>
        </div>
      </div>

      {/* =========================================================================
          GROUP 8: BIOLOGY & CELLULAR SCHEMATICS (Bio Diagrams!)
          ========================================================================= */}

      {/* Item 85: Neuron Cell & Synapse Action Potential (Emerald Green, Drift: Horizontal-R) */}
      <div ref={registerItem(85)} className="absolute top-[37%] left-[15%] hidden lg:block text-emerald-600/70" style={wrapperStyle}>
        <div className="animate-path-top-to-bottom">
          <svg width="115" height="90" viewBox="0 0 120 95" fill="none" stroke="currentColor" strokeWidth="1.4">
            {/* Soma / Cell body */}
            <circle cx="30" cy="45" r="14" fill="currentColor" opacity="0.12" />
            <circle cx="30" cy="45" r="14" strokeWidth="1.6" />
            <circle cx="30" cy="45" r="4.5" fill="currentColor" />
            {/* Dendrites */}
            <path d="M 18,36 L 8,26 M 16,45 L 5,45 M 18,55 L 7,65 M 26,32 L 20,20 M 34,32 L 35,18" strokeWidth="1.4" />
            {/* Axon & Myelin Sheaths */}
            <line x1="44" y1="45" x2="105" y2="45" strokeWidth="1.8" />
            <rect x="48" y="41" width="12" height="8" rx="2" strokeWidth="1.2" />
            <rect x="66" y="41" width="12" height="8" rx="2" strokeWidth="1.2" />
            <rect x="84" y="41" width="12" height="8" rx="2" strokeWidth="1.2" />
            {/* Synaptic Terminals */}
            <path d="M 105,45 L 115,36 M 105,45 L 118,45 M 105,45 L 115,54" strokeWidth="1.4" />
            <circle cx="115" cy="36" r="2" fill="currentColor" />
            <circle cx="118" cy="45" r="2" fill="currentColor" />
            <circle cx="115" cy="54" r="2" fill="currentColor" />
            <text x="14" y="86" fontSize="7.5" fill="currentColor">Neuron: ΔV = -70 → +40 mV</text>
          </svg>
        </div>
      </div>

      {/* Item 86: Mitochondria Organelle Cross-Section (Vivid Coral, Drift: Up-Left) */}
      <div ref={registerItem(86)} className="absolute top-[37%] right-[15%] hidden lg:block text-orange-600/70" style={wrapperStyle}>
        <div className="animate-path-right-to-left">
          <svg width="115" height="85" viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="1.4">
            {/* Outer Membrane Oval */}
            <ellipse cx="60" cy="42" rx="48" ry="25" strokeWidth="1.8" />
            {/* Inner Membrane Folded Cristae */}
            <path d="M 22,42 Q 35,30 45,42 Q 55,54 65,42 Q 75,30 85,42 Q 95,54 100,42" strokeWidth="1.5" />
            <path d="M 32,32 Q 40,48 50,32 Q 60,16 70,32 Q 80,48 90,32" strokeDasharray="3 2" strokeWidth="1.2" />
            {/* ATP Synthase dots */}
            <circle cx="45" cy="42" r="2" fill="currentColor" />
            <circle cx="65" cy="42" r="2" fill="currentColor" />
            <circle cx="85" cy="42" r="2" fill="currentColor" />
            <text x="18" y="82" fontSize="7.5" fill="currentColor">Mitochondria: C₆H₁₂O₆ → 36 ATP</text>
          </svg>
        </div>
      </div>

      {/* Item 87: Plant Chloroplast Organelle (Lime / Forest Green, Drift: Down-Right) */}
      <div ref={registerItem(87)} className="absolute top-[49%] left-[27%] hidden xl:block text-emerald-600/70" style={wrapperStyle}>
        <div className="animate-path-bottom-to-top">
          <svg width="105" height="80" viewBox="0 0 110 85" fill="none" stroke="currentColor" strokeWidth="1.4">
            <ellipse cx="55" cy="38" rx="44" ry="24" strokeWidth="1.7" />
            {/* Thylakoid Stacks (Grana) */}
            <rect x="25" y="28" width="16" height="4" rx="1.5" strokeWidth="1.2" />
            <rect x="25" y="34" width="16" height="4" rx="1.5" strokeWidth="1.2" />
            <rect x="25" y="40" width="16" height="4" rx="1.5" strokeWidth="1.2" />
            <rect x="50" y="26" width="16" height="4" rx="1.5" strokeWidth="1.2" />
            <rect x="50" y="32" width="16" height="4" rx="1.5" strokeWidth="1.2" />
            <rect x="50" y="38" width="16" height="4" rx="1.5" strokeWidth="1.2" />
            <rect x="50" y="44" width="16" height="4" rx="1.5" strokeWidth="1.2" />
            <rect x="74" y="30" width="16" height="4" rx="1.5" strokeWidth="1.2" />
            <rect x="74" y="36" width="16" height="4" rx="1.5" strokeWidth="1.2" />
            <rect x="74" y="42" width="16" height="4" rx="1.5" strokeWidth="1.2" />
            {/* Stroma Lamellae Interconnects */}
            <line x1="41" y1="34" x2="50" y2="34" strokeWidth="1" />
            <line x1="66" y1="36" x2="74" y2="36" strokeWidth="1" />
            <text x="16" y="76" fontSize="7.5" fill="currentColor">Chloroplast: Thylakoids & Stroma</text>
          </svg>
        </div>
      </div>

      {/* Item 88: Bacteriophage Virus Anatomy (Electric Cyan, Drift: Up-Right) */}
      <div ref={registerItem(88)} className="absolute top-[49%] right-[27%] hidden xl:block text-cyan-600/70" style={wrapperStyle}>
        <div className="animate-path-diag-tl-br">
          <svg width="90" height="95" viewBox="0 0 95 100" fill="none" stroke="currentColor" strokeWidth="1.4">
            {/* Icosahedral Head */}
            <polygon points="48,10 68,22 68,44 48,54 28,44 28,22" strokeWidth="1.6" />
            <line x1="28" y1="22" x2="68" y2="44" strokeDasharray="2 2" strokeWidth="1" />
            <line x1="68" y1="22" x2="28" y2="44" strokeDasharray="2 2" strokeWidth="1" />
            {/* Helical Sheath Neck */}
            <rect x="44" y="54" width="8" height="20" strokeWidth="1.4" />
            <line x1="44" y1="59" x2="52" y2="59" strokeWidth="1" />
            <line x1="44" y1="64" x2="52" y2="64" strokeWidth="1" />
            <line x1="44" y1="69" x2="52" y2="69" strokeWidth="1" />
            {/* Baseplate & Tail Fibers */}
            <line x1="40" y1="74" x2="56" y2="74" strokeWidth="1.8" />
            <path d="M 40,74 L 28,88 L 18,94 M 56,74 L 68,88 L 78,94" strokeWidth="1.4" />
            <path d="M 44,74 L 38,90 M 52,74 L 58,90" strokeWidth="1.4" />
            <text x="16" y="99" fontSize="7.5" fill="currentColor">T4 Bacteriophage Capsid</text>
          </svg>
        </div>
      </div>

      {/* Item 89: Replicated Human Chromosome (Royal Purple, Drift: Down-Left) */}
      <div ref={registerItem(89)} className="absolute bottom-[28%] left-[14%] hidden md:block text-purple-600/70" style={wrapperStyle}>
        <div className="animate-path-diag-br-tl">
          <svg width="85" height="95" viewBox="0 0 90 100" fill="none" stroke="currentColor" strokeWidth="1.4">
            {/* Sister Chromatids X-Shape */}
            <path d="M 28,15 C 38,30 38,45 45,50 C 38,55 38,70 28,85" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 62,15 C 52,30 52,45 45,50 C 52,55 52,70 62,85" strokeWidth="2.2" strokeLinecap="round" />
            {/* Centromere constriction */}
            <circle cx="45" cy="50" r="3.5" fill="currentColor" />
            {/* Banding patterns */}
            <line x1="31" y1="25" x2="37" y2="25" strokeWidth="1.4" />
            <line x1="53" y1="25" x2="59" y2="25" strokeWidth="1.4" />
            <line x1="31" y1="75" x2="37" y2="75" strokeWidth="1.4" />
            <line x1="53" y1="75" x2="59" y2="75" strokeWidth="1.4" />
            <text x="66" y="28" fontSize="7.5" fill="currentColor">p-arm</text>
            <text x="66" y="78" fontSize="7.5" fill="currentColor">q-arm</text>
            <text x="12" y="96" fontSize="7.5" fill="currentColor">Chromosome (2n=46)</text>
          </svg>
        </div>
      </div>

      {/* Item 90: Phospholipid Bilayer Membrane (Cobalt Blue, Drift: Up-Right) */}
      <div ref={registerItem(90)} className="absolute bottom-[28%] right-[14%] hidden md:block text-blue-600/70" style={wrapperStyle}>
        <div className="animate-path-diag-bl-tr">
          <svg width="105" height="80" viewBox="0 0 110 85" fill="none" stroke="currentColor" strokeWidth="1.4">
            {/* Top Phospholipid Heads & Tails */}
            {[18, 32, 46, 60, 74, 88].map((cx) => (
              <g key={`top-${cx}`}>
                <circle cx={cx} cy="22" r="5" strokeWidth="1.4" fill="currentColor" opacity="0.15" />
                <circle cx={cx} cy="22" r="5" strokeWidth="1.4" />
                <path d={`M ${cx-2},27 Q ${cx-4},33 ${cx-2},38 M ${cx+2},27 Q ${cx+4},33 ${cx+2},38`} strokeWidth="1.1" />
              </g>
            ))}
            {/* Bottom Phospholipid Heads & Tails */}
            {[18, 32, 46, 60, 74, 88].map((cx) => (
              <g key={`bot-${cx}`}>
                <circle cx={cx} cy="58" r="5" strokeWidth="1.4" fill="currentColor" opacity="0.15" />
                <circle cx={cx} cy="58" r="5" strokeWidth="1.4" />
                <path d={`M ${cx-2},53 Q ${cx-4},47 ${cx-2},42 M ${cx+2},53 Q ${cx+4},47 ${cx+2},42`} strokeWidth="1.1" />
              </g>
            ))}
            <text x="14" y="76" fontSize="7.5" fill="currentColor">Lipid Bilayer Membrane</text>
          </svg>
        </div>
      </div>

      {/* Item 91: Transfer RNA (tRNA) Cloverleaf Secondary Structure (Pink / Fuchsia, Drift: Diagonal-1) */}
      <div ref={registerItem(91)} className="absolute bottom-[8%] left-[20%] hidden md:block text-pink-600/70" style={wrapperStyle}>
        <div className="animate-path-diag-tr-bl">
          <svg width="90" height="90" viewBox="0 0 95 95" fill="none" stroke="currentColor" strokeWidth="1.4">
            {/* Acceptor stem top */}
            <path d="M 47,12 L 47,32 M 52,12 L 52,32" strokeWidth="1.5" />
            <text x="44" y="10" fontSize="7" fontWeight="bold" fill="currentColor">3'-CCA</text>
            {/* D Loop Left */}
            <path d="M 47,35 C 25,35 15,48 35,52 C 45,52 47,45 47,40" strokeWidth="1.4" />
            {/* TΨC Loop Right */}
            <path d="M 52,35 C 74,35 84,48 64,52 C 54,52 52,45 52,40" strokeWidth="1.4" />
            {/* Anticodon Loop Bottom */}
            <path d="M 47,42 L 47,66 C 36,70 38,82 49,82 C 60,82 62,70 52,66 L 52,42" strokeWidth="1.4" />
            <circle cx="45" cy="81" r="1.5" fill="currentColor" />
            <circle cx="49" cy="81" r="1.5" fill="currentColor" />
            <circle cx="53" cy="81" r="1.5" fill="currentColor" />
            <text x="22" y="93" fontSize="7.5" fill="currentColor">tRNA Anticodon Loop</text>
          </svg>
        </div>
      </div>

      {/* =========================================================================
          GROUP 9: MORE ICONIC MATHEMATICAL FORMULAS
          ========================================================================= */}

      {/* Item 92: Navier-Stokes Fluid Dynamics (Mid-Left Banner, Sky Blue, Drift: Horizontal-R) */}
      <div ref={registerItem(92)} className="absolute top-[28%] left-[34%] font-serif hidden xl:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-sky-600/75 animate-path-steep-up-right">
          <div className="text-xs sm:text-sm font-bold italic text-sky-700/90">
            ρ(∂u/∂t + u·∇u) = -∇p + μ∇²u + f
          </div>
          <div className="text-[11px] font-mono text-sky-600/65">
            ∇ · u = 0 &bull; Incompressible Navier-Stokes
          </div>
        </div>
      </div>

      {/* Item 93: Riemann Zeta Function & Euler Prime Product (Mid-Right Banner, Royal Violet, Drift: Horizontal-L) */}
      <div ref={registerItem(93)} className="absolute top-[28%] right-[34%] text-right font-serif hidden xl:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-violet-600/75 animate-path-steep-down-left">
          <div className="text-xs sm:text-sm font-bold italic text-violet-700/90">
            ζ(s) = ∑ 1/nˢ = ∏ (1 - p⁻ˢ)⁻¹
          </div>
          <div className="text-[11px] font-mono text-violet-600/65">
            Re(s) = ½ &bull; Riemann Hypothesis
          </div>
        </div>
      </div>

      {/* Item 94: Cauchy-Schwarz & Minkowski Inequality (Bottom Center, Cobalt Blue, Drift: Sine Wave) */}
      <div ref={registerItem(94)} className="absolute bottom-[14%] left-[45%] -translate-x-1/2 font-serif hidden md:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-center text-blue-600/75 animate-path-shallow-right">
          <div className="text-xs sm:text-sm font-bold italic text-blue-700/90">
            |⟨u, v⟩|² ≤ ⟨u, u⟩ · ⟨v, v⟩
          </div>
          <div className="text-[11px] font-mono text-blue-600/65">
            ‖u + v‖ ≤ ‖u‖ + ‖v‖ &bull; Triangle Inequality
          </div>
        </div>
      </div>

      {/* Item 95: Cauchy's Complex Residue Theorem (Bottom Outer-Right, Electric Indigo, Drift: Figure-8) */}
      <div ref={registerItem(95)} className="absolute bottom-[2%] right-[24%] text-right font-serif hidden sm:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-indigo-600/75 animate-path-shallow-left">
          <div className="text-xs sm:text-sm font-bold italic text-indigo-700/90">
            ∮_γ f(z) dz = 2πi ∑ Res(f, a_k)
          </div>
          <div className="text-[11px] font-mono text-indigo-600/65">
            f(z) = u(x,y) + i v(x,y) &bull; Cauchy-Riemann
          </div>
        </div>
      </div>

      {/* Item 96: Heisenberg Generalized Uncertainty (Top Center Banner, Royal Violet, Drift: Tilt Sway) */}
      <div ref={registerItem(96)} className="absolute top-[1%] left-[50%] -translate-x-1/2 font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-center text-violet-600/75 animate-path-left-to-right">
          <div className="text-xs sm:text-sm font-bold italic text-violet-700/90">
            σ_A · σ_B ≥ ½ |⟨[Â, B̂]⟩|
          </div>
          <div className="text-[11px] font-mono text-violet-600/65">
            [x̂, p̂] = iℏ &bull; Quantum Commutation
          </div>
        </div>
      </div>

      {/* Item 97: De Moivre's Exponential Theorem (Top Outer-Left, Emerald Green, Drift: Up-Right) */}
      <div ref={registerItem(97)} className="absolute top-[2%] left-[26%] font-serif hidden md:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-emerald-600/75 animate-path-top-to-bottom">
          <div className="text-xs sm:text-sm font-bold italic text-emerald-700/90">
            (cos θ + i sin θ)ⁿ = cos(nθ) + i sin(nθ)
          </div>
          <div className="text-[11px] font-mono text-emerald-600/65">
            z = r e^(iθ) &bull; Polar Decomposition
          </div>
        </div>
      </div>

      {/* Item 98: Golden Ratio Continued Fraction (Top Outer-Right, Fuchsia Magenta, Drift: Down-Left) */}
      <div ref={registerItem(98)} className="absolute top-[2%] right-[26%] text-right font-serif hidden md:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-fuchsia-600/75 animate-path-right-to-left">
          <div className="text-xs sm:text-sm font-bold italic text-fuchsia-700/90">
            φ = 1 + 1/(1 + 1/(1 + ...)) = (1+√5)/2
          </div>
          <div className="text-[11px] font-mono text-fuchsia-600/65">
            φ² = φ + 1 &bull; φ ≈ 1.6180339887...
          </div>
        </div>
      </div>

      {/* Item 99: Prime Number Asymptotic Distribution (Bottom Banner, Warm Amber, Drift: Horizontal-R) */}
      <div ref={registerItem(99)} className="absolute bottom-[1%] left-[50%] -translate-x-1/2 font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-center text-amber-600/75 animate-path-bottom-to-top">
          <div className="text-xs sm:text-sm font-bold italic text-amber-700/90">
            π(x) ~ x / ln(x)
          </div>
          <div className="text-[11px] font-mono text-amber-600/65">
            p_n ~ n ln(n) &bull; Prime Number Theorem
          </div>
        </div>
      </div>

      {/* =========================================================================
          GROUP 10: MORE ICONIC CHEMISTRY EQUATIONS & BIOCHEMISTRY
          ========================================================================= */}

      {/* Item 100: Haber-Bosch Industrial Ammonia Synthesis (Upper Banner Left, Warm Amber, Drift: Down-Right) */}
      <div ref={registerItem(100)} className="absolute top-[16%] left-[36%] font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-amber-600/75 animate-path-diag-tl-br">
          <div className="text-xs sm:text-sm font-bold text-amber-700/90">
            N₂(g) + 3H₂(g) ⇌ 2NH₃(g)
          </div>
          <div className="text-[11px] font-mono text-amber-600/65">
            Fe / 450°C, 200 atm &bull; ΔH = -92.4 kJ/mol
          </div>
        </div>
      </div>

      {/* Item 101: Electrochemical Rusting of Iron (Upper Banner Right, Ruby Red, Drift: Down-Left) */}
      <div ref={registerItem(101)} className="absolute top-[16%] right-[36%] text-right font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-red-600/75 animate-path-diag-br-tl">
          <div className="text-xs sm:text-sm font-bold text-red-700/90">
            4Fe + 3O₂ + 6H₂O ⟶ 2Fe₂O₃·3H₂O
          </div>
          <div className="text-[11px] font-mono text-red-600/65">
            Fe²⁺ + 2e⁻ ⟶ Fe &bull; E° = -0.44 V
          </div>
        </div>
      </div>

      {/* Item 102: Acid-Base Neutralization & Titration (Bottom Outer-Left, Electric Cyan, Drift: Up-Right) */}
      <div ref={registerItem(102)} className="absolute bottom-[2%] left-[24%] font-serif hidden sm:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-cyan-600/75 animate-path-diag-bl-tr">
          <div className="text-xs sm:text-sm font-bold italic text-cyan-700/90">
            HCl + NaOH ⟶ NaCl + H₂O
          </div>
          <div className="text-[11px] font-mono text-cyan-600/65">
            H⁺(aq) + OH⁻(aq) ⟶ H₂O(l) &bull; pH = 7.0
          </div>
        </div>
      </div>

      {/* Item 103: Calcium Carbonate Limestone Reaction (Lower Banner Left, Emerald Green, Drift: Orbit-CW) */}
      <div ref={registerItem(103)} className="absolute bottom-[6%] left-[36%] font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-emerald-600/75 animate-path-diag-tr-bl">
          <div className="text-xs sm:text-sm font-bold text-emerald-700/90">
            CaCO₃(s) + 2HCl ⟶ CaCl₂ + CO₂↑ + H₂O
          </div>
          <div className="text-[11px] font-mono text-emerald-600/65">
            Effervescence &bull; K_sp(CaCO₃) = 3.36 × 10⁻⁹
          </div>
        </div>
      </div>

      {/* Item 104: ATP Hydrolysis Cellular Energy (Lower Banner Right, Royal Purple, Drift: Orbit-CCW) */}
      <div ref={registerItem(104)} className="absolute bottom-[6%] right-[36%] text-right font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-purple-600/75 animate-path-steep-up-right">
          <div className="text-xs sm:text-sm font-bold text-purple-700/90">
            ATP + H₂O ⇌ ADP + P_i + Energy
          </div>
          <div className="text-[11px] font-mono text-purple-600/65">
            ΔG°' = -30.5 kJ/mol &bull; Phosphorylation
          </div>
        </div>
      </div>

      {/* Item 105: Glycolysis Biochemical Pathway (Lower-Mid Left, Deep Sea Teal, Drift: Up-Left) */}
      <div ref={registerItem(105)} className="absolute top-[84%] left-[18%] font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-teal-600/75 animate-path-steep-down-left">
          <div className="text-xs sm:text-sm font-bold text-teal-700/90">
            Glucose + 2NAD⁺ + 2ADP ⟶ 2 Pyruvate + 2ATP
          </div>
          <div className="text-[11px] font-mono text-teal-600/65">
            Embden-Meyerhof-Parnas &bull; 10 Enzymatic Steps
          </div>
        </div>
      </div>

      {/* Item 106: Michaelis-Menten Enzyme Kinetics (Lower-Mid Right, Warm Golden Amber, Drift: Down-Left) */}
      <div ref={registerItem(106)} className="absolute top-[84%] right-[18%] text-right font-serif hidden lg:block" style={wrapperStyle}>
        <div className="space-y-0.5 text-amber-600/75 animate-path-shallow-right">
          <div className="text-xs sm:text-sm font-bold italic text-amber-700/90">
            v₀ = (V_max [S]) / (K_m + [S])
          </div>
          <div className="text-[11px] font-mono text-amber-600/65">
            k_cat = V_max / [E]_total &bull; Lineweaver-Burk
          </div>
        </div>
      </div>

    </div>
  );
};
