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
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Building,
  Sparkles,
  Car,
  Smartphone,
  CreditCard,
  BookOpen,
  FolderLock,
  Key,
  HelpCircle,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/authStore';
import { useLostItemStore } from '../../stores/lostItemStore';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { DouCard } from '../../components/DouCard';

const CATEGORIES = [
  { label: 'Phone', icon: Smartphone },
  { label: 'Wallet', icon: CreditCard },
  { label: 'ID Card', icon: FolderLock },
  { label: 'Handout/Book', icon: BookOpen },
  { label: 'Keys', icon: Key },
  { label: 'Other', icon: HelpCircle },
];

export default function AdminTriggerLostItemScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuthStore();
  const { adminTriggerLostItem, isLoading } = useLostItemStore();

  const [matric, setMatric] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Phone');
  const [fleetNumber, setFleetNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!matric.trim()) {
      Alert.alert('Missing Matric Number', 'Please enter the student’s DOU matriculation number.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please provide identifying characteristics of the lost item.');
      return;
    }

    const ok = await adminTriggerLostItem(
      {
        studentMatric: matric.trim().toUpperCase(),
        description: description.trim(),
        category,
      },
      user?.token
    );

    if (ok) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.successContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.successContent}>
          <View style={styles.successBadge}>
            <CheckCircle2 size={48} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Walk-in Claim Registered</Text>
          <Text style={styles.successSub}>
            Custody trace created for student <Text style={{ fontFamily: 'Inter_700Bold' }}>{matric}</Text>.
            Nearby Keke drivers and terminal supervisors have been broadcasted.
          </Text>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => {
              setSubmitted(false);
              setMatric('');
              setDescription('');
              setFleetNumber('');
              navigation.goBack();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.doneBtnText}>Return to Command Center</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surfaceLight} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.slate800} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Walk-in Lost Item Desk</Text>
          <Text style={styles.headerSubtitle}>
            Student Affairs Physical Incident Filing
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notice Card */}
        <DouCard variant="accent" padding={Spacing.md} style={styles.noticeCard}>
          <View style={styles.noticeRow}>
            <Building size={20} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>Phone-less Student Walk-in Protocol</Text>
              <Text style={styles.noticeText}>
                Use this registry when a stranded student without phone access visits Student Affairs
                to report items left in transit.
              </Text>
            </View>
          </View>
        </DouCard>

        {/* Student Matric */}
        <Text style={styles.fieldLabel}>Student Matriculation Number *</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="e.g. DOU/2022/SCI/0419"
            placeholderTextColor={Colors.slate400}
            value={matric}
            onChangeText={setMatric}
            autoCapitalize="characters"
          />
        </View>

        {/* Fleet Number (Optional) */}
        <Text style={styles.fieldLabel}>Suspected Keke Fleet # (Optional)</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="e.g. 042 (Leave blank if unknown)"
            placeholderTextColor={Colors.slate400}
            value={fleetNumber}
            onChangeText={setFleetNumber}
            keyboardType="number-pad"
          />
        </View>

        {/* Category Pills */}
        <Text style={styles.fieldLabel}>Item Category *</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.label;
            return (
              <TouchableOpacity
                key={cat.label}
                style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                onPress={() => setCategory(cat.label)}
                activeOpacity={0.8}
              >
                <Icon size={18} color={isSelected ? Colors.primary : Colors.slate600} />
                <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={styles.fieldLabel}>Item Specifics & Identifying Marks *</Text>
        <View style={[styles.inputWrap, { height: 110, paddingVertical: 10 }]}>
          <TextInput
            style={[styles.input, { height: '100%', textAlignVertical: 'top' }]}
            placeholder="e.g. Black Samsung A14 with cracked screen guard, sticker of DOU Computing Association on back."
            placeholderTextColor={Colors.slate400}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={400}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>Register Claim & Flag Fleet</Text>
          )}
        </TouchableOpacity>
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
  noticeCard: {
    marginBottom: Spacing.lg,
  },
  noticeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  noticeTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
    marginBottom: 2,
  },
  noticeText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate600,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
    marginBottom: 6,
    marginTop: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: Spacing.xs,
    ...Shadows.sm,
  },
  input: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate900,
    padding: 0,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.xs,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.sm,
  },
  categoryCardSelected: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
  },
  categoryLabel: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate600,
  },
  categoryLabelSelected: {
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    ...Shadows.md,
  },
  submitButtonText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  successContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  successBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: FontSize.xl,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  successSub: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate600,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
});
