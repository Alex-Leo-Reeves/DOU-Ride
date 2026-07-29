import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';

export default function LocationSharingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = async () => {
    setIsLoading(true);
    setError(null);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied. Enable in Settings.');
      setIsLoading(false);
      return;
    }

    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
      });
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
    } catch (e: any) {
      setError('Failed to get location. Make sure GPS is enabled.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const shareLocation = async () => {
    if (latitude == null || longitude == null) return;

    const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const shareText = [
      `📍 I'm at DOU Campus`,
      `Lat: ${latitude.toFixed(6)}`,
      `Lng: ${longitude.toFixed(6)}`,
      `Open in Maps: ${mapsUrl}`,
    ].join('\n');

    if (Platform.OS === 'web') {
      try {
        await navigator.share({ text: shareText });
      } catch {
        await Clipboard.setStringAsync(shareText);
        Alert.alert('Copied!', 'Location copied to clipboard.');
      }
    } else {
      // On native, use Share API via expo-sharing or just clipboard
      await Clipboard.setStringAsync(shareText);
      Alert.alert('Copied!', 'Location coordinates copied to clipboard. You can paste them into any app.');
    }
  };

  const copyCoordinates = async () => {
    if (latitude == null || longitude == null) return;
    await Clipboard.setStringAsync(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    Alert.alert('Copied!', 'Coordinates copied to clipboard.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Share Location</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>📍</Text>
        </View>
        <Text style={styles.heading}>Share Your Location</Text>
        <Text style={styles.subheading}>
          Send your current GPS coordinates to a friend, driver, or emergency contact.
        </Text>

        {/* Loading */}
        {isLoading && (
          <View style={styles.stateRow}>
            <ActivityIndicator color={Colors.black} />
            <Text style={styles.stateText}>Fetching your location...</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Coordinates */}
        {latitude != null && longitude != null && (
          <>
            <View style={styles.coordBox}>
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>Latitude</Text>
                <Text style={styles.coordValue}>{latitude.toFixed(6)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.coordRow}>
                <Text style={styles.coordLabel}>Longitude</Text>
                <Text style={styles.coordValue}>{longitude.toFixed(6)}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={shareLocation}>
              <Text style={styles.shareBtnText}>📤 Share Location</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.copyBtn} onPress={copyCoordinates}>
              <Text style={styles.copyBtnText}>📋 Copy Coordinates</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.refreshBtn} onPress={fetchLocation}>
              <Text style={styles.refreshBtnText}>🔄 Refresh Location</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Info hint */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Shared links open in Google Maps for easy navigation.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
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
  content: { padding: Spacing.lg, alignItems: 'center' },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  iconText: { fontSize: 48 },
  heading: { fontSize: 22, fontWeight: 'bold', marginBottom: Spacing.sm },
  subheading: {
    fontSize: FontSize.md,
    color: Colors.grey,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: Spacing.lg },
  stateText: { fontSize: FontSize.md, color: Colors.grey },
  errorBox: {
    width: '100%',
    padding: Spacing.md,
    backgroundColor: Colors.error + '18',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.error,
    marginBottom: Spacing.lg,
  },
  errorText: { color: Colors.error, fontSize: FontSize.md },
  coordBox: {
    width: '100%',
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  coordLabel: { fontSize: FontSize.md, color: Colors.grey },
  coordValue: { fontSize: FontSize.md, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: Colors.lightGrey, marginVertical: Spacing.xs },
  shareBtn: {
    width: '100%',
    backgroundColor: Colors.black,
    paddingVertical: 16,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  shareBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: FontSize.lg },
  copyBtn: {
    width: '100%',
    borderWidth: 2,
    borderColor: Colors.black,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  copyBtnText: { color: Colors.black, fontWeight: 'bold', fontSize: FontSize.md },
  refreshBtn: {
    paddingVertical: 12,
    marginTop: Spacing.sm,
  },
  refreshBtnText: { color: Colors.grey, fontSize: FontSize.md },
  infoBox: {
    width: '100%',
    padding: Spacing.md,
    backgroundColor: Colors.ultraLightGrey,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xxl,
  },
  infoText: { fontSize: FontSize.sm, color: Colors.grey, textAlign: 'center' },
});
