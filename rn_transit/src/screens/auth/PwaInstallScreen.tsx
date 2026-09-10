import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  X,
  Share2,
  PlusSquare,
  CheckCircle2,
  Download,
  Smartphone,
  Sparkles,
  ArrowRight,
  ChevronRight,
  MoreVertical,
} from 'lucide-react-native';
import { Colors, FontSize, BorderRadius, Shadows, Spacing } from '../../config/theme';
import { DouCard } from '../../components/DouCard';

const IOS_STEPS = [
  {
    icon: Share2,
    title: 'Tap Safari Share Button',
    description: 'At the bottom of your Safari browser, tap the Share icon (square with upward arrow).',
  },
  {
    icon: PlusSquare,
    title: 'Select "Add to Home Screen"',
    description: 'Scroll down the options menu and select "Add to Home Screen".',
  },
  {
    icon: CheckCircle2,
    title: 'Confirm & Launch Native App',
    description: 'Tap "Add" in the top-right corner. DOU Transit will launch in full screen with zero browser bars.',
  },
];

const ANDROID_STEPS = [
  {
    icon: MoreVertical,
    title: 'Open Chrome Options',
    description: 'Tap the three vertical dots menu in the top right corner of Google Chrome.',
  },
  {
    icon: Download,
    title: 'Install DOU Ride App',
    description: 'Select "Install app" or "Add to Home Screen" from the Chrome dropdown.',
  },
  {
    icon: CheckCircle2,
    title: 'Instant Native Experience',
    description: 'The app icon appears on your home screen with offline caching and instant launch enabled.',
  },
];

export default function PwaInstallScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [platformTab, setPlatformTab] = useState<'ios' | 'android'>('ios');
  const [currentStep, setCurrentStep] = useState(0);

  const steps = platformTab === 'ios' ? IOS_STEPS : ANDROID_STEPS;
  const StepIcon = steps[currentStep].icon;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../../assets/dou-logo.jpeg')}
            style={styles.logoMini}
            resizeMode="cover"
          />
          <View>
            <Text style={styles.headerTitle}>Install DOU Transit</Text>
            <Text style={styles.headerSubtitle}>Native PWA • No App Store Required</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <X size={20} color={Colors.slate500} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Platform Selector Tabs */}
        <View style={styles.tabSection}>
          <TouchableOpacity
            style={[styles.tabBtn, platformTab === 'ios' && styles.tabBtnActive]}
            onPress={() => {
              setPlatformTab('ios');
              setCurrentStep(0);
            }}
            activeOpacity={0.8}
          >
            <Smartphone size={16} color={platformTab === 'ios' ? Colors.white : Colors.slate600} />
            <Text style={[styles.tabBtnText, platformTab === 'ios' && styles.tabBtnTextActive]}>
              Apple iOS (Safari)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, platformTab === 'android' && styles.tabBtnActive]}
            onPress={() => {
              setPlatformTab('android');
              setCurrentStep(0);
            }}
            activeOpacity={0.8}
          >
            <Download size={16} color={platformTab === 'android' ? Colors.white : Colors.slate600} />
            <Text style={[styles.tabBtnText, platformTab === 'android' && styles.tabBtnTextActive]}>
              Android (Chrome)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step Visualizer Card */}
        <DouCard variant="elevated" padding={Spacing.xl} style={styles.stepCard}>
          <View style={styles.stepIconWrap}>
            <StepIcon size={40} color={Colors.primary} />
          </View>

          <View style={styles.stepCounterBadge}>
            <Text style={styles.stepCounterText}>
              STEP {currentStep + 1} OF {steps.length}
            </Text>
          </View>

          <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
          <Text style={styles.stepDescription}>{steps[currentStep].description}</Text>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentStep && styles.dotActive,
                ]}
              />
            ))}
          </View>
        </DouCard>

        {/* Fast Action Buttons */}
        <View style={styles.bottomButtons}>
          <View style={styles.btnRow}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setCurrentStep((s) => s - 1)}
                activeOpacity={0.8}
              >
                <Text style={styles.backBtnText}>Previous</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => {
                if (currentStep < steps.length - 1) {
                  setCurrentStep((s) => s + 1);
                } else {
                  navigation.goBack();
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.nextBtnText}>
                {currentStep < steps.length - 1 ? 'Next Step' : 'Got it, Open Transit'}
              </Text>
              <ChevronRight size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.offlineNote}>
            ⚡ Instant launch with offline local caching for campus dead zones
          </Text>
        </View>
      </View>
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
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logoMini: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: FontSize.base,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  headerSubtitle: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate500,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  tabSection: {
    flexDirection: 'row',
    backgroundColor: Colors.slate100,
    padding: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  tabBtnText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate600,
  },
  tabBtnTextActive: {
    color: Colors.white,
    fontFamily: 'Inter_700Bold',
  },
  stepCard: {
    alignItems: 'center',
    textAlign: 'center',
    borderRadius: BorderRadius.xl,
    marginVertical: Spacing.md,
  },
  stepIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  stepCounterBadge: {
    backgroundColor: Colors.slate100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  stepCounterText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate600,
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontSize: FontSize.lg,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate600,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.slate200,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  bottomButtons: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    ...Shadows.md,
  },
  nextBtnText: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
  },
  offlineNote: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate400,
    textAlign: 'center',
  },
});
