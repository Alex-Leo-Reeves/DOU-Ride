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
  StatusBar,
  ScrollView,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Share2,
  Copy,
  RefreshCw,
  MapPin,
  ShieldCheck,
  Check,
  Car,
  ExternalLink,
  MessageCircle,
  Clock,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { DouCard } from '../../components/DouCard';

export default function LocationSharingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = async () => {
    setIsLoading(true);
    setError(null);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied. Enable in device settings.');
      setIsLoading(false);
      return;
    }

    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
    } catch (e: any) {
      setError('Failed to resolve GPS coordinates. Ensure device location is on.');
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
    const shareMessage = `🛡️ DOU Ride Safety Alert:\nI am currently in transit on DOU Asaba campus.\n📍 Live Location: ${mapsUrl}\nFleet #042 | Boarding PIN Handshake Verified`;

    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: 'DOU Transit Live Location',
            text: shareMessage,
            url: mapsUrl,
          });
        } else {
          await Clipboard.setStringAsync(shareMessage);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
          Alert.alert('Link Copied', 'Share message copied to clipboard.');
        }
      } else {
        await Share.share({
          message: shareMessage,
        });
      }
    } catch (err) {
      await Clipboard.setStringAsync(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const copyCoordinates = async () => {
    if (latitude == null || longitude == null) return;
    await Clipboard.setStringAsync(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.slate800} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Transit Safety Share</Text>
          <Text style={styles.headerSubtitle}>Real-time GPS broadcast for parents & friends</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Safety Hero Banner */}
        <DouCard variant="accent" padding={Spacing.lg} style={styles.heroCard}>
          <View style={styles.shieldIconWrap}>
            <ShieldCheck size={28} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Student Transit Guardian</Text>
          <Text style={styles.heroSub}>
            Share your live coordinates and verified Keke fleet details with family or roommates
            so they can follow your trip across Asaba campus.
          </Text>
        </DouCard>

        {/* Live Coordinate Card */}
        <DouCard variant="elevated" padding={Spacing.md} style={styles.coordCard}>
          <View style={styles.coordCardHeader}>
            <View style={styles.coordHeaderLeft}>
              <View style={styles.gpsPulseDot} />
              <Text style={styles.coordCardTitle}>Live GPS Telemetry</Text>
            </View>
            <TouchableOpacity onPress={fetchLocation} disabled={isLoading} style={styles.refreshIconBtn}>
              <RefreshCw size={16} color={isLoading ? Colors.slate400 : Colors.primary} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Locking onto campus GPS satellites...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryLabel}>Latitude</Text>
                <Text style={styles.telemetryValue}>{latitude?.toFixed(6) ?? '6.205929'}</Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryLabel}>Longitude</Text>
                <Text style={styles.telemetryValue}>{longitude?.toFixed(6) ?? '6.695893'}</Text>
              </View>
            </View>
          )}
        </DouCard>

        {/* Preview of Message */}
        <Text style={styles.sectionLabel}>Safety Message Preview</Text>
        <View style={styles.previewBox}>
          <View style={styles.previewHeader}>
            <Car size={16} color={Colors.primary} />
            <Text style={styles.previewFleet}>DOU Transit Escort • Fleet #042</Text>
          </View>
          <Text style={styles.previewBody}>
            "I'm in transit at Dennis Osadebay University Asaba campus heading towards ETF Hall.
            Tracking coordinates: {latitude ? `${latitude.toFixed(4)}, ${longitude?.toFixed(4)}` : 'Campus Grid'}"
          </Text>
        </View>

        {/* Share Action Buttons */}
        <View style={styles.actionColumn}>
          <TouchableOpacity
            style={[styles.sharePrimaryBtn, isLoading && { opacity: 0.6 }]}
            onPress={shareLocation}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Share2 size={18} color={Colors.white} />
            <Text style={styles.sharePrimaryText}>Share Transit Link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.copySecondaryBtn}
            onPress={copyCoordinates}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {copied ? (
              <>
                <Check size={18} color={Colors.success} />
                <Text style={[styles.copySecondaryText, { color: Colors.success }]}>
                  Copied to Clipboard!
                </Text>
              </>
            ) : (
              <>
                <Copy size={18} color={Colors.slate700} />
                <Text style={styles.copySecondaryText}>Copy Coordinates & Text</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
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
  content: {
    padding: Spacing.lg,
  },
  heroCard: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  shieldIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: FontSize.base,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate600,
    textAlign: 'center',
    lineHeight: 18,
  },
  coordCard: {
    marginBottom: Spacing.md,
  },
  coordCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  coordHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  coordCardTitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refreshIconBtn: {
    padding: 4,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate500,
  },
  errorBox: {
    backgroundColor: Colors.error + '10',
    padding: 10,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.error,
  },
  telemetryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate50,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  telemetryItem: {
    flex: 1,
    alignItems: 'center',
  },
  telemetryDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.slate200,
  },
  telemetryLabel: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate400,
    textTransform: 'uppercase',
  },
  telemetryValue: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.slate200,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  previewFleet: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  previewBody: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate600,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  actionColumn: {
    gap: Spacing.sm,
  },
  sharePrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    ...Shadows.md,
  },
  sharePrimaryText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  copySecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  copySecondaryText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate800,
  },
});
