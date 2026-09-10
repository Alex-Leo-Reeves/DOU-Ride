import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../config/theme';

export interface DouCardProps {
  children: React.ReactNode;
  padding?: number;
  margin?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat' | 'accent' | 'glow';
  activeOpacity?: number;
  disabled?: boolean;
}

export function DouCard({
  children,
  padding = Spacing.md,
  margin,
  onPress,
  style,
  variant = 'default',
  activeOpacity = 0.85,
  disabled = false,
}: DouCardProps) {
  const containerStyle: ViewStyle = {
    padding,
    ...(margin !== undefined ? { margin } : {}),
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated':
        return styles.cardElevated;
      case 'outlined':
        return styles.cardOutlined;
      case 'flat':
        return styles.cardFlat;
      case 'accent':
        return styles.cardAccent;
      case 'glow':
        return styles.cardGlow;
      case 'default':
      default:
        return styles.cardDefault;
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={activeOpacity}
        style={[styles.base, getVariantStyle(), containerStyle, disabled && styles.disabled, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.base, getVariantStyle(), containerStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  cardDefault: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  cardElevated: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate100,
    ...Shadows.md,
  },
  cardOutlined: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
  },
  cardFlat: {
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  cardAccent: {
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryAccent + '30',
  },
  cardGlow: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primaryAccent + '50',
    ...Shadows.glowPrimary,
  },
  disabled: {
    opacity: 0.6,
  },
});
