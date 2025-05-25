import { type ClassValue, clsx } from 'clsx'

// Theme configuration
export interface ThemeConfig {
  colors: {
    primary: string
    secondary: string
    accent: string
    success: string
    warning: string
    error: string
    info: string
    background: {
      primary: string
      secondary: string
      tertiary: string
    }
    text: {
      primary: string
      secondary: string
      tertiary: string
    }
    border: {
      primary: string
      secondary: string
    }
  }
  shadows: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  borderRadius: {
    sm: string
    md: string
    lg: string
    xl: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
  }
}

export const lightTheme: ThemeConfig = {
  colors: {
    primary: '#6366f1',
    secondary: '#14b8a6',
    accent: '#f56500',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#6366f1',
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8',
    },
    border: {
      primary: '#e2e8f0',
      secondary: '#cbd5e1',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
}

export const darkTheme: ThemeConfig = {
  colors: {
    primary: '#6366f1',
    secondary: '#14b8a6',
    accent: '#f56500',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#6366f1',
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      tertiary: '#64748b',
    },
    border: {
      primary: '#334155',
      secondary: '#475569',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
}

// Theme utility functions
export const getThemeValue = (theme: ThemeConfig, path: string): string => {
  return path.split('.').reduce((obj: any, key: string) => obj?.[key], theme) || ''
}

export const applyThemeToRoot = (theme: ThemeConfig): void => {
  const root = document.documentElement

  // Apply color variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    if (typeof value === 'string') {
      root.style.setProperty(`--color-${key}`, value)
    } else {
      Object.entries(value).forEach(([subKey, subValue]) => {
        root.style.setProperty(`--color-${key}-${subKey}`, subValue)
      })
    }
  })

  // Apply shadow variables
  Object.entries(theme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value)
  })

  // Apply border radius variables
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, value)
  })

  // Apply spacing variables
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value)
  })
}

// Responsive utilities
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

export type Breakpoint = keyof typeof breakpoints

export const mediaQueries = {
  sm: `(min-width: ${breakpoints.sm})`,
  md: `(min-width: ${breakpoints.md})`,
  lg: `(min-width: ${breakpoints.lg})`,
  xl: `(min-width: ${breakpoints.xl})`,
  '2xl': `(min-width: ${breakpoints['2xl']})`,
} as const

// Color manipulation utilities
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

export const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export const adjustOpacity = (color: string, opacity: number): string => {
  const rgb = hexToRgb(color)
  if (!rgb) return color
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
}

export const lighten = (color: string, amount: number): string => {
  const rgb = hexToRgb(color)
  if (!rgb) return color
  
  const r = Math.min(255, rgb.r + Math.round(255 * amount))
  const g = Math.min(255, rgb.g + Math.round(255 * amount))
  const b = Math.min(255, rgb.b + Math.round(255 * amount))
  
  return rgbToHex(r, g, b)
}

export const darken = (color: string, amount: number): string => {
  const rgb = hexToRgb(color)
  if (!rgb) return color
  
  const r = Math.max(0, rgb.r - Math.round(255 * amount))
  const g = Math.max(0, rgb.g - Math.round(255 * amount))
  const b = Math.max(0, rgb.b - Math.round(255 * amount))
  
  return rgbToHex(r, g, b)
}

// Theme-aware class name utility
export const cn = (...inputs: ClassValue[]): string => {
  return clsx(inputs)
}

// Animation utilities
export const animations = {
  fadeIn: 'animate-fade-in',
  slideIn: 'animate-slide-in',
  bounceIn: 'animate-bounce-soft',
  pulse: 'animate-pulse-slow',
  spin: 'animate-spin',
  ping: 'animate-ping',
} as const

// Transition utilities
export const transitions = {
  fast: 'transition-all duration-150 ease-in-out',
  normal: 'transition-all duration-300 ease-in-out',
  slow: 'transition-all duration-500 ease-in-out',
} as const

// Focus utilities for accessibility
export const focusStyles = {
  default: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  danger: 'focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2',
  success: 'focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2',
} as const

// Layout utilities
export const layouts = {
  center: 'flex items-center justify-center',
  centerX: 'flex justify-center',
  centerY: 'flex items-center',
  spaceBetween: 'flex items-center justify-between',
  spaceAround: 'flex items-center justify-around',
} as const

// Typography utilities
export const typography = {
  heading: {
    1: 'text-4xl font-bold leading-tight',
    2: 'text-3xl font-bold leading-tight',
    3: 'text-2xl font-semibold leading-tight',
    4: 'text-xl font-semibold leading-tight',
    5: 'text-lg font-medium leading-tight',
    6: 'text-base font-medium leading-tight',
  },
  body: {
    lg: 'text-lg leading-relaxed',
    md: 'text-base leading-relaxed',
    sm: 'text-sm leading-relaxed',
    xs: 'text-xs leading-relaxed',
  },
  mono: 'font-mono',
  sans: 'font-sans',
} as const