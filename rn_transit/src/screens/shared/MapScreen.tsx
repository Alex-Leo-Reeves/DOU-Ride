import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import MapView from '../../components/map/MapView';
import type { MapRegion, MarkerData } from '../../components/map/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius } from '../../config/theme';
import { API } from '../../config/api';
import { useLandmarkStore } from '../../stores/landmarkStore';

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
  pickup: Colors.info,
  destination: Colors.error,
  driver: Colors.success,
  landmark: Colors.black,
};

const LANDMARK_TYPE_COLORS: Record<string, string> = {
  destination: Colors.error,
  pickup_zone: Colors.info,
  vendor: Colors.warning,
  medical_center: Colors.error,
  park: Colors.success,
  gate: Colors.grey,
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
  const [durationMin] = useState(() => Math.round((distanceKm / 30) * 60));

  // Fetch campus landmarks from the backend
  const { landmarks, fetchLandmarks } = useLandmarkStore();
  useEffect(() => {
    fetchLandmarks();
  }, []);

  // Merge external markers with backend landmarks
  const mapMarkers: MarkerData[] = [
    // Explicitly passed markers (pickup, destination, driver)
    ...(externalMarkers ?? []).map(
      (m): MarkerData => ({
        latitude: m.latitude,
        longitude: m.longitude,
        title: m.label ?? '',
        pinColor: TYPE_COLORS[m.type ?? 'landmark'] ?? Colors.black,
      }),
    ),
    // Campus landmarks from the database
    ...landmarks.map(
      (lm): MarkerData => ({
        id: lm.id,
        latitude: lm.latitude,
        longitude: lm.longitude,
        title: lm.displayName,
        description: `📍 ${lm.landmarkType.replace(/_/g, ' ')}`,
        pinColor: LANDMARK_TYPE_COLORS[lm.landmarkType] || Colors.black,
      }),
    ),
  ];

  const region: MapRegion = {
    latitude: initialCenter?.latitude ?? API.campusCenterLat,
    longitude: initialCenter?.longitude ?? API.campusCenterLng,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <SafeAreaView style={styles.container}>
      {interactive && (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{destinationName ?? 'Map'}</Text>
          <View style={{ width: 50 }} />
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

        {routePoints.length >= 2 && (
          <View style={styles.routeInfo}>
            <Text style={styles.routeInfoText}>
              📍 {distanceKm.toFixed(1)} km · 🕐 {durationMin} min
            </Text>
            {destinationName && (
              <Text style={styles.routeInfoDest}>→ {destinationName}</Text>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function haversine(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: Colors.black,
  },
  backBtn: { fontSize: FontSize.md, color: Colors.black, fontWeight: '600' },
  title: { fontSize: FontSize.xl, fontWeight: 'bold' },
  mapContainer: { flex: 1, position: 'relative' },
  routeInfo: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    backgroundColor: Colors.white + 'EC',
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeInfoText: { fontSize: FontSize.sm, fontWeight: 'bold' },
  routeInfoDest: { fontSize: FontSize.sm, color: Colors.grey },
});
