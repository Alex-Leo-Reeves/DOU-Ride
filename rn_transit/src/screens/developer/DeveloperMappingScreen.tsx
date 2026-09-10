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
  StatusBar,
} from 'react-native';
import MapView, { MapViewRef } from '../../components/map/MapView';
import type { MarkerData, MapRegion } from '../../components/map/types';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Crosshair,
  MapPin,
  Trash2,
  Check,
  Building,
  Car,
  Store,
  HeartPulse,
  ParkingSquare,
  Shield,
  Save,
  X,
  Radio,
  Layers,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { API } from '../../config/api';
import { useLandmarkStore } from '../../stores/landmarkStore';
import { useAuthStore } from '../../stores/authStore';
import { DouCard } from '../../components/DouCard';

const LANDMARK_TYPES = [
  { key: 'destination', label: 'Destination', icon: Building, color: Colors.primary },
  { key: 'pickup_zone', label: 'Pickup Zone', icon: Car, color: Colors.secondary },
  { key: 'vendor', label: 'Vendor', icon: Store, color: Colors.warning },
  { key: 'medical_center', label: 'Medical Centre', icon: HeartPulse, color: Colors.error },
  { key: 'park', label: 'School Park', icon: ParkingSquare, color: Colors.success },
  { key: 'gate', label: 'Security Gate', icon: Shield, color: Colors.slate700 },
];

const INITIAL_REGION: MapRegion = {
  latitude: API.campusCenterLat,
  longitude: API.campusCenterLng,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

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

  useEffect(() => {
    fetchLandmarks();
  }, []);

  const captureCurrentLocation = useCallback(async () => {
    setIsCapturing(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required to capture current GPS coordinates.');
      setIsCapturing(false);
      return;
    }

    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
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
      Alert.alert('GPS Error', `Failed to acquire location: ${e.message}`);
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const handleMapPress = useCallback((coord: { latitude: number; longitude: number }) => {
    setCapturedPoint(coord);
  }, []);

  const saveLandmark = useCallback(async () => {
    if (!capturedPoint) {
      Alert.alert('No Point', 'Tap the map or use GPS to capture coordinates.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Name Required', 'Enter a landmark name.');
      return;
    }

    setIsSaving(true);
    const result = await addLandmark(
      name.trim(),
      capturedPoint.latitude,
      capturedPoint.longitude,
      selectedType,
      user?.userId || 'dev',
      user?.token
    );
    setIsSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      setName('');
      setCapturedPoint(null);
      Alert.alert('Landmark Published', `"${name.trim()}" is now active on student & driver maps.`);
    }
  }, [capturedPoint, name, selectedType, user, addLandmark]);

  const handleDelete = useCallback(
    async (id: string, displayName: string) => {
      Alert.alert('Delete Landmark', `Remove "${displayName}" from campus network?`, [
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
    },
    [deleteLandmark, user?.token]
  );

  const markers: MarkerData[] = [
    ...(capturedPoint
      ? [
          {
            latitude: capturedPoint.latitude,
            longitude: capturedPoint.longitude,
            title: name || 'Selected Coordinate',
            description: `${capturedPoint.latitude.toFixed(5)}, ${capturedPoint.longitude.toFixed(5)}`,
            pinColor: Colors.primary,
          },
        ]
      : []),
    ...landmarks.map((lm) => ({
      id: lm.id,
      latitude: lm.latitude,
      longitude: lm.longitude,
      title: lm.displayName,
      description: lm.landmarkType.replace(/_/g, ' '),
      pinColor: Colors.secondary,
    })),
  ];

  const canSave = capturedPoint !== null && name.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.slate800} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Campus GPS GIS Tool</Text>
          <Text style={styles.headerSubtitle}>Real-time campus geometry & landmarks</Text>
        </View>
        <View style={styles.devBadge}>
          <Text style={styles.devBadgeText}>DEV PRO</Text>
        </View>
      </View>

      {/* Map Viewport */}
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

        {/* GPS Capture FAB */}
        <TouchableOpacity
          style={styles.gpsFab}
          onPress={captureCurrentLocation}
          activeOpacity={0.8}
        >
          {isCapturing ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Crosshair size={22} color={Colors.white} />
          )}
        </TouchableOpacity>

        {/* Lat/Lng Coordinate Pill */}
        {capturedPoint && (
          <View style={styles.coordOverlay}>
            <MapPin size={14} color={Colors.primary} />
            <Text style={styles.coordText}>
              {capturedPoint.latitude.toFixed(6)}, {capturedPoint.longitude.toFixed(6)}
            </Text>
            <TouchableOpacity onPress={() => setCapturedPoint(null)} style={styles.coordClose}>
              <X size={12} color={Colors.slate500} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Form Drawer */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.formContainer}
      >
        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          {/* Landmark Name Input */}
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder={
                capturedPoint
                  ? 'Name (e.g. Faculty of Management Sciences)'
                  : 'Tap map or use GPS to set coordinate first'
              }
              placeholderTextColor={Colors.slate400}
              editable={!!capturedPoint}
            />
          </View>

          {/* Type Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {LANDMARK_TYPES.map((type) => {
              const Icon = type.icon;
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
                  <Icon size={14} color={isSelected ? Colors.white : Colors.slate600} />
                  <Text style={[styles.chipLabel, isSelected && styles.chipLabelActive]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Action Row */}
          <View style={styles.actionRow}>
            {capturedPoint && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => setCapturedPoint(null)}
                activeOpacity={0.7}
              >
                <X size={16} color={Colors.slate600} />
                <Text style={styles.clearBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, (!canSave || isSaving) && styles.saveBtnDisabled]}
              onPress={saveLandmark}
              disabled={!canSave || isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Save size={16} color={Colors.white} />
                  <Text style={styles.saveBtnText}>Save Landmark</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Saved Landmarks List */}
          <View style={styles.savedSection}>
            <View style={styles.savedSectionHeader}>
              <Text style={styles.savedSectionTitle}>Active Campus Registry</Text>
              <Text style={styles.savedCount}>{landmarks.length} nodes</Text>
            </View>

            {landmarks.map((lm) => (
              <DouCard key={lm.id} variant="elevated" padding={Spacing.sm} style={styles.lmCard}>
                <View style={styles.lmRow}>
                  <View style={styles.lmInfo}>
                    <Text style={styles.lmName}>{lm.displayName}</Text>
                    <Text style={styles.lmMeta}>
                      {lm.landmarkType.replace(/_/g, ' ')} • {lm.latitude.toFixed(4)},{' '}
                      {lm.longitude.toFixed(4)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(lm.id!, lm.displayName)}
                  >
                    <Trash2 size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </DouCard>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
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
  devBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  devBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  mapWrapper: {
    height: 240,
    backgroundColor: Colors.slate100,
    position: 'relative',
  },
  gpsFab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  coordOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  coordText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate800,
  },
  coordClose: {
    marginLeft: 4,
  },
  formContainer: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
  },
  formContent: {
    padding: Spacing.lg,
  },
  inputWrap: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  nameInput: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate900,
    padding: 0,
  },
  chipRow: {
    gap: 8,
    marginBottom: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate700,
  },
  chipLabelActive: {
    color: Colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  clearBtnText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  savedSection: {
    marginTop: Spacing.xs,
  },
  savedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  savedSectionTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  savedCount: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate500,
  },
  lmCard: {
    marginBottom: Spacing.xs,
  },
  lmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lmInfo: {
    flex: 1,
  },
  lmName: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  lmMeta: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  deleteBtn: {
    padding: 6,
  },
});
