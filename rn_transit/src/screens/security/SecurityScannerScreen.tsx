import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';

/**
 * SecurityScannerScreen - QR code scanner for checking student/driver passes.
 * Simulated scanner UI since bare QR library isn't in the stack.
 * Uses manual entry fallback with a mock scan trigger.
 */
const SecurityScannerScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = useCallback(
    (data: string) => {
      if (scanned) return;
      setScanned(true);
      setScanning(false);

      // Navigate to result screen with scanned data
      navigation.navigate(Routes.securityResult, {
        scanData: data,
        timestamp: new Date().toISOString(),
      });
    },
    [scanned, navigation],
  );

  // Simulate a successful scan via the mock button
  const handleStartScanning = () => {
    setScanning(true);
    setScanned(false);
  };

  const handleMockScan = () => {
    // Simulate scanning a valid pass
    const mockData = JSON.stringify({
      type: 'student',
      userId: 'STU-2024-0123',
      fullName: 'John Doe',
      matricNumber: '2024/12345',
      department: 'Computer Science',
      validUntil: '2025-06-30',
    });
    handleBarCodeScanned(mockData);
  };

  const handleManualEntry = () => {
    // Navigate to search student screen
    navigation.navigate('SearchStudent');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pass Scanner</Text>
        <Text style={styles.subtitle}>Scan student or driver pass</Text>
      </View>

      {/* Scanner Viewport */}
      <View style={styles.scannerContainer}>
        <View style={[styles.scannerFrame, scanning && styles.scannerFrameActive]}>
          {scanning ? (
            <View style={styles.scanningView}>
              <View style={styles.scanLine} />
              <Text style={styles.scanningText}>Scanning...</Text>
            </View>
          ) : (
            <View style={styles.scannerPlaceholder}>
              <Text style={styles.scannerIcon}>📷</Text>
              <Text style={styles.scannerPlaceholderText}>
                Point camera at QR code
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!scanning ? (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleStartScanning}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Start Scanning</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={() => setScanning(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.dangerButtonText}>Cancel Scan</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleMockScan}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Mock Scan (Test)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleManualEntry}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Manual Entry</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Scans Summary */}
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Scans</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No scans yet today</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: Colors.black,
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.black,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.grey,
    marginTop: Spacing.xs,
  },
  scannerContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  scannerFrame: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: Colors.black,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.ultraLightGrey,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.lg,
  },
  scannerFrameActive: {
    borderColor: Colors.success,
    backgroundColor: Colors.black8,
  },
  scanningView: {
    alignItems: 'center',
  },
  scanLine: {
    width: 200,
    height: 3,
    backgroundColor: Colors.neon,
    marginBottom: Spacing.md,
  },
  scanningText: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.success,
  },
  scannerPlaceholder: {
    alignItems: 'center',
  },
  scannerIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  scannerPlaceholderText: {
    fontSize: FontSize.md,
    color: Colors.grey,
    textAlign: 'center',
  },
  actions: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  button: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.black,
  },
  primaryButton: {
    backgroundColor: Colors.black,
  },
  primaryButtonText: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  secondaryButton: {
    backgroundColor: Colors.white,
  },
  secondaryButtonText: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.black,
  },
  dangerButton: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  dangerButtonText: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  recentSection: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: Spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.lightGrey,
    borderRadius: BorderRadius.md,
    borderStyle: 'dashed',
    marginBottom: Spacing.lg,
  },
  emptyStateText: {
    fontSize: FontSize.md,
    color: Colors.grey,
  },
});

export default SecurityScannerScreen;