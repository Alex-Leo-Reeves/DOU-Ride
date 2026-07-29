import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, FontSize } from '../config/theme';

interface BalancePillProps {
  balance: number;
  onPress?: () => void;
}

export function BalancePill({ balance, onPress }: BalancePillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>₦{balance.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: Colors.black,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  label: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
