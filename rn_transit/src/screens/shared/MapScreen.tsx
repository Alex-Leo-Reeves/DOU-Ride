import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { API } from '../../config/api';

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

export default function MapScreen({
  initialCenter,
  initialZoom,
  markers: externalMarkers,
  routePoints: externalRoutePoints,
  destinationName,
  showRoute: initialShowRoute = false,
  interactive = true,
}: MapScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [routePoints] = useState<{ latitude: number; longitude: number }[]>(externalRoutePoints ?? []);
  const [distanceKm] = useState(() => {
    if (!routePoints || routePoints.length < 2) return 0;
    // Rough estimate from polyline points
    let d = 0;
    for (let i = 1; i < routePoints.length; i++) {
      d += haversine(routePoints[i - 1], routePoints[i]);
    }
    return d;
  });
  const [durationMin] = useState(() => Math.round((distanceKm / 30) * 60)); // ~30 km/h campus speed

  const markers = externalMarkers ?? [];
  const region: Region = {
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
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton
          rotateEnabled={false}
          minZoomLevel={12}
          maxZoomLevel={19}
        >
          {/* Route polyline */}
          {routePoints.length >= 2 && (
            <Polyline
              coordinates={routePoints}
              strokeColor={Colors.black}
              strokeWidth={4}
              lineDashPattern={[0]}
            />
          )}

          {/* Markers */}
          {markers.map((m, i) => (
            <Marker
              key={i}
              coordinate={{ latitude: m.latitude, longitude: m.longitude }}
              title={m.label ?? ''}
              pinColor={
                m.type === 'pickup' ? Colors.info :
                m.type === 'destination' ? Colors.error :
                m.type === 'driver' ? Colors.success :
                Colors.black
              }
            />
          ))}
        </MapView>

        {/* Route info overlay */}
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

/** Haversine distance in km between two lat/lng points */
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
  map: { flex: 1 },
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
