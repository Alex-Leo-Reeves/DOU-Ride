/**
 * DOU Transit — Design System
 * 21st.dev / Modern High-End Campus Transit Design System
 * Crisp White surfaces, Deep Slate typography, Electric Indigo/Blue & Emerald accents,
 * Multi-layer ambient shadows, and pill geometry.
 */
import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const Colors = {
  // Base
  black: '#0A0E1A',
  white: '#FFFFFF',
  
  // Backgrounds
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceLight: '#F8FAFC',
  surfaceSecondary: '#F8FAFC',
  surfaceTertiary: '#F1F5F9',
  surfaceElevated: '#FFFFFF',
  
  // Neutral Slate Palette
  slate950: '#020617',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  
  // Legacy Aliases
  grey: '#64748B',
  lightGrey: '#E2E8F0',
  ultraLightGrey: '#F8FAFC',

  // Primary & Accent Brand Colors
  primary: '#0F172A',         // Bold Slate Black for high-end feel
  primaryAccent: '#2563EB',   // Royal Transit Blue
  primarySoft: '#EFF6FF',     // Subtle Blue tint
  secondary: '#4F46E5',       // Indigo
  secondarySoft: '#EEF2FF',

  // Semantic
  success: '#10B981',         // Emerald Green
  successSoft: '#ECFDF5',
  successDark: '#047857',
  
  error: '#EF4444',           // Crimson
  errorSoft: '#FEF2F2',
  errorDark: '#B91C1C',
  danger: '#EF4444',          // Danger alias for error

  warning: '#F59E0B',         // Amber
  warningSoft: '#FFFBEB',
  warningDark: '#B45309',

  info: '#0284C7',            // Sky/Ocean
  infoSoft: '#F0F9FF',

  // Special Campus Accents
  neonYellow: '#FACC15',      // Queue Call Screen High-Vis Flash
  neonYellowSoft: '#FEF9C3',
  kekeYellow: '#EAB308',      // Distinctive Keke Yellow
  emergencyRed: '#DC2626',    // Urgent SOS Red

  // Alpha Overlays
  black4: 'rgba(15, 23, 42, 0.04)',
  black8: 'rgba(15, 23, 42, 0.08)',
  black12: 'rgba(15, 23, 42, 0.12)',
  black16: 'rgba(15, 23, 42, 0.16)',
  black26: 'rgba(15, 23, 42, 0.26)',
  black40: 'rgba(15, 23, 42, 0.40)',
  black60: 'rgba(15, 23, 42, 0.60)',
  white90: 'rgba(255, 255, 255, 0.90)',
  white80: 'rgba(255, 255, 255, 0.80)',
};

export const Spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
};

export const FontSize = {
  xxs: 10,
  xs: 11,
  sm: 13,
  md: 14,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  display: 36,
  giant: 48,
};

export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const Shadows = StyleSheet.create({
  subtle: {
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: Colors.slate900,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  glowPrimary: {
    shadowColor: Colors.primaryAccent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  glowSuccess: {
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
});

export const SCREEN = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };
