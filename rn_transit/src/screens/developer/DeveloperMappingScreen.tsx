import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  DimensionValue,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';

interface Landmark {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'campus' | 'stop' | 'terminal' | 'landmark';
}

interface RoutePath {
  id: string;
  name: string;
  color: string;
  waypoints: { lat: number; lng: number }[];
}

const MOCK_LANDMARKS: Landmark[] = [
  { id: 'L1', name: 'Main Campus Gate', lat: 6.5244, lng: 3.3792, type: 'campus' },
  { id: 'L2', name: 'Faculty of Science', lat: 6.5250, lng: 3.3800, type: 'landmark' },
  { id: 'L3', name: 'Engineering Complex', lat: 6.5260, lng: 3.3810, type: 'landmark' },
  { id: 'L4', name: 'Bus Terminal A', lat: 6.5230, lng: 3.3785, type: 'terminal' },
  { id: 'L5', name: 'Stop 1 – Library', lat: 6.5248, lng: 3.3798, type: 'stop' },
  { id: 'L6', name: 'Stop 2 – Cafeteria', lat: 6.5255, lng: 3.3805, type: 'stop' },
  { id: 'L7', name: 'Stop 3 – Hostel Road', lat: 6.5265, lng: 3.3815, type: 'stop' },
  { id: 'L8', name: 'Admin Building', lat: 6.5240, lng: 3.3790, type: 'landmark' },
];

const MOCK_ROUTES: RoutePath[] = [
  {
    id: 'R1',
    name: 'Campus Loop',
    color: '#2E7D32',
    waypoints: [
      { lat: 6.5244, lng: 3.3792 },
      { lat: 6.5250, lng: 3.3800 },
      { lat: 6.5260, lng: 3.3810 },
      { lat: 6.5265, lng: 3.3815 },
      { lat: 6.5255, lng: 3.3805 },
      { lat: 6.5248, lng: 3.3798 },
      { lat: 6.5244, lng: 3.3792 },
    ],
  },
];

const typeColors: Record<string, string> = {
  campus: Colors.success,
  stop: Colors.info,
  terminal: Colors.warning,
  landmark: Colors.grey,
};

const typeIcons: Record<string, string> = {
  campus: '🏛️',
  stop: '🚏',
  terminal: '🚉',
  landmark: '📍',
};

function posOffset(v: number, base: number, scale: number): DimensionValue {
  return `${15 + (v - base) * scale}%` as DimensionValue;
}

