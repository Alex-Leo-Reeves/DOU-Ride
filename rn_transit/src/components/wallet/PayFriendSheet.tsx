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
import { Users, ShieldCheck, Heart } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';

interface PayFriendSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { friendId: string; amount: number; note: string }) => Promise<boolean>;
}

export function PayFriendSheet({ visible, onClose, onSubmit }: PayFriendSheetProps) {
  const [friendId, setFriendId] = useState('');
  const [selectedRides, setSelectedRides] = useState<number>(1);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const RIDE_FARE = 100;
  const effectiveAmount = selectedRides > 0 ? selectedRides * RIDE_FARE : parseFloat(customAmount) || 0;

  const handleSubmit = async () => {
    if (!friendId.trim()) {
      Alert.alert('Missing Friend ID', 'Please enter your friend’s Matric Number or Phone Number.');
      return;
    }
    if (effectiveAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please select or enter a valid fare amount.');
      return;
    }

    setIsProcessing(true);
    try {
      const note = `Keke ride fare paid for friend (${selectedRides > 0 ? `${selectedRides} ride(s)` : 'campus transit'})`;
      const success = await onSubmit({
        friendId: friendId.trim(),
        amount: effectiveAmount,
        note,
      });
      setIsProcessing(false);
      if (success) {
        Alert.alert(
          'Fare Paid! 🎉',
          `Successfully paid ₦${effectiveAmount.toLocaleString()} Keke transit fare for ${friendId.trim()}.`,
          [{ text: 'Done', onPress: onClose }]
        );
        setFriendId('');
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
              <Heart size={20} color="#8B5CF6" />
            </View>
            <View>
              <Text style={styles.sheetTitle}>Pay for a Friend</Text>
              <Text style={styles.sheetSubtitle}>Cover campus Keke fare for a friend or coursemate</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>Friend's Matric No or Phone Number</Text>
          <TextInput
            style={styles.input}
            value={friendId}
            onChangeText={setFriendId}
            placeholder="e.g. 2024/12345 or 08012345678"
            placeholderTextColor={Colors.slate400}
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Select Number of Rides</Text>
          <View style={styles.pillRow}>
            {[
              { rides: 1, label: '1 Ride', amount: 100 },
              { rides: 2, label: 'Round Trip (2)', amount: 200 },
              { rides: 4, label: 'Day Pass (4)', amount: 400 },
            ].map((option) => {
              const isSelected = selectedRides === option.rides;
              return (
                <TouchableOpacity
                  key={option.rides}
                  style={[styles.ridePill, isSelected && styles.ridePillSelected]}
                  onPress={() => {
                    setSelectedRides(option.rides);
                    setCustomAmount('');
                  }}
                >
                  <Text style={[styles.ridePillLabel, isSelected && styles.ridePillLabelSelected]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.ridePillPrice, isSelected && styles.ridePillPriceSelected]}>
                    ₦{option.amount}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.infoBadge}>
            <ShieldCheck size={16} color={Colors.success} />
            <Text style={styles.infoText}>
              ₦0 Transfer Fee • Direct to friend's DOU Transit pass
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.payButton,
              (!friendId.trim() || effectiveAmount <= 0 || isProcessing) && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!friendId.trim() || effectiveAmount <= 0 || isProcessing}
            activeOpacity={0.85}
          >
            <Text style={styles.payButtonText}>
              {isProcessing ? 'Processing Fare...' : `Pay ₦${effectiveAmount.toLocaleString()} for Friend`}
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
    backgroundColor: '#F3E8FF',
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
    marginBottom: Spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.md,
  },
  ridePill: {
    flex: 1,
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  ridePillSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  ridePillLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
  },
  ridePillLabelSelected: {
    color: Colors.white,
  },
  ridePillPrice: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
    marginTop: 2,
  },
  ridePillPriceSelected: {
    color: Colors.white,
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
    backgroundColor: '#8B5CF6',
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
