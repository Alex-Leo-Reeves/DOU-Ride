import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import MapView, { MapViewRef } from '../../components/map/MapView';
import type { MarkerData, MapRegion } from '../../components/map/types';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { API } from '../../config/api';
import { useLandmarkStore } from '../../stores/landmarkStore';
import { useAuthStore } from '../../stores/authStore';

// ─── Constants ───────────────────────────────────────────────────

const LANDMARK_TYPES = [
  { key: 'destination', label: 'Destination', icon: '🚩' },
  { key: 'pickup_zone', label: 'Pickup Zone', icon: '🚏' },
  { key: 'vendor', label: 'Vendor', icon: '🏪' },
  { key: 'medical_center', label: 'Medical Centre', icon: '🏥' },
  { key: 'park', label: 'Park', icon: '🅿' },
  { key: 'gate', label: 'Gate', icon: '🚪' },
];

const TYPE_COLORS: Record<string, string> = {
  destination: Colors.error,
  pickup_zone: Colors.info,
  vendor: Colors.warning,
  medical_center: Colors.error,
  park: Colors.success,
  gate: Colors.grey,
};

const INITIAL_REGION: MapRegion = {
  latitude: API.campusCenterLat,
  longitude: API.campusCenterLng,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// ─── Component ───────────────────────────────────────────────────

export default function DeveloperMappingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const mapRef = useRef<MapViewRef>(null);
  const { user } = useAuthStore();
  const { landmarks, isLoading: storeLoading, fetchLandmarks, addLandmark, deleteLandmark } = useLandmarkStore();

  const [capturedPoint, setCapturedPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('destination');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [region, setRegion] = useState(INITIAL_REGION);

  // Fetch landmarks from server on mount
  useEffect(() => {
    fetchLandmarks();
  }, []);

  // ── Capture GPS location ──

  const captureCurrentLocation = useCallback(async () => {
    setIsCapturing(true);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required.');
      setIsCapturing(false);
      return;
    }

    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
      });

      const point = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };

      setCapturedPoint(point);
      const newRegion = {
        latitude: point.latitude,
        longitude: point.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 500);
    } catch (e: any) {
      Alert.alert('GPS Error', `Failed to get location: ${e.message}`);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // ── Map tap ──

  const handleMapPress = useCallback((coord: { latitude: number; longitude: number }) => {
    setCapturedPoint(coord);
  }, []);

  // ── Save landmark to backend ──

  const saveLandmark = useCallback(async () => {
    if (!capturedPoint) {
      Alert.alert('No Point', 'Tap the map or use GPS to capture a location first.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Name Required', 'Enter a name for this landmark.');
      return;
    }
    if (!user?.userId) {
      Alert.alert('Not Authenticated', 'You must be logged in as a developer.');
      return;
    }

    setIsSaving(true);

    const result = await addLandmark(
      name.trim(),
      capturedPoint.latitude,
      capturedPoint.longitude,
      selectedType,
      user.userId,
      user.token,
    );

    setIsSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      setName('');
      setCapturedPoint(null);
      Alert.alert('Saved', `"${name.trim()}" saved to campus landmarks.`);
    }
  }, [capturedPoint, name, selectedType, user, addLandmark]);

  // ── Delete a saved landmark ──
  const handleDelete = useCallback(async (id: string, displayName: string) => {
    Alert.alert('Delete Landmark', `Remove "${displayName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteLandmark(id, user?.token);
          if (result.error) Alert.alert('Error', result.error);
        },
      },
    ]);
  }, [deleteLandmark, user?.token]);

  // ── Clear captured point ──

  const clearCapture = useCallback(() => {
    setCapturedPoint(null);
  }, []);

  // ── Build markers array for the map ──

  const markers: MarkerData[] = [
    // Captured point (if any)
    ...(capturedPoint
      ? [
          {
            latitude: capturedPoint.latitude,
            longitude: capturedPoint.longitude,
            title: name || 'New Landmark',
            description: `${capturedPoint.latitude.toFixed(6)}, ${capturedPoint.longitude.toFixed(6)}`,
            pinColor: TYPE_COLORS[selectedType] || Colors.error,
          },
        ]
      : []),
    // Saved landmarks from backend
    ...landmarks.map((lm) => ({
      id: lm.id,
      latitude: lm.latitude,
      longitude: lm.longitude,
      title: lm.displayName,
      description: `Type: ${lm.landmarkType}`,
      pinColor: TYPE_COLORS[lm.landmarkType] || Colors.black,
    })),
  ];

  // ── Render ──

  const canSave = capturedPoint !== null && name.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>🗺️ GPS Mapper</Text>
          <Text style={styles.subtitle}>Pin & save campus landmarks</Text>
        </View>
        <View style={styles.devBadge}>
          <Text style={styles.devBadgeText}>DEV</Text>
        </View>
      </View>

      {/* ── Map ── */}
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          initialRegion={INITIAL_REGION}
          region={region}
          onPress={handleMapPress}
          showsUserLocation
          showsMyLocationButton={false}
          markers={markers}
        />

        {/* GPS FAB */}
        <TouchableOpacity
          style={styles.gpsFab}
          onPress={captureCurrentLocation}
          activeOpacity={0.8}
        >
          {isCapturing ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.gpsFabIcon}>📡</Text>
          )}
        </TouchableOpacity>

        {/* Coordinate overlay */}
        {capturedPoint && (
          <View style={styles.coordOverlay}>
            <Text style={styles.coordText}>
              📍 {capturedPoint.latitude.toFixed(6)}, {capturedPoint.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      {/* ── Form ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.formContainer}
      >
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Landmark name (e.g. School of Midwifery)"
              placeholderTextColor={Colors.grey}
              editable={!!capturedPoint}
            />
          </View>

          {/* Type chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
          >
            {LANDMARK_TYPES.map((type) => {
              const isSelected = selectedType === type.key;
              return (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.chip,
                    isSelected && styles.chipActive,
                    !capturedPoint && styles.chipDisabled,
                  ]}
                  onPress={() => setSelectedType(type.key)}
                  disabled={!capturedPoint}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipIcon}>{type.icon}</Text>
                  <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            {capturedPoint && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={clearCapture}
                activeOpacity={0.7}
              >
                <Text style={styles.clearBtnText}>✕ Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                (!canSave || isSaving) && styles.saveBtnDisabled,
              ]}
              onPress={saveLandmark}
              disabled={!canSave || isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.saveBtnText}>💾 Save to Server</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Loading indicator */}
          {storeLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.black} />
              <Text style={styles.loadingText}>Loading landmarks...</Text>
            </View>
          )}

          {/* Saved landmarks list */}
          {landmarks.length > 0 && (
            <>
              <Text style={styles.listTitle}>
                📍 Saved on Server ({landmarks.length})
              </Text>
              {landmarks.map((lm) => (
                <View key={lm.id} style={styles.landmarkRow}>
                  <View style={styles.landmarkInfo}>
                    <Text style={styles.landmarkName}>{lm.displayName}</Text>
                    <Text style={styles.landmarkMeta}>
                      {lm.landmarkType.replace(/_/g, ' ')} — {lm.latitude.toFixed(5)}, {lm.longitude.toFixed(5)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(lm.id!, lm.displayName)}
                  >
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {/* Empty state hint */}
          {!capturedPoint && landmarks.length === 0 && (
            <View style={styles.hintBox}>
              <Text style={styles.hintIcon}>👆</Text>
              <Text style={styles.hintText}>
                Tap on the map or press the GPS button to capture a location
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: Colors.black,
    backgroundColor: Colors.white,
  },
  backBtn: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  backText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.black,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.black,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.grey,
    marginTop: 1,
  },
  devBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  devBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.black,
  },

  // Map
  mapWrapper: {
    height: '45%',
    position: 'relative',
    borderBottomWidth: 3,
    borderBottomColor: Colors.black,
  },
  gpsFab: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    ...Shadows.lg,
  },
  gpsFabIcon: {
    fontSize: 22,
  },
  coordOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.black,
    alignItems: 'center',
  },
  coordText: {
    fontSize: FontSize.xs,
    fontWeight: 'bold',
    color: Colors.black,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Form
  formContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  formContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  inputRow: {
    marginBottom: Spacing.sm,
  },
  nameInput: {
    borderWidth: 2.5,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.black,
    backgroundColor: Colors.white,
  },

  // Chips
  chipScroll: {
    marginBottom: Spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.black,
    backgroundColor: Colors.white,
  },
  chipActive: {
    backgroundColor: Colors.black,
    borderColor: Colors.black,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  chipLabel: {
    fontSize: FontSize.xs,
    fontWeight: 'bold',
    color: Colors.black,
  },
  chipLabelActive: {
    color: Colors.white,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  clearBtn: {
    flex: 1,
    borderWidth: 2.5,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  clearBtnText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.black,
  },
  saveBtn: {
    flex: 2,
    borderWidth: 2.5,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.black,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.white,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.grey,
  },
  listTitle: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  landmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.ultraLightGrey,
  },
  landmarkInfo: {
    flex: 1,
  },
  landmarkName: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.black,
  },
  landmarkMeta: {
    fontSize: FontSize.xs,
    color: Colors.grey,
    marginTop: 1,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.error,
  },

  // Hint
  hintBox: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.lightGrey,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.ultraLightGrey,
    borderStyle: 'dashed',
  },
  hintIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  hintText: {
    fontSize: FontSize.sm,
    color: Colors.grey,
    textAlign: 'center',
    lineHeight: 18,
  },
});
