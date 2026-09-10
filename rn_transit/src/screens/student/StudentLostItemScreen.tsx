import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ChevronLeft,
  Package,
  Car,
  CheckCircle2,
  AlertCircle,
  Building2,
  Smartphone,
  Wallet,
  IdCard,
  BookOpen,
  ShoppingBag,
  Shirt,
  Key,
  HelpCircle,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { useAuthStore } from '../../stores/authStore';
import { useLostItemStore } from '../../stores/lostItemStore';
import { useRideStore } from '../../stores/rideStore';
import { DouCard } from '../../components/DouCard';

const CATEGORIES = [
  { label: 'Phone', icon: Smartphone },
  { label: 'Wallet', icon: Wallet },
  { label: 'Student ID', icon: IdCard },
  { label: 'Notebook', icon: BookOpen },
  { label: 'Backpack', icon: ShoppingBag },
  { label: 'Clothing', icon: Shirt },
  { label: 'Keys', icon: Key },
  { label: 'Other Item', icon: HelpCircle },
];

export default function StudentLostItemScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { reportLostItem, isLoading } = useLostItemStore();
  const { currentTripId, driverName, driverFleetNumber } = useRideStore();

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Phone');
  const [fleetInput, setFleetInput] = useState(String(driverFleetNumber || '042'));
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    const ok = await reportLostItem(
      {
        tripId: currentTripId || `trip-${fleetInput || '042'}`,
        description: description.trim(),
        category,
      },
      user?.userId ?? '',
      user?.token
    );
    if (ok) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContent}>
          <View style={styles.successIconCircle}>
            <CheckCircle2 size={54} color={Colors.success} strokeWidth={2.5} />
          </View>
          <Text style={styles.successTitle}>Report Logged with Student Affairs!</Text>
          <Text style={styles.successSub}>
            Keke Driver #{fleetInput || '042'} has been officially flagged with "Pending Item Return" on their app. They must drop the item at the Student Affairs office to unlock their account.
          </Text>

          <DouCard variant="flat" style={styles.infoCard}>
            <Building2 size={20} color={Colors.primaryAccent} strokeWidth={2.5} style={{ marginRight: 10 }} />
            <Text style={styles.infoCardText}>
              Collection Point: Student Affairs Block, Room 104. Bring your Student ID card.
            </Text>
          </DouCard>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate(Routes.studentLostItems)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>TRACK STATUS IN LOST & FOUND</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ fontSize: FontSize.sm, color: Colors.slate500, fontWeight: '700' }}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <ChevronLeft size={22} color={Colors.slate900} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Report Forgotten Item</Text>
          <Text style={styles.headerSub}>Lost Property Tracking</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.warningBanner}>
          <AlertCircle size={20} color={Colors.warningDark} strokeWidth={2.5} style={{ marginRight: 10 }} />
          <Text style={styles.warningBannerText}>
            This flags the driver’s profile and requires them to submit the item to the Student Affairs office.
          </Text>
        </View>

        {/* Keke Vehicle Association */}
        <DouCard variant="elevated" style={styles.formCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm }}>
            <Car size={18} color={Colors.primaryAccent} strokeWidth={2.5} style={{ marginRight: 8 }} />
            <Text style={styles.sectionHeader}>ASSOCIATED KEKE VEHICLE</Text>
          </View>
          <TextInput
            style={styles.input}
            value={fleetInput}
            onChangeText={setFleetInput}
            placeholder="Fleet number (e.g. 042)"
            placeholderTextColor={Colors.slate400}
            keyboardType="numeric"
          />
          <Text style={styles.inputHint}>
            Found on the giant stickers pasted on the Keke or in your ride history.
          </Text>
        </DouCard>

        {/* Item Category Selection */}
        <DouCard variant="elevated" style={styles.formCard}>
          <Text style={styles.sectionHeader}>WHAT DID YOU FORGET?</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.label;
              const IconComp = cat.icon;
              return (
                <TouchableOpacity
                  key={cat.label}
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  onPress={() => setCategory(cat.label)}
                  activeOpacity={0.8}
                >
                  <IconComp
                    size={16}
                    color={isSelected ? Colors.white : Colors.slate700}
                    strokeWidth={2.2}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </DouCard>

        {/* Item Description */}
        <DouCard variant="elevated" style={styles.formCard}>
          <Text style={styles.sectionHeader}>DETAILED DESCRIPTION</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Color, brand, distinguishing features, seat position (front or back)..."
            placeholderTextColor={Colors.slate400}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </DouCard>

        <TouchableOpacity
          style={[styles.primaryBtn, (!description.trim() || isLoading) && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={!description.trim() || isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>SUBMIT REPORT TO STUDENT AFFAIRS</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'android' ? 14 : Spacing.sm,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate100,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.slate900,
  },
  headerSub: {
    fontSize: FontSize.xxs,
    color: Colors.slate500,
    marginTop: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningSoft,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
    marginBottom: Spacing.md,
  },
  warningBannerText: {
    fontSize: FontSize.xs,
    color: Colors.warningDark,
    lineHeight: 18,
    flex: 1,
    fontWeight: '600',
  },
  formCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    fontSize: FontSize.xxs,
    fontWeight: '800',
    color: Colors.slate500,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.slate50,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSize.sm,
    color: Colors.slate900,
    fontWeight: '700',
  },
  inputHint: {
    fontSize: FontSize.xxs,
    color: Colors.slate500,
    marginTop: 6,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.slate50,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
  },
  categoryChipActive: {
    backgroundColor: Colors.slate900,
    borderColor: Colors.slate900,
  },
  categoryChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.slate700,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  textArea: {
    backgroundColor: Colors.slate50,
    borderWidth: 1.5,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.slate900,
    minHeight: 100,
  },
  primaryBtn: {
    backgroundColor: Colors.slate900,
    paddingVertical: 18,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadows.md,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: FontSize.sm,
    letterSpacing: 0.5,
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '900',
    color: Colors.slate900,
    textAlign: 'center',
  },
  successSub: {
    fontSize: FontSize.sm,
    color: Colors.slate600,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  infoCardText: {
    fontSize: FontSize.xs,
    color: Colors.slate700,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
});
