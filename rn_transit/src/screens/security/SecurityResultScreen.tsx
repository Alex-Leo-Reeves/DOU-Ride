import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';

interface ScanResultData {
  type: 'student' | 'driver';
  userId: string;
  fullName: string;
  matricNumber?: string;
  department?: string;
  fleetNumber?: number;
  validUntil: string;
}

type ResultRouteParams = {
  SecurityResult: {
    scanData: string;
    timestamp: string;
  };
};

const SecurityResultScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<ResultRouteParams, 'SecurityResult'>>();
  const { scanData, timestamp } = route.params || {};

  // Parse scan data
  let parsedData: ScanResultData | null = null;
  let isValid = true;
  let errorMessage = '';

  try {
    parsedData = JSON.parse(scanData);
    // Validate required fields
    if (!parsedData?.type || !parsedData?.userId || !parsedData?.fullName) {
      isValid = false;
      errorMessage = 'Invalid QR code format';
    }
    // Check expiry
    if (parsedData?.validUntil && new Date(parsedData.validUntil) < new Date()) {
      isValid = false;
      errorMessage = 'Pass has expired';
    }
  } catch {
    isValid = false;
    errorMessage = 'Could not read QR code data';
  }

  const handleScanAgain = () => {
    navigation.goBack();
  };

  const handleSearchStudent = () => {
    navigation.navigate('SearchStudent');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Scan Result</Text>
        <Text style={styles.timestamp}>
          {timestamp ? new Date(timestamp).toLocaleTimeString() : ''}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, isValid ? styles.statusValid : styles.statusInvalid]}>
          <Text style={styles.statusIcon}>{isValid ? '✓' : '✗'}</Text>
          <Text style={[styles.statusText, isValid ? styles.statusTextValid : styles.statusTextInvalid]}>
            {isValid ? 'PASS VALID' : 'PASS INVALID'}
          </Text>
        </View>

        {/* Error Message */}
        {!isValid && errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Reason</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* User Details Card */}
        {parsedData ? (
          <View style={[styles.detailsCard, !isValid && styles.detailsCardInvalid]}>
            <Text style={styles.cardTitle}>
              {parsedData.type === 'driver' ? 'Driver Details' : 'Student Details'}
            </Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{parsedData.fullName}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>ID</Text>
              <Text style={styles.detailValue}>{parsedData.userId}</Text>
            </View>

            {parsedData.matricNumber && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Matric No.</Text>
                  <Text style={styles.detailValue}>{parsedData.matricNumber}</Text>
                </View>
              </>
            )}

            {parsedData.department && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Department</Text>
                  <Text style={styles.detailValue}>{parsedData.department}</Text>
                </View>
              </>
            )}

            {parsedData.fleetNumber && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fleet No.</Text>
                  <Text style={styles.detailValue}>{parsedData.fleetNumber}</Text>
                </View>
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Valid Until</Text>
              <Text style={[styles.detailValue, !isValid && styles.expiredText]}>
                {parsedData.validUntil
                  ? new Date(parsedData.validUntil).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.errorCard}>
            <Text style={styles.errorMessage}>No scan data available</Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleScanAgain}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Scan Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleSearchStudent}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Search Student</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: 'bold',
    color: Colors.black,
  },
  timestamp: {
    fontSize: FontSize.sm,
    color: Colors.grey,
  },
  content: {
    padding: Spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    marginBottom: Spacing.lg,
  },
  statusValid: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  statusInvalid: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  statusIcon: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    color: Colors.white,
    marginRight: Spacing.sm,
  },
  statusText: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
  },
  statusTextValid: {
    color: Colors.white,
  },
  statusTextInvalid: {
    color: Colors.white,
  },
  errorCard: {
    borderWidth: 2,
    borderColor: Colors.error,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.ultraLightGrey,
  },
  errorTitle: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    color: Colors.error,
    marginBottom: Spacing.xs,
  },
  errorMessage: {
    fontSize: FontSize.md,
    color: Colors.black,
  },
  detailsCard: {
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    ...Shadows.lg,
  },
  detailsCardInvalid: {
    borderColor: Colors.error,
    opacity: 0.7,
  },
  cardTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    fontSize: FontSize.md,
    color: Colors.grey,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: FontSize.md,
    color: Colors.black,
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.lightGrey,
  },
  expiredText: {
    color: Colors.error,
  },
  actions: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 2,
    borderTopColor: Colors.black,
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
});

export default SecurityResultScreen;