export default function DeveloperMappingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [showRoutes, setShowRoutes] = useState(true);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const toggleRoute = useCallback((routeId: string) => {
    setSelectedRoute((prev) => (prev === routeId ? null : routeId));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Route Map</Text>
          <View style={styles.devBadge}>
            <Text style={styles.devBadgeText}>DEV</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Debug map with landmarks & route overlay testing</Text>
      </View>

      <View style={styles.mapContainer}>
        {showRoutes &&
          MOCK_ROUTES.map((route) => (
            <View key={route.id} style={StyleSheet.absoluteFill}>
              {route.waypoints.slice(0, -1).map((wp, idx) => (
                <View
                  key={`seg-${idx}`}
                  style={[
                    styles.routeSegment,
                    {
                      backgroundColor: route.color,
                      left: posOffset(wp.lng, 3.378, 1000),
                      top: posOffset(6.527, wp.lat, 1000),
                    },
                    selectedRoute === route.id && styles.routeSegmentSelected,
                  ]}
                />
              ))}
              {route.waypoints.map((wp, idx) => (
                <View
                  key={`node-${idx}`}
                  style={[
                    styles.routeNode,
                    {
                      left: posOffset(wp.lng, 3.378, 1000),
                      top: posOffset(6.527, wp.lat, 1000),
                      backgroundColor: route.color,
                    },
                    idx === 0 && styles.routeNodeStart,
                    idx === route.waypoints.length - 1 && styles.routeNodeEnd,
                  ]}
                />
              ))}
            </View>
          ))}
        {showLandmarks &&
          MOCK_LANDMARKS.map((lm) => (
            <View
              key={lm.id}
              style={[
                styles.landmarkDot,
                {
                  left: posOffset(lm.lng, 3.378, 1000),
                  top: posOffset(6.527, lm.lat, 1000),
                  borderColor: typeColors[lm.type],
                },
              ]}
            />
          ))}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, showLandmarks && styles.controlBtnActive]}
          onPress={() => setShowLandmarks((p) => !p)}
        >
          <Text style={[styles.controlBtnText, showLandmarks && styles.controlBtnTextActive]}>Landmarks</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.controlBtn, showRoutes && styles.controlBtnActive]}
          onPress={() => setShowRoutes((p) => !p)}
        >
          <Text style={[styles.controlBtnText, showRoutes && styles.controlBtnTextActive]}>Routes</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.legendContainer} contentContainerStyle={styles.legendContent}>
        <Text style={styles.sectionTitle}>Routes</Text>
        {MOCK_ROUTES.map((route) => (
          <TouchableOpacity
            key={route.id}
            style={[styles.legendItem, selectedRoute === route.id && styles.legendItemSelected]}
            onPress={() => toggleRoute(route.id)}
          >
            <View style={[styles.routeColorDot, { backgroundColor: route.color }]} />
            <Text style={styles.legendItemText}>{route.name} ({route.waypoints.length} stops)</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Landmarks</Text>
        {MOCK_LANDMARKS.map((lm) => (
          <View key={lm.id} style={styles.legendItem}>
            <Text style={styles.legendItemIcon}>{typeIcons[lm.type]}</Text>
            <View style={styles.legendItemContent}>
              <Text style={styles.legendItemText}>{lm.name}</Text>
              <Text style={styles.legendItemCoords}>{lm.lat.toFixed(4)}, {lm.lng.toFixed(4)}</Text>
            </View>
            <View style={[styles.legendTypeBadge, { borderColor: typeColors[lm.type] }]}>
              <Text style={[styles.legendTypeText, { color: typeColors[lm.type] }]}>{lm.type}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerNote}>Coordinates: approximate campus map simulation</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: Colors.black,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: FontSize.xxxl, fontWeight: 'bold', color: Colors.black },
  devBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  devBadgeText: { fontSize: FontSize.xs, fontWeight: 'bold', color: Colors.black },
  subtitle: { fontSize: FontSize.sm, color: Colors.grey, marginTop: Spacing.xs },
  mapContainer: {
    height: 280,
    margin: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.ultraLightGrey,
    overflow: 'hidden',
    position: 'relative',
  },
  routeSegment: { position: 'absolute', width: '25%', height: 3 },
  routeSegmentSelected: { opacity: 1, height: 5 },
  routeNode: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  routeNodeStart: { width: 14, height: 14, borderRadius: 7 },
  routeNodeEnd: { width: 14, height: 14, borderRadius: 7 },
  landmarkDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.white,
    borderWidth: 3,
  },
  controls: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  controlBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  controlBtnActive: { backgroundColor: Colors.black },
  controlBtnText: { fontSize: FontSize.sm, fontWeight: 'bold', color: Colors.black },
  controlBtnTextActive: { color: Colors.white },
  legendContainer: { flex: 1 },
  legendContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: Colors.black,
    paddingBottom: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGrey,
  },
  legendItemSelected: { backgroundColor: Colors.black8 },
  legendItemIcon: { fontSize: 18, marginRight: Spacing.sm },
  legendItemContent: { flex: 1 },
  legendItemText: { fontSize: FontSize.md, color: Colors.black, fontWeight: '500' },
  legendItemCoords: { fontSize: FontSize.xs, color: Colors.grey, fontFamily: 'monospace' },
  routeColorDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.black,
  },
  legendTypeBadge: { borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  legendTypeText: { fontSize: FontSize.xs, fontWeight: 'bold' },
  footer: {
    padding: Spacing.md,
    borderTopWidth: 2,
    borderTopColor: Colors.black,
    alignItems: 'center',
  },
  footerNote: { fontSize: FontSize.xs, color: Colors.grey, fontStyle: 'italic' },
});
