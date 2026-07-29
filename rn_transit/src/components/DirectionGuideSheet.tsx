import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, FontSize, BorderRadius, Spacing, Shadows } from '../config/theme';
import { getRouteSteps } from '../services/osrmService';
import type { RouteStep, RoutePoint } from '../services/osrmService';

interface DirectionGuideSheetProps {
  route: RoutePoint[];
  destinationName: string;
  distanceMeters: number;
  durationSeconds: number;
  start: RoutePoint;
  end: RoutePoint;
  visible: boolean;
}

export function DirectionGuideSheet({
  route,
  destinationName,
  distanceMeters,
  durationSeconds,
  start,
  end,
  visible,
}: DirectionGuideSheetProps) {
  const [steps, setSteps] = useState<RouteStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      const fetched = await getRouteSteps(start.lat, start.lng, end.lat, end.lng);
      if (!cancelled) {
        setSteps(fetched.length > 0 ? fetched : fallbackSteps());
        setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [start.lat, start.lng, end.lat, end.lng]);

  const fallbackSteps = (): RouteStep[] => {
    if (route.length < 2) return [];
    const result: RouteStep[] = [];
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i];
      const b = route[i + 1];
      const dist = haversine(a.lat, a.lng, b.lat, b.lng);
      if (dist > 5) {
        const bearing = calcBearing(a.lat, a.lng, b.lat, b.lng);
        result.push({
          instruction: bearingToInstruction(bearing),
          distanceMeters: dist,
          durationSeconds: dist / 1.4,
        });
      }
    }
    return result;
  };

  if (!visible) return null;

  const distanceKm = distanceMeters / 1000;
  const durationMin = Math.round(durationSeconds / 60);

  return (
    <View style={styles.container}>
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.carIcon}>🚗</Text>
        <Text style={styles.destName} numberOfLines={1}>{destinationName}</Text>
        <Text style={styles.distance}>{distanceKm.toFixed(1)} km</Text>
        <Text style={styles.duration}>{durationMin} min</Text>
      </View>

      <View style={styles.divider} />

      {/* Steps */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.black} />
        </View>
      ) : steps.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={{ color: Colors.grey }}>No route available</Text>
        </View>
      ) : (
        <ScrollView style={styles.stepsList}>
          <StepTile
            number="S"
            instruction="Start at your location"
            isFirst
          />
          {steps.map((step, index) => (
            <StepTile
              key={index}
              number={`${index + 1}`}
              instruction={step.instruction}
              distanceMeters={step.distanceMeters}
              turnModifier={step.turnModifier}
              isLast={index === steps.length - 1}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function StepTile({
  number,
  instruction,
  distanceMeters,
  isFirst,
  isLast,
  turnModifier,
}: {
  number: string;
  instruction: string;
  distanceMeters?: number;
  isFirst?: boolean;
  isLast?: boolean;
  turnModifier?: string;
}) {
  const icon = isFirst ? '✅' : getTurnIcon(turnModifier);

  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumberCol}>
        {!isFirst && <View style={styles.connector} />}
        <View style={[styles.stepCircle, isFirst && styles.stepCircleFirst]}>
          <Text style={styles.stepCircleText}>{icon}</Text>
        </View>
        {!isLast && <View style={styles.connector} />}
      </View>

      <View style={styles.stepContent}>
        <Text style={[styles.stepInstruction, isFirst && { fontWeight: 'bold' }]}>
          {instruction.charAt(0).toUpperCase() + instruction.slice(1)}
        </Text>
        {distanceMeters != null && distanceMeters > 0 && (
          <Text style={styles.stepDistance}>{distanceMeters.toFixed(0)} m</Text>
        )}
      </View>
    </View>
  );
}

function getTurnIcon(modifier?: string): string {
  switch (modifier) {
    case 'left':
    case 'sharp left':
      return '⬅';
    case 'right':
    case 'sharp right':
      return '➡';
    case 'straight':
      return '⬆';
    case 'uturn':
      return '⬇';
    case 'slight left':
      return '↖';
    case 'slight right':
      return '↗';
    default:
      return '⬆';
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function calcBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function toDeg(rad: number): number {
  return rad * (180 / Math.PI);
}

function bearingToInstruction(bearing: number): string {
  if (bearing >= 337.5 || bearing < 22.5) return 'Head north';
  if (bearing < 67.5) return 'Head northeast';
  if (bearing < 112.5) return 'Head east';
  if (bearing < 157.5) return 'Head southeast';
  if (bearing < 202.5) return 'Head south';
  if (bearing < 247.5) return 'Head southwest';
  if (bearing < 292.5) return 'Head west';
  return 'Head northwest';
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 2,
    borderTopColor: Colors.black,
    maxHeight: '50%',
    ...Shadows.lg,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.lightGrey,
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  carIcon: { fontSize: 20, marginRight: 8 },
  destName: {
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  distance: { fontSize: 14, color: Colors.grey, marginRight: 8 },
  duration: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.lightGrey,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  stepsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  stepNumberCol: {
    width: 48,
    alignItems: 'center',
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.lightGrey,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleFirst: {
    backgroundColor: Colors.success,
  },
  stepCircleText: {
    fontSize: 14,
    color: Colors.white,
  },
  stepContent: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  stepInstruction: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.black,
  },
  stepDistance: {
    fontSize: 12,
    color: Colors.grey,
    marginTop: 2,
  },
});
