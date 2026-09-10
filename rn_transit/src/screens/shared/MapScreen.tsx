import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import MapView from '../../components/map/MapView';
import type { MapRegion, MarkerData } from '../../components/map/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Compass,
  Navigation,
  Layers,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { API } from '../../config/api';
import { useLandmarkStore } from '../../stores/landmarkStore';
import { DouCard } from '../../components/DouCard';

interface MapPoint {
  latitude: number;
  longitude: number;
  label?: string;
  type?: 'pickup' | 'destination' | 'landmark' | 'driver';
}

interface MapScreenProps {
  initialCenter?: { latitude: number; longitude: number };
  initialZoom?: number;
  markers?: MapPoint[];
  routePoints?: { latitude: number; longitude: number }[];
  destinationName?: string;
  showRoute?: boolean;
  interactive?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  pickup: Colors.secondary,
  destination: Colors.primary,
  driver: Colors.success,
  landmark: Colors.slate700,
};

export default function MapScreen({
  initialCenter,
  markers: externalMarkers,
  routePoints: externalRoutePoints,
  destinationName,
  interactive = true,
}: MapScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [routePoints] = useState(externalRoutePoints ?? []);
  const [distanceKm] = useState(() => {
    if (!routePoints || routePoints.length < 2) return 0;
    let d = 0;
    for (let i = 1; i < routePoints.length; i++) {
      d += haversine(routePoints[i - 1], routePoints[i]);
    }
    return d;
  });
  const [durationMin] = useState(() => Math.max(1, Math.round((distanceKm / 25) * 60)));

  const { landmarks, fetchLandmarks } = useLandmarkStore();
  useEffect(() => {
    fetchLandmarks();
  }, []);

  const mapMarkers: MarkerData[] = [
    ...(externalMarkers ?? []).map(
      (m): MarkerData => ({
        latitude: m.latitude,
        longitude: m.longitude,
        title: m.label ?? '',
        pinColor: TYPE_COLORS[m.type ?? 'landmark'] ?? Colors.primary,
      })
    ),
    ...landmarks.map(
      (lm): MarkerData => ({
        id: lm.id,
        latitude: lm.latitude,
        longitude: lm.longitude,
        title: lm.displayName,
        description: lm.landmarkType.replace(/_/g, ' '),
        pinColor: Colors.primary,
      })
    ),
  ];

  const region: MapRegion = {
    latitude: initialCenter?.latitude ?? API.campusCenterLat,
    longitude: initialCenter?.longitude ?? API.campusCenterLng,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      {interactive && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={Colors.slate800} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>{destinationName ?? 'Campus Geographic Map'}</Text>
            <Text style={styles.headerSubtitle}>Dennis Osadebay University • Asaba</Text>
          </View>
        </View>
      )}

      <View style={styles.mapContainer}>
        <MapView
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton
          markers={mapMarkers}
          routePoints={routePoints.length >= 2 ? routePoints : undefined}
          interactive={interactive}
        />

        {/* Floating Route Overview Pill */}
        {routePoints.length >= 2 && (
          <DouCard variant="elevated" padding={Spacing.sm} style={styles.routeFloatingCard}>
            <View style={styles.routeFloatingRow}>
              <View style={styles.navIconWrap}>
                <Navigation size={16} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.routeFloatingTitle}>
                  {destinationName ?? 'Campus Destination'}
                </Text>
                <View style={styles.metricsRow}>
                  <Text style={styles.metricsValue}>{distanceKm.toFixed(1)} km</Text>
                  <Text style={styles.metricsDot}>•</Text>
                  <Clock size={11} color={Colors.slate500} />
                  <Text style={styles.metricsValue}>~{durationMin} min ride</Text>
                </View>
              </View>
            </View>
          </DouCard>
        )}
      </View>
    </SafeAreaView>
  );
}

function haversine(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  routeFloatingCard: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    ...Shadows.md,
  },
  routeFloatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeFloatingTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metricsValue: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate600,
  },
  metricsDot: {
    color: Colors.slate400,
    fontSize: 10,
  },
});
