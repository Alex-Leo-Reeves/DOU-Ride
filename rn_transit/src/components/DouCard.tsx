import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius, Shadows } from '../config/theme';

interface DouCardProps {
  children: React.ReactNode;
  padding?: number;
  margin?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export function DouCard({ children, padding = 16, margin, onPress, style }: DouCardProps) {
  const containerStyle: ViewStyle = {
    padding,
    ...(margin ? { margin } : {}),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.card, containerStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, containerStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.black,
    ...Shadows.lg,
  },
});
