import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Car, ShieldCheck, CheckCircle2 } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';

interface PayKekeFeeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { fleetNumber: string; amount: number; note: string }) => Promise<boolean>;
}

export function PayKekeFeeSheet({ visible, onClose, onSubmit }: PayKekeFeeSheetProps) {
  const [fleetNumber, setFleetNumber] = useState('');
  const [fareType, setFareType] = useState<'standard' | 'express'>('standard');
  const [isProcessing, setIsProcessing] = useState(false);

  const amount = fareType === 'standard' ? 100 : 150;

  const handleSubmit = async () => {
    if (!fleetNumber.trim()) {
      Alert.alert('Missing Fleet Number', 'Please enter or select the Keke Fleet Number (e.g. 042).');
      return;
    }

    setIsProcessing(true);
    try {
      const note = `Keke Fare Paid to Fleet #${fleetNumber.trim()} (${fareType === 'standard' ? 'Standard ₦100' : 'Express ₦150'})`;
      const success = await onSubmit({
        fleetNumber: fleetNumber.trim(),
        amount,
        note,
      });
      setIsProcessing(false);
      if (success) {
        Alert.alert(
          'Fare Paid to Keke! 🛺',
          `₦${amount} successfully paid to Keke #${fleetNumber.trim()}.\nShow this receipt to the driver if requested.`,
          [{ text: 'Great', onPress: onClose }]
        );
        setFleetNumber('');
      }
    } catch {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <View style={styles.iconBox}>
              <Car size={22} color={Colors.secondary} />
            </View>
            <View>
              <Text style={styles.sheetTitle}>Pay Keke Fee</Text>
              <Text style={styles.sheetSubtitle}>Direct fare payment to campus Keke driver</Text>
            </View>
          </View>

          {/* Keke Fleet Number */}
          <Text style={styles.fieldLabel}>Keke Fleet Number</Text>
          <TextInput
            style={styles.input}
            value={fleetNumber}
            onChangeText={setFleetNumber}
            placeholder="e.g. 042 (displayed on Keke windscreen)"
            placeholderTextColor={Colors.slate400}
            keyboardType="number-pad"
            maxLength={4}
          />

          {/* Quick Fleet Picks */}
          <View style={styles.quickPicksRow}>
            {['001', '007', '015', '042'].map((fn) => (
              <TouchableOpacity
                key={fn}
                style={[styles.quickPickPill, fleetNumber === fn && styles.quickPickPillActive]}
                onPress={() => setFleetNumber(fn)}
              >
                <Text
                  style={[styles.quickPickText, fleetNumber === fn && styles.quickPickTextActive]}
                >
                  #{fn}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Fare Type */}
          <Text style={styles.fieldLabel}>Select Fare Rate</Text>
          <View style={styles.fareRow}>
            <TouchableOpacity
              style={[styles.fareCard, fareType === 'standard' && styles.fareCardSelected]}
              onPress={() => setFareType('standard')}
            >
              <Text style={[styles.fareTitle, fareType === 'standard' && styles.fareTitleSelected]}>
                Standard Ride
              </Text>
              <Text style={[styles.fareRoute, fareType === 'standard' && styles.fareRouteSelected]}>
                Main Gate ↔ Campus Halls
              </Text>
              <Text style={[styles.farePrice, fareType === 'standard' && styles.farePriceSelected]}>
                ₦100
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fareCard, fareType === 'express' && styles.fareCardSelected]}
              onPress={() => setFareType('express')}
            >
              <Text style={[styles.fareTitle, fareType === 'express' && styles.fareTitleSelected]}>
                Express Route
              </Text>
              <Text style={[styles.fareRoute, fareType === 'express' && styles.fareRouteSelected]}>
                Hostels ↔ Engineering
              </Text>
              <Text style={[styles.farePrice, fareType === 'express' && styles.farePriceSelected]}>
                ₦150
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBadge}>
            <ShieldCheck size={16} color={Colors.success} />
            <Text style={styles.infoText}>
              Official DOU Student Union regulated transit tariff • ₦0 extra charges
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.payButton,
              (!fleetNumber.trim() || isProcessing) && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!fleetNumber.trim() || isProcessing}
            activeOpacity={0.85}
          >
            <Text style={styles.payButtonText}>
              {isProcessing
                ? 'Processing...'
                : `Pay ₦${amount} to Keke #${fleetNumber || '...'}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    ...Shadows.card,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.slate300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.md,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: FontSize.lg,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  sheetSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
    marginBottom: 6,
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
    fontSize: FontSize.sm,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate900,
    marginBottom: 6,
  },
  quickPicksRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  quickPickPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
    borderWidth: 1,
    borderColor: Colors.slate200,
  },
  quickPickPillActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  quickPickText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
  },
  quickPickTextActive: {
    color: Colors.white,
  },
  fareRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.md,
  },
  fareCard: {
    flex: 1,
    backgroundColor: Colors.slate50,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
  },
  fareCardSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: Colors.secondary,
  },
  fareTitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate800,
  },
  fareTitleSelected: {
    color: Colors.secondary,
  },
  fareRoute: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    marginTop: 2,
  },
  fareRouteSelected: {
    color: Colors.slate600,
  },
  farePrice: {
    fontSize: FontSize.md,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
    marginTop: 6,
  },
  farePriceSelected: {
    color: Colors.secondary,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: BorderRadius.sm,
    gap: 8,
    marginBottom: Spacing.md,
  },
  infoText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.successDark,
    flex: 1,
  },
  payButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  payButtonText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.slate500,
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
  },
});
