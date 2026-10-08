import React, { useEffect, useRef, useState, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useBackgroundFxStore, ShapeType, ShapeColorTheme } from '../../lib/backgroundFxStore';

interface FormulaDef {
  latex: string;
  category: 'math' | 'physics' | 'chemistry';
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  speed: number;
  direction: number;
  initialOffset: number;
}

// 75 authentic high-school & college-level educational formulas
const MASTER_FORMULAS: FormulaDef[] = [
  // Mathematics (Calculus, Algebra, Geometry, Complex Analysis)
  { latex: 'e^{i\\pi} + 1 = 0', category: 'math', x: 7, y: 11, speed: 0.9, direction: 1, initialOffset: 0 },
  { latex: '\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}', category: 'math', x: 82, y: 14, speed: 0.7, direction: -1, initialOffset: 1.5 },
  { latex: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}', category: 'math', x: 11, y: 79, speed: 0.8, direction: 1, initialOffset: 1 },
  { latex: 'f\'(x) = \\lim_{h\\to 0} \\frac{f(x+h)-f(x)}{h}', category: 'math', x: 83, y: 81, speed: 0.6, direction: -1, initialOffset: 2.8 },
  { latex: '\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}', category: 'math', x: 5, y: 44, speed: 1.0, direction: 1, initialOffset: 3.5 },
  { latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', category: 'math', x: 89, y: 46, speed: 0.8, direction: -1, initialOffset: 2 },
  { latex: '\\oint_C \\mathbf{F} \\cdot d\\mathbf{r} = \\iint_S (\\nabla \\times \\mathbf{F}) \\cdot d\\mathbf{S}', category: 'math', x: 21, y: 26, speed: 0.6, direction: 1, initialOffset: 4 },
  { latex: '\\sin^2\\theta + \\cos^2\\theta = 1', category: 'math', x: 75, y: 6, speed: 1.1, direction: -1, initialOffset: 0.5 },
  { latex: '\\det(A - \\lambda I) = 0', category: 'math', x: 3, y: 66, speed: 0.7, direction: 1, initialOffset: 3 },
  { latex: '\\zeta(s) = \\sum_{n=1}^\\infty \\frac{1}{n^s}', category: 'math', x: 91, y: 68, speed: 0.85, direction: -1, initialOffset: 1.2 },
  { latex: '\\mathcal{L}\\{f(t)\\} = \\int_0^\\infty e^{-st} f(t) dt', category: 'math', x: 15, y: 18, speed: 0.75, direction: 1, initialOffset: 2.2 },
  { latex: '\\frac{d}{dx}[\\ln(x)] = \\frac{1}{x}', category: 'math', x: 80, y: 25, speed: 0.9, direction: -1, initialOffset: 3.1 },
  { latex: 'P(A|B) = \\frac{P(B|A)P(A)}{P(B)}', category: 'math', x: 12, y: 55, speed: 0.7, direction: 1, initialOffset: 0.8 },
  { latex: '\\int u\\,dv = uv - \\int v\\,du', category: 'math', x: 87, y: 58, speed: 0.8, direction: -1, initialOffset: 2.5 },
  { latex: 'e^x = \\sum_{n=0}^\\infty \\frac{x^n}{n!}', category: 'math', x: 25, y: 84, speed: 0.65, direction: 1, initialOffset: 4.1 },
  { latex: '\\Gamma(z) = \\int_0^\\infty t^{z-1} e^{-t} dt', category: 'math', x: 71, y: 92, speed: 0.7, direction: -1, initialOffset: 1.8 },
  { latex: 'a^2 + b^2 = c^2', category: 'math', x: 28, y: 5, speed: 1.2, direction: 1, initialOffset: 0.2 },
  { latex: '\\lim_{x\\to 0} \\frac{\\sin x}{x} = 1', category: 'math', x: 67, y: 12, speed: 0.95, direction: -1, initialOffset: 2.9 },
  { latex: '\\mathbf{u} \\cdot \\mathbf{v} = \\|\\mathbf{u}\\|\\|\\mathbf{v}\\| \\cos\\theta', category: 'math', x: 6, y: 88, speed: 0.8, direction: 1, initialOffset: 3.7 },
  { latex: '\\nabla^2 \\psi = \\frac{1}{v^2} \\frac{\\partial^2 \\psi}{\\partial t^2}', category: 'math', x: 92, y: 34, speed: 0.6, direction: -1, initialOffset: 1.6 },
  { latex: '\\tan(2\\theta) = \\frac{2\\tan\\theta}{1-\\tan^2\\theta}', category: 'math', x: 18, y: 38, speed: 0.75, direction: 1, initialOffset: 2.0 },
  { latex: '\\mathcal{F}\\{f(t)\\} = \\int_{-\\infty}^\\infty f(t)e^{-i\\omega t} dt', category: 'math', x: 79, y: 73, speed: 0.65, direction: -1, initialOffset: 4.3 },
  { latex: '\\binom{n}{k} = \\frac{n!}{k!(n-k)!}', category: 'math', x: 2, y: 22, speed: 0.85, direction: 1, initialOffset: 0.9 },
  { latex: '\\cosh^2 x - \\sinh^2 x = 1', category: 'math', x: 93, y: 94, speed: 0.9, direction: -1, initialOffset: 2.7 },
  { latex: '\\log_b(xy) = \\log_b(x) + \\log_b(y)', category: 'math', x: 38, y: 92, speed: 0.8, direction: 1, initialOffset: 3.2 },

  // Physics (Mechanics, Electromagnetism, Quantum, Optics, Thermo)
  { latex: 'E = mc^2', category: 'physics', x: 72, y: 7, speed: 1.15, direction: 1, initialOffset: 0.7 },
  { latex: 'i\\hbar \\frac{\\partial}{\\partial t}\\Psi = \\hat{H}\\Psi', category: 'physics', x: 17, y: 63, speed: 0.65, direction: -1, initialOffset: 2.4 },
  { latex: '\\Delta x \\cdot \\Delta p \\ge \\frac{\\hbar}{2}', category: 'physics', x: 77, y: 64, speed: 0.8, direction: 1, initialOffset: 1.1 },
  { latex: '\\lambda = \\frac{h}{p}', category: 'physics', x: 27, y: 89, speed: 0.9, direction: -1, initialOffset: 3.3 },
  { latex: 'F = G \\frac{m_1 m_2}{r^2}', category: 'physics', x: 69, y: 24, speed: 0.75, direction: 1, initialOffset: 1.9 },
  { latex: 'PV = nRT', category: 'physics', x: 23, y: 7, speed: 0.85, direction: -1, initialOffset: 4.2 },
  { latex: 'T = 2\\pi \\sqrt{\\frac{L}{g}}', category: 'physics', x: 61, y: 87, speed: 0.7, direction: 1, initialOffset: 1.4 },
  { latex: 'F = m\\mathbf{a}', category: 'physics', x: 8, y: 3, speed: 1.3, direction: -1, initialOffset: 0.4 },
  { latex: 'c = \\frac{1}{\\sqrt{\\mu_0 \\varepsilon_0}}', category: 'physics', x: 86, y: 3, speed: 0.85, direction: 1, initialOffset: 2.1 },
  { latex: 'V = IR', category: 'physics', x: 4, y: 73, speed: 1.25, direction: -1, initialOffset: 1.0 },
  { latex: 'p = \\frac{h}{\\lambda}', category: 'physics', x: 94, y: 77, speed: 0.9, direction: 1, initialOffset: 3.6 },
  { latex: '\\gamma = \\frac{1}{\\sqrt{1 - v^2/c^2}}', category: 'physics', x: 19, y: 47, speed: 0.65, direction: -1, initialOffset: 2.3 },
  { latex: 'E = h\\nu', category: 'physics', x: 81, y: 49, speed: 1.1, direction: 1, initialOffset: 0.6 },
  { latex: 'B = \\frac{\\mu_0 I}{2\\pi r}', category: 'physics', x: 14, y: 71, speed: 0.75, direction: -1, initialOffset: 4.0 },
  { latex: 'U = \\frac{1}{2} k x^2', category: 'physics', x: 74, y: 38, speed: 0.85, direction: 1, initialOffset: 1.7 },
  { latex: 'K = \\frac{1}{2} m v^2', category: 'physics', x: 26, y: 20, speed: 1.05, direction: -1, initialOffset: 2.8 },
  { latex: '\\omega = 2\\pi f', category: 'physics', x: 64, y: 77, speed: 1.15, direction: 1, initialOffset: 0.9 },
  { latex: '\\mathcal{E} = -\\frac{d\\Phi_B}{dt}', category: 'physics', x: 9, y: 33, speed: 0.7, direction: -1, initialOffset: 3.1 },
  { latex: 'F_B = q(\\mathbf{E} + \\mathbf{v} \\times \\mathbf{B})', category: 'physics', x: 90, y: 22, speed: 0.6, direction: 1, initialOffset: 4.4 },
  { latex: 'Q = mc\\Delta T', category: 'physics', x: 31, y: 76, speed: 0.95, direction: -1, initialOffset: 1.3 },
  { latex: '\\eta = 1 - \\frac{T_C}{T_H}', category: 'physics', x: 68, y: 95, speed: 0.8, direction: 1, initialOffset: 2.6 },
  { latex: 'n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2', category: 'physics', x: 5, y: 95, speed: 0.7, direction: -1, initialOffset: 3.9 },
  { latex: 'v = f\\lambda', category: 'physics', x: 42, y: 6, speed: 1.2, direction: 1, initialOffset: 0.3 },
  { latex: 'L = I\\omega', category: 'physics', x: 57, y: 5, speed: 1.0, direction: -1, initialOffset: 2.2 },
  { latex: 'P = \\frac{dW}{dt}', category: 'physics', x: 1, y: 51, speed: 1.1, direction: 1, initialOffset: 1.5 },

  // Chemistry (Physical, Inorganic, Organic, Equilibrium)
  { latex: '2\\text{H}_2 + \\text{O}_2 \\longrightarrow 2\\text{H}_2\\text{O}', category: 'chemistry', x: 13, y: 29, speed: 0.75, direction: -1, initialOffset: 1.8 },
  { latex: '\\text{pH} = -\\log[\\text{H}^+]', category: 'chemistry', x: 85, y: 31, speed: 0.95, direction: 1, initialOffset: 3.2 },
  { latex: '\\Delta G^\\circ = \\Delta H^\\circ - T\\Delta S^\\circ', category: 'chemistry', x: 33, y: 71, speed: 0.7, direction: 1, initialOffset: 2.6 },
  { latex: '\\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2 \\to 6\\text{CO}_2 + 6\\text{H}_2\\text{O}', category: 'chemistry', x: 65, y: 41, speed: 0.55, direction: -1, initialOffset: 1.0 },
  { latex: 'K_a = \\frac{[\\text{H}^+][\\text{A}^-]}{[\\text{HA}]}', category: 'chemistry', x: 7, y: 91, speed: 0.85, direction: 1, initialOffset: 4.1 },
  { latex: '\\text{CH}_4 + 2\\text{O}_2 \\longrightarrow \\text{CO}_2 + 2\\text{H}_2\\text{O}', category: 'chemistry', x: 75, y: 91, speed: 0.7, direction: -1, initialOffset: 0.4 },
  { latex: 'k = A e^{-E_a / (RT)}', category: 'chemistry', x: 20, y: 15, speed: 0.8, direction: 1, initialOffset: 2.3 },
  { latex: 'E = E^\\circ - \\frac{RT}{nF} \\ln Q', category: 'chemistry', x: 78, y: 18, speed: 0.65, direction: -1, initialOffset: 3.7 },
  { latex: '\\text{pH} = \\text{p}K_a + \\log\\frac{[\\text{A}^-]}{[\\text{HA}]}', category: 'chemistry', x: 11, y: 83, speed: 0.75, direction: 1, initialOffset: 1.5 },
  { latex: '2\\text{Fe} + 3\\text{Cl}_2 \\longrightarrow 2\\text{FeCl}_3', category: 'chemistry', x: 88, y: 86, speed: 0.8, direction: -1, initialOffset: 2.9 },
  { latex: '\\Pi = iMRT', category: 'chemistry', x: 4, y: 37, speed: 1.0, direction: 1, initialOffset: 0.8 },
  { latex: '\\Delta G^\\circ = -nFE^\\circ', category: 'chemistry', x: 92, y: 39, speed: 0.7, direction: -1, initialOffset: 3.4 },
  { latex: 'K_p = K_c(RT)^{\\Delta n}', category: 'chemistry', x: 22, y: 58, speed: 0.85, direction: 1, initialOffset: 1.2 },
  { latex: '2\\text{Al} + 3\\text{H}_2\\text{SO}_4 \\to \\text{Al}_2(\\text{SO}_4)_3 + 3\\text{H}_2', category: 'chemistry', x: 76, y: 53, speed: 0.6, direction: -1, initialOffset: 4.5 },
  { latex: 'A = \\varepsilon b c', category: 'chemistry', x: 30, y: 12, speed: 1.1, direction: 1, initialOffset: 0.6 },
  { latex: 't_{1/2} = \\frac{0.693}{k}', category: 'chemistry', x: 68, y: 16, speed: 0.95, direction: -1, initialOffset: 2.1 },
  { latex: '\\text{N}_2 + 3\\text{H}_2 \\rightleftharpoons 2\\text{NH}_3', category: 'chemistry', x: 16, y: 94, speed: 0.75, direction: 1, initialOffset: 3.0 },
  { latex: '\\text{CaCO}_3 \\xrightarrow{\\Delta} \\text{CaO} + \\text{CO}_2', category: 'chemistry', x: 83, y: 97, speed: 0.7, direction: -1, initialOffset: 1.7 },
  { latex: '\\Delta T_b = i K_b m', category: 'chemistry', x: 2, y: 59, speed: 1.05, direction: 1, initialOffset: 2.5 },
  { latex: '\\text{pOH} = -\\log[\\text{OH}^-]', category: 'chemistry', x: 95, y: 61, speed: 1.15, direction: -1, initialOffset: 0.9 },
  { latex: '\\text{H}_2\\text{O} \\rightleftharpoons \\text{H}^+ + \\text{OH}^-', category: 'chemistry', x: 35, y: 87, speed: 0.85, direction: 1, initialOffset: 3.8 },
  { latex: 'K_w = [\\text{H}^+][\\text{OH}^-] = 10^{-14}', category: 'chemistry', x: 63, y: 97, speed: 0.65, direction: -1, initialOffset: 1.3 },
  { latex: '\\Delta H_{rxn} = \\sum \\Delta H_f^\\circ(\\text{prod}) - \\sum \\Delta H_f^\\circ(\\text{react})', category: 'chemistry', x: 48, y: 93, speed: 0.55, direction: 1, initialOffset: 4.0 },
  { latex: '\\text{PV} = \\frac{w}{M}RT', category: 'chemistry', x: 52, y: 4, speed: 0.9, direction: -1, initialOffset: 2.7 },
  { latex: '\\Delta S_{univ} > 0', category: 'chemistry', x: 10, y: 8, speed: 1.2, direction: 1, initialOffset: 0.1 },
];

// Floating geometric shape definitions
interface FloatingShape {
  id: string;
  type: ShapeType;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  size: number; // in pixels
  color: string;
  speed: number;
  rotationSpeed: number;
  rotationDirection: number; // 1 or -1
  floatDirection: number;
  initialDelay: number;
}

const SHAPE_PALETTES: Record<ShapeColorTheme, string[]> = {
  vibrant: ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6'],
  neon: ['#00f5d4', '#7b2cbf', '#ff007f', '#00bbf9', '#fee440', '#39ff14', '#ff0055'],
  pastel: ['#a5b4fc', '#fbcfe8', '#bae6fd', '#a7f3d0', '#fde68a', '#ddd6fe', '#fed7aa'],
  matching: ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'],
  amber_gold: ['#f59e0b', '#d97706', '#b45309', '#fbbf24', '#fef3c7', '#ea580c'],
  cyberpunk: ['#00f0ff', '#ff003c', '#ffe600', '#7928ca', '#00ff66', '#ff00a0'],
};

export const InteractiveLiquidBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000, targetX: 0, targetY: 0 });

  const {
    formulaCount,
    movementSpeed,
    formulaColor,
    customColorHex,
    formulaOpacity,
    showShapes,
    shapeCount,
    shapeSpeed,
    shapeColorTheme,
    shapeOpacity,
    enabledShapeTypes,
  } = useBackgroundFxStore();

  // Selected pool of formulas based on formulaCount
  const activeFormulas = useMemo(() => {
    return MASTER_FORMULAS.slice(0, Math.min(formulaCount, MASTER_FORMULAS.length));
  }, [formulaCount]);

  // Generate deterministic floating shapes
  const floatingShapes = useMemo<FloatingShape[]>(() => {
    if (!showShapes || shapeCount <= 0 || enabledShapeTypes.length === 0) return [];

    const palette =
      shapeColorTheme === 'matching' && formulaColor !== 'multicolor' && formulaColor !== 'custom'
        ? getMatchingPalette(formulaColor)
        : SHAPE_PALETTES[shapeColorTheme] || SHAPE_PALETTES.vibrant;

    // Distribute shapes away from the screen center (where the login card lives)
    const shapes: FloatingShape[] = [];
    const count = Math.min(shapeCount, 40);

    for (let i = 0; i < count; i++) {
      const type = enabledShapeTypes[i % enabledShapeTypes.length];
      const color = palette[i % palette.length];

      // Margin/side-concentrated placement
      const isLeft = i % 2 === 0;
      const isTop = i % 4 < 2;

      let x: number;
      let y: number;

      if (i % 3 === 0) {
        // Left or right side column
        x = isLeft ? Math.random() * 26 + 2 : Math.random() * 26 + 72;
        y = Math.random() * 88 + 5;
      } else if (i % 3 === 1) {
        // Top or bottom banner margin
        x = Math.random() * 90 + 5;
        y = isTop ? Math.random() * 22 + 3 : Math.random() * 22 + 75;
      } else {
        // Corners and diagonal outer zones
        x = isLeft ? Math.random() * 32 + 2 : Math.random() * 32 + 66;
        y = isTop ? Math.random() * 30 + 4 : Math.random() * 30 + 66;
      }

      shapes.push({
        id: `shape_${i}_${type}`,
        type,
        x: Math.round(x),
        y: Math.round(y),
        size: Math.round(18 + (i % 5) * 6), // 18px to 42px
        color,
        speed: 0.7 + (i % 4) * 0.25,
        rotationSpeed: 10 + (i % 6) * 5, // seconds for full spin
        rotationDirection: i % 2 === 0 ? 1 : -1,
        floatDirection: i % 2 === 0 ? 1 : -1,
        initialDelay: (i * 0.35) % 4,
      });
    }

    return shapes;
  }, [showShapes, shapeCount, enabledShapeTypes, shapeColorTheme, formulaColor]);

  // Color resolver helper for formulas
  const getFormulaStyle = (item: FormulaDef, idx: number) => {
    let baseColor = '#64748b'; // default slate

    if (formulaColor === 'custom') {
      baseColor = customColorHex || '#4f46e5';
    } else if (formulaColor === 'multicolor') {
      const multicolorPalette = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
      baseColor = multicolorPalette[idx % multicolorPalette.length];
    } else {
      const colorMap: Record<string, string> = {
        slate: '#64748b',
        navy: '#1e3a8a',
        indigo: '#4f46e5',
        cyan: '#06b6d4',
        emerald: '#059669',
        rose: '#e11d48',
        amber: '#d97706',
        violet: '#7c3aed',
      };
      baseColor = colorMap[formulaColor] || '#4f46e5';
    }

    return {
      color: baseColor,
      opacity: formulaOpacity,
    };
  };

  // 1. Interactive Liquid Flow Canvas Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface LiquidDrop {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseRadius: number;
      color: string;
      phase: number;
      phaseSpeed: number;
    }

    const baseDropletColors = [
      'rgba(0, 31, 63, 0.05)',
      'rgba(30, 58, 138, 0.06)',
      'rgba(99, 102, 241, 0.05)',
      'rgba(14, 165, 233, 0.04)',
    ];

    const drops: LiquidDrop[] = Array.from({ length: 9 }).map((_, i) => {
      const radius = Math.random() * 140 + 160;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius,
        baseRadius: radius,
        color: baseDropletColors[i % baseDropletColors.length],
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.008 + Math.random() * 0.008,
      };
    });

    let pointerX = width / 2;
    let pointerY = height / 2;
    let targetPointerX = width / 2;
    let targetPointerY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      targetPointerX = e.clientX;
      targetPointerY = e.clientY;
      setMousePos({
        x: e.clientX,
        y: e.clientY,
        targetX: (e.clientX / width - 0.5) * 24,
        targetY: (e.clientY / height - 0.5) * 24,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        targetPointerX = e.touches[0].clientX;
        targetPointerY = e.touches[0].clientY;
        setMousePos({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          targetX: (e.touches[0].clientX / width - 0.5) * 24,
          targetY: (e.touches[0].clientY / height - 0.5) * 24,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    const render = () => {
      // Speed multiplier influences fluid drift
      const speedMult = Math.max(0.2, movementSpeed);

      pointerX += (targetPointerX - pointerX) * 0.04;
      pointerY += (targetPointerY - pointerY) * 0.04;

      ctx.clearRect(0, 0, width, height);

      // Render flowing liquid droplets with organic morphing
      drops.forEach((d) => {
        d.phase += d.phaseSpeed * speedMult;
        d.x += d.vx * speedMult;
        d.y += d.vy * speedMult;

        if (d.x < -d.radius) d.x = width + d.radius;
        if (d.x > width + d.radius) d.x = -d.radius;
        if (d.y < -d.radius) d.y = height + d.radius;
        if (d.y > height + d.radius) d.y = -d.radius;

        const dx = pointerX - d.x;
        const dy = pointerY - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 400 && dist > 10) {
          const force = ((400 - dist) / 400) * 0.35 * speedMult;
          d.x += (dx / dist) * force;
          d.y += (dy / dist) * force;
        }

        const currentRadius = d.baseRadius + Math.sin(d.phase) * 25 + Math.cos(d.phase * 1.5) * 15;

        const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, currentRadius);
        grad.addColorStop(0, d.color);
        grad.addColorStop(0.7, d.color);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(d.x, d.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      // Subtle interactive ripples around cursor
      if (pointerX > 0 && pointerY > 0) {
        const rippleGrad = ctx.createRadialGradient(pointerX, pointerY, 0, pointerX, pointerY, 180);
        rippleGrad.addColorStop(0, 'rgba(0, 31, 63, 0.04)');
        rippleGrad.addColorStop(0.5, 'rgba(30, 58, 138, 0.02)');
        rippleGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(pointerX, pointerY, 180, 0, Math.PI * 2);
        ctx.fillStyle = rippleGrad;
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [movementSpeed]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Organic Fluid / Liquid Simulation Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* 2. Floating Scientific & Geometric Shapes Layer */}
      {showShapes && floatingShapes.length > 0 && (
        <div className="absolute inset-0">
          {floatingShapes.map((shape) => {
            const parallaxX = mousePos.targetX * shape.floatDirection * 0.45;
            const parallaxY = mousePos.targetY * shape.floatDirection * 0.45;

            // Scaled animation durations based on movementSpeed & shapeSpeed
            const totalSpeed = Math.max(0.2, movementSpeed * shapeSpeed);
            const floatDuration = Math.max(2, (8 + shape.speed * 5) / totalSpeed);
            const spinDuration = Math.max(2, shape.rotationSpeed / totalSpeed);

            return (
              <div
                key={shape.id}
                className="absolute transition-transform duration-700 ease-out pointer-events-none"
                style={{
                  left: `${shape.x}%`,
                  top: `${shape.y}%`,
                  transform: `translate(${parallaxX}px, ${parallaxY}px)`,
                }}
              >
                <div
                  className="animate-shape-float"
                  style={{
                    animationDuration: `${floatDuration}s`,
                    animationDelay: `${shape.initialDelay}s`,
                  }}
                >
                  <div
                    className={shape.rotationDirection > 0 ? 'animate-shape-spin' : 'animate-shape-spin-reverse'}
                    style={{
                      animationDuration: `${spinDuration}s`,
                      opacity: shapeOpacity,
                    }}
                  >
                    <ShapeRenderer type={shape.type} size={shape.size} color={shape.color} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Floating Scientific Formulas Layer */}
      <div className="absolute inset-0">
        {activeFormulas.map((item, idx) => {
          let html = '';
          try {
            html = katex.renderToString(item.latex, {
              displayMode: false,
              throwOnError: false,
            });
          } catch {
            html = item.latex;
          }

          // Subtle parallax offset based on interactive mouse movement
          const parallaxX = mousePos.targetX * item.direction * 0.4;
          const parallaxY = mousePos.targetY * item.direction * 0.4;

          // Animation duration dynamically scaled with user-controlled movementSpeed
          const totalSpeed = Math.max(0.2, movementSpeed);
          const durationSec = Math.max(1.8, (7 + item.speed * 4) / totalSpeed);
          const formulaStyling = getFormulaStyle(item, idx);

          return (
            <div
              key={idx}
              className="absolute transition-transform duration-700 ease-out"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `translate(${parallaxX}px, ${parallaxY}px)`,
              }}
            >
              <div
                className="animate-formula-float text-[11px] sm:text-[12px] font-medium tracking-wide transition-colors duration-500 cursor-default select-none"
                style={{
                  animationDuration: `${durationSec}s`,
                  animationDelay: `${item.initialOffset}s`,
                  color: formulaStyling.color,
                  opacity: formulaStyling.opacity,
                  textShadow: `0 0 16px ${formulaStyling.color}25`,
                }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// SVG Shape Renderer for Geometry & Science Icons
interface ShapeRendererProps {
  type: ShapeType;
  size: number;
  color: string;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({ type, size, color }) => {
  switch (type) {
    case 'hexagon':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.8">
          <polygon
            points="20,2 36,11 36,29 20,38 4,29 4,11"
            fill={`${color}12`}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="20" r="5" fill={`${color}28`} stroke={color} strokeWidth="1.2" />
        </svg>
      );

    case 'atom':
      return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none" stroke={color} strokeWidth="1.5">
          <circle cx="22" cy="22" r="3.5" fill={color} />
          <ellipse cx="22" cy="22" rx="18" ry="7" strokeDasharray="3 3" />
          <ellipse cx="22" cy="22" rx="18" ry="7" transform="rotate(60 22 22)" />
          <ellipse cx="22" cy="22" rx="18" ry="7" transform="rotate(120 22 22)" />
        </svg>
      );

    case 'ring':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none" stroke={color}>
          <circle cx="18" cy="18" r="14" strokeWidth="1.5" strokeDasharray="4 2" />
          <circle cx="18" cy="18" r="8" strokeWidth="1.8" fill={`${color}15`} />
          <circle cx="18" cy="18" r="2.5" fill={color} />
        </svg>
      );

    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none" stroke={color} strokeWidth="1.8">
          <polygon points="18,4 32,30 4,30" fill={`${color}10`} strokeLinejoin="round" />
          <polygon points="18,12 26,27 10,27" strokeWidth="1" fill={`${color}20`} strokeDasharray="2 2" />
        </svg>
      );

    case 'diamond':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none" stroke={color} strokeWidth="1.8">
          <polygon points="18,3 33,18 18,33 3,18" fill={`${color}14`} strokeLinejoin="round" />
          <circle cx="18" cy="18" r="4" fill={color} />
        </svg>
      );

    case 'star':
      return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none" stroke={color} strokeWidth="1.5">
          <path
            d="M18 2 L22 14 L34 18 L22 22 L18 34 L14 22 L2 18 L14 14 Z"
            fill={`${color}18`}
            strokeLinejoin="round"
          />
        </svg>
      );

    default:
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke={color} strokeWidth="2">
          <circle cx="16" cy="16" r="12" fill={`${color}15`} />
        </svg>
      );
  }
};

function getMatchingPalette(baseColorKey: string): string[] {
  const map: Record<string, string[]> = {
    slate: ['#64748b', '#94a3b8', '#cbd5e1', '#475569'],
    navy: ['#1e3a8a', '#1e40af', '#3b82f6', '#60a5fa'],
    indigo: ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc'],
    cyan: ['#06b6d4', '#22d3ee', '#67e8f9', '#0891b2'],
    emerald: ['#059669', '#10b981', '#34d399', '#6ee7b7'],
    rose: ['#e11d48', '#f43f5e', '#fb7185', '#fda4af'],
    amber: ['#d97706', '#f59e0b', '#fbbf24', '#fde68a'],
    violet: ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd'],
  };
  return map[baseColorKey] || ['#4f46e5', '#6366f1', '#818cf8'];
}
