import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Shadows } from '../config/theme';

export type MarkerType =
  | 'pickup'
  | 'destination'
  | 'driver'
  | 'student'
  | 'driverEnRoute'
  | 'landmark'
  | 'vendor'
  | 'medical'
  | 'gate'
  | 'park';

const MARKER_CONFIG: Record<MarkerType, { bg: string; icon: string }> = {
  pickup: { bg: '#1565C0', icon: '📍' },
  destination: { bg: Colors.error, icon: '🚩' },
  driver: { bg: Colors.black, icon: '🚕' },
  student: { bg: '#1565C0', icon: '👤' },
  driverEnRoute: { bg: '#2E7D32', icon: '🚗' },
  landmark: { bg: '#6A1B9A', icon: '📍' },
  vendor: { bg: '#E65100', icon: '🏪' },
  medical: { bg: Colors.error, icon: '🏥' },
  gate: { bg: '#37474F', icon: '🚪' },
  park: { bg: '#33691E', icon: '🅿' },
};

interface DouMapMarkerProps {
  type: MarkerType;
  label?: string;
  size?: number;
}

export function DouMapMarker({ type, label, size = 40 }: DouMapMarkerProps) {
  const config = MARKER_CONFIG[type];

  return (
    <View style={styles.wrapper}>
      {label && type === 'landmark' && (
        <View style={styles.labelAbove}>
          <Text style={styles.labelText} numberOfLines={1}>{label}</Text>
        </View>
      )}
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: config.bg,
          },
        ]}
      >
        <Text style={[styles.icon, { fontSize: size * 0.5 }]}>{config.icon}</Text>
      </View>
      {label && type !== 'landmark' && (
        <View style={styles.labelBelow}>
          <Text style={styles.labelText} numberOfLines={1}>{label}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  circle: {
    borderWidth: 2.5,
    borderColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
  },
  icon: {
    lineHeight: undefined,
  },
  labelAbove: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 2,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.black,
  },
  labelBelow: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    backgroundColor: Colors.white,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.black,
  },
  labelText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.black,
    maxWidth: 80,
  },
});

export function getMarkerIcon(type: MarkerType): string {
  return MARKER_CONFIG[type].icon;
}

export function getMarkerColor(type: MarkerType): string {
  return MARKER_CONFIG[type].bg;
}
