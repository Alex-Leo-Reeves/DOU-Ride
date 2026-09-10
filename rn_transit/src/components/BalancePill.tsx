import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Wallet, ChevronRight } from 'lucide-react-native';
import { Colors, BorderRadius, FontSize, Shadows, Spacing } from '../config/theme';
import { Routes } from '../config/routes';

interface BalancePillProps {
  balance: number;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

export function BalancePill({ balance = 0, onPress, size = 'md' }: BalancePillProps) {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate(Routes.studentWallet);
    }
  };

  const formattedBalance = Number(balance || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const isSmall = size === 'sm';

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={[styles.pill, isSmall && styles.pillSmall]}
    >
      <View style={styles.iconContainer}>
        <Wallet size={isSmall ? 13 : 15} color={Colors.primaryAccent} strokeWidth={2.5} />
      </View>
      <Text style={[styles.currencySymbol, isSmall && styles.currencySmall]}>₦</Text>
      <Text style={[styles.balanceText, isSmall && styles.balanceSmall]}>
        {formattedBalance}
      </Text>
      <ChevronRight size={13} color={Colors.slate400} strokeWidth={2.5} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  pillSmall: {
    paddingVertical: 4,
    paddingLeft: 6,
    paddingRight: 6,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  currencySymbol: {
    color: Colors.slate900,
    fontSize: FontSize.sm,
    fontWeight: '800',
    marginRight: 1,
  },
  balanceText: {
    color: Colors.slate900,
    fontSize: FontSize.sm,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  currencySmall: {
    fontSize: FontSize.xs,
  },
  balanceSmall: {
    fontSize: FontSize.xs,
  },
  chevron: {
    marginLeft: 4,
  },
});
