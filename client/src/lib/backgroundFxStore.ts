import { create } from 'zustand';

export type FormulaColorOption =
  | 'slate'
  | 'navy'
  | 'indigo'
  | 'cyan'
  | 'emerald'
  | 'rose'
  | 'amber'
  | 'violet'
  | 'multicolor'
  | string;

export type ShapeColorTheme =
  | 'vibrant'
  | 'neon'
  | 'pastel'
  | 'matching'
  | 'amber_gold'
  | 'cyberpunk';

export type ShapeType = 'hexagon' | 'atom' | 'ring' | 'triangle' | 'diamond' | 'star';

export interface BackgroundFxConfig {
  formulaCount: number; // 10 - 75
  movementSpeed: number; // 0.2 - 3.5x
  formulaColor: FormulaColorOption;
  customColorHex?: string;
  formulaOpacity: number; // 0.2 - 1.0
  showShapes: boolean;
  shapeCount: number; // 0 - 40
  shapeSpeed: number; // 0.2 - 3.5x
  shapeColorTheme: ShapeColorTheme;
  shapeOpacity: number; // 0.1 - 0.9
  enabledShapeTypes: ShapeType[];
  isPanelOpen: boolean;
}

interface BackgroundFxState extends BackgroundFxConfig {
  setFormulaCount: (count: number) => void;
  setMovementSpeed: (speed: number) => void;
  setFormulaColor: (color: FormulaColorOption) => void;
  setCustomColorHex: (hex: string) => void;
  setFormulaOpacity: (opacity: number) => void;
  setShowShapes: (show: boolean) => void;
  setShapeCount: (count: number) => void;
  setShapeSpeed: (speed: number) => void;
  setShapeColorTheme: (theme: ShapeColorTheme) => void;
  setShapeOpacity: (opacity: number) => void;
  toggleShapeType: (shape: ShapeType) => void;
  setIsPanelOpen: (open: boolean) => void;
  applyPreset: (presetName: 'balanced' | 'vibrant' | 'hyper' | 'minimal' | 'cosmic') => void;
  resetToDefaults: () => void;
}

const STORAGE_KEY = 'papergen_login_bg_fx_v1';

const DEFAULT_CONFIG: BackgroundFxConfig = {
  formulaCount: 30,
  movementSpeed: 1.0,
  formulaColor: 'indigo',
  customColorHex: '#4f46e5',
  formulaOpacity: 0.65,
  showShapes: true,
  shapeCount: 18,
  shapeSpeed: 1.0,
  shapeColorTheme: 'vibrant',
  shapeOpacity: 0.45,
  enabledShapeTypes: ['hexagon', 'atom', 'ring', 'triangle', 'diamond', 'star'],
  isPanelOpen: false,
};

function loadStoredConfig(): BackgroundFxConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CONFIG, ...parsed, isPanelOpen: false };
    }
  } catch (e) {
    // Ignore storage parse issues
  }
  return DEFAULT_CONFIG;
}

function saveConfig(cfg: Partial<BackgroundFxConfig>) {
  try {
    const { isPanelOpen, ...saveable } = cfg as BackgroundFxConfig;
    const current = loadStoredConfig();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...saveable }));
  } catch (e) {
    // Ignore storage write issues
  }
}

export const useBackgroundFxStore = create<BackgroundFxState>((set, get) => {
  const initial = loadStoredConfig();

  return {
    ...initial,

    setFormulaCount: (formulaCount) => {
      set({ formulaCount });
      saveConfig({ formulaCount });
    },

    setMovementSpeed: (movementSpeed) => {
      set({ movementSpeed });
      saveConfig({ movementSpeed });
    },

    setFormulaColor: (formulaColor) => {
      set({ formulaColor });
      saveConfig({ formulaColor });
    },

    setCustomColorHex: (customColorHex) => {
      set({ customColorHex, formulaColor: 'custom' });
      saveConfig({ customColorHex, formulaColor: 'custom' });
    },

    setFormulaOpacity: (formulaOpacity) => {
      set({ formulaOpacity });
      saveConfig({ formulaOpacity });
    },

    setShowShapes: (showShapes) => {
      set({ showShapes });
      saveConfig({ showShapes });
    },

    setShapeCount: (shapeCount) => {
      set({ shapeCount });
      saveConfig({ shapeCount });
    },

    setShapeSpeed: (shapeSpeed) => {
      set({ shapeSpeed });
      saveConfig({ shapeSpeed });
    },

    setShapeColorTheme: (shapeColorTheme) => {
      set({ shapeColorTheme });
      saveConfig({ shapeColorTheme });
    },

    setShapeOpacity: (shapeOpacity) => {
      set({ shapeOpacity });
      saveConfig({ shapeOpacity });
    },

    toggleShapeType: (shape) => {
      const current = get().enabledShapeTypes;
      const next = current.includes(shape)
        ? current.filter((s) => s !== shape)
        : [...current, shape];
      // Keep at least one shape type
      const finalTypes = next.length > 0 ? next : [shape];
      set({ enabledShapeTypes: finalTypes });
      saveConfig({ enabledShapeTypes: finalTypes });
    },

    setIsPanelOpen: (isPanelOpen) => set({ isPanelOpen }),

    applyPreset: (preset) => {
      let patch: Partial<BackgroundFxConfig> = {};
      switch (preset) {
        case 'balanced':
          patch = {
            formulaCount: 26,
            movementSpeed: 1.0,
            formulaColor: 'indigo',
            formulaOpacity: 0.65,
            showShapes: true,
            shapeCount: 16,
            shapeSpeed: 1.0,
            shapeColorTheme: 'vibrant',
            shapeOpacity: 0.45,
          };
          break;
        case 'vibrant':
          patch = {
            formulaCount: 42,
            movementSpeed: 1.5,
            formulaColor: 'multicolor',
            formulaOpacity: 0.75,
            showShapes: true,
            shapeCount: 24,
            shapeSpeed: 1.4,
            shapeColorTheme: 'vibrant',
            shapeOpacity: 0.55,
          };
          break;
        case 'hyper':
          patch = {
            formulaCount: 55,
            movementSpeed: 2.5,
            formulaColor: 'cyan',
            formulaOpacity: 0.85,
            showShapes: true,
            shapeCount: 30,
            shapeSpeed: 2.2,
            shapeColorTheme: 'neon',
            shapeOpacity: 0.65,
          };
          break;
        case 'minimal':
          patch = {
            formulaCount: 14,
            movementSpeed: 0.5,
            formulaColor: 'slate',
            formulaOpacity: 0.4,
            showShapes: false,
            shapeCount: 0,
            shapeSpeed: 0.5,
            shapeColorTheme: 'pastel',
            shapeOpacity: 0.25,
          };
          break;
        case 'cosmic':
          patch = {
            formulaCount: 48,
            movementSpeed: 1.8,
            formulaColor: 'violet',
            formulaOpacity: 0.8,
            showShapes: true,
            shapeCount: 26,
            shapeSpeed: 1.6,
            shapeColorTheme: 'cyberpunk',
            shapeOpacity: 0.6,
          };
          break;
      }
      set(patch);
      saveConfig(patch);
    },

    resetToDefaults: () => {
      set({ ...DEFAULT_CONFIG, isPanelOpen: get().isPanelOpen });
      localStorage.removeItem(STORAGE_KEY);
    },
  };
});
