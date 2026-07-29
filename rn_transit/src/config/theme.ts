/**
 * DOU Transit — Design System
 * Modern white / clean theme with crisp typography and subtle depth.
 * Brutalist-inspired black outlines + clean white surfaces.
 */
import { StyleSheet, Platform, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const Colors = {
  black: '#000000',
  white: '#FFFFFF',
  grey: '#757575',
  lightGrey: '#E0E0E0',
  ultraLightGrey: '#F5F5F5',
  success: '#2E7D32',
  error: '#D32F2F',
  warning: '#FFA000',
  info: '#1565C0',
  neon: '#00FF00',
  black8: 'rgba(0,0,0,0.08)',
  black16: 'rgba(0,0,0,0.16)',
  black26: 'rgba(0,0,0,0.26)',
  black40: 'rgba(0,0,0,0.40)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  display: 44,
};

export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
};

export const Shadows = StyleSheet.create({
  sm: {
    shadowColor: Colors.black,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.black,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 0,
    elevation: 6,
  },
});

export const SCREEN = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };
