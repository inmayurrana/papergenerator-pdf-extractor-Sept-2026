import { create } from 'zustand';

export interface ThemeOption {
  id: string;
  name: string;
  category: 'dark' | 'light' | 'neon';
  description: string;
  previewColors: {
    bg: string;
    surface: string;
    accent: string;
    secondary: string;
    text: string;
  };
  fontFamily?: string;
}

export const AVAILABLE_THEMES: ThemeOption[] = [
  {
    id: 'midnight',
    name: 'Midnight Cyber',
    category: 'dark',
    description: 'Sleek dark mode with deep slate and vibrant indigo & violet accents',
    previewColors: {
      bg: '#020617',
      surface: '#0f172a',
      accent: '#6366f1',
      secondary: '#8b5cf6',
      text: '#f8fafc',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula Pro',
    category: 'dark',
    description: 'The world-famous vampire theme: rich dark purple with neon pink & cyan',
    previewColors: {
      bg: '#1e1f29',
      surface: '#282a36',
      accent: '#ff79c6',
      secondary: '#8be9fd',
      text: '#f8f8f2',
    },
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    category: 'neon',
    description: 'Cyberpunk Tokyo aesthetic with deep night blue and electric neon cyan',
    previewColors: {
      bg: '#16161e',
      surface: '#1a1b26',
      accent: '#7dcfff',
      secondary: '#bb9af7',
      text: '#c0caf5',
    },
  },
  {
    id: 'nord',
    name: 'Nordic Frost',
    category: 'dark',
    description: 'Arctic Scandinavian palette: polar night slate with frost cyan highlights',
    previewColors: {
      bg: '#242933',
      surface: '#2e3440',
      accent: '#88c0d0',
      secondary: '#81a1c1',
      text: '#eceff4',
    },
  },
  {
    id: 'matrix',
    name: 'Matrix Emerald',
    category: 'neon',
    description: 'Cyberpunk obsidian with vivid matrix terminal green & glowing emerald',
    previewColors: {
      bg: '#050a06',
      surface: '#0d170e',
      accent: '#10b981',
      secondary: '#34d399',
      text: '#ecfdf5',
    },
  },
  {
    id: 'synthwave',
    name: 'Synthwave 1984',
    category: 'neon',
    description: 'Retro 80s neon synth: dark plum with glowing sunset magenta & amber',
    previewColors: {
      bg: '#140b24',
      surface: '#221138',
      accent: '#ff2a85',
      secondary: '#f59e0b',
      text: '#fdf4ff',
    },
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin Mocha',
    category: 'dark',
    description: 'Warm pastel dark palette with soothing lavender, peach, and sapphire',
    previewColors: {
      bg: '#11111b',
      surface: '#1e1e2e',
      accent: '#cba6f7',
      secondary: '#fab387',
      text: '#cdd6f4',
    },
  },
  {
    id: 'monokai',
    name: 'Monokai Pro',
    category: 'dark',
    description: 'Legendary developer palette: charcoal backdrop with vibrant gold & rose',
    previewColors: {
      bg: '#19181a',
      surface: '#221f22',
      accent: '#ffd866',
      secondary: '#ff6188',
      text: '#fcfcfa',
    },
  },
  {
    id: 'light-paper',
    name: 'Solarized Clean Paper',
    category: 'light',
    description: 'Warm academic light mode with crisp ink typography and royal blue',
    previewColors: {
      bg: '#f8fafc',
      surface: '#ffffff',
      accent: '#2563eb',
      secondary: '#4f46e5',
      text: '#0f172a',
    },
  },
];

interface ThemeState {
  currentTheme: string;
  isPreferencesOpen: boolean;
  setTheme: (themeId: string) => void;
  openPreferences: () => void;
  closePreferences: () => void;
  togglePreferences: () => void;
}

const SAVED_THEME_KEY = 'papergen_theme_preference';

const getInitialTheme = (): string => {
  try {
    const saved = localStorage.getItem(SAVED_THEME_KEY);
    if (saved && AVAILABLE_THEMES.some((t) => t.id === saved)) {
      return saved;
    }
  } catch {}
  return 'midnight';
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: getInitialTheme(),
  isPreferencesOpen: false,
  setTheme: (themeId: string) => {
    try {
      localStorage.setItem(SAVED_THEME_KEY, themeId);
      document.documentElement.setAttribute('data-theme', themeId);
    } catch {}
    set({ currentTheme: themeId });
  },
  openPreferences: () => set({ isPreferencesOpen: true }),
  closePreferences: () => set({ isPreferencesOpen: false }),
  togglePreferences: () => set({ isPreferencesOpen: !get().isPreferencesOpen }),
}));
