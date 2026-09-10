import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  GraduationCap,
  Car,
  Shield,
  Store,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Lock,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { DouCard } from '../../components/DouCard';

export default function RoleSelectionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      <View style={styles.content}>
        {/* Top Branding Section */}
        <View style={styles.topSection}>
          <TouchableOpacity
            onLongPress={() => navigation.navigate(Routes.developerLogin)}
            activeOpacity={0.8}
            delayLongPress={3000}
            style={styles.logoTouchable}
          >
            <Image
              source={require('../../../assets/dou-logo.jpeg')}
              style={styles.logo}
              resizeMode="cover"
            />
            <View style={styles.badgeDevHint}>
              <Sparkles size={10} color={Colors.primary} />
            </View>
          </TouchableOpacity>

          <View style={styles.campusPill}>
            <View style={styles.pulseDot} />
            <Text style={styles.campusPillText}>Dennis Osadebay University • Asaba</Text>
          </View>

          <Text style={styles.welcomeTitle}>DOU Smart Transit</Text>
          <Text style={styles.welcomeSubtitle}>
            Official contactless campus mobility, park queues & cashless transit pass
          </Text>
        </View>

        {/* Primary Gateway Cards */}
        <View style={styles.cardsSection}>
          {/* Student Gateway */}
          <DouCard
            variant="elevated"
            padding={Spacing.md}
            style={styles.roleCard}
            onPress={() => navigation.navigate(Routes.studentRegister)}
          >
            <View style={styles.cardInner}>
              <View style={[styles.iconBox, { backgroundColor: Colors.primary + '15' }]}>
                <GraduationCap size={24} color={Colors.primary} />
              </View>
              <View style={styles.roleInfo}>
                <View style={styles.roleTitleRow}>
                  <Text style={styles.roleTitle}>Student Transit Portal</Text>
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>STUDENT</Text>
                  </View>
                </View>
                <Text style={styles.roleSubtitle}>
                  ₦100 fare • Boarding PINs • School Park virtual queue • ₦0 P2P transfers
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.slate400} />
            </View>
          </DouCard>

          {/* Driver Gateway */}
          <DouCard
            variant="elevated"
            padding={Spacing.md}
            style={styles.roleCard}
            onPress={() => navigation.navigate(Routes.driverRegister)}
          >
            <View style={styles.cardInner}>
              <View style={[styles.iconBox, { backgroundColor: Colors.secondary + '15' }]}>
                <Car size={24} color={Colors.secondary} />
              </View>
              <View style={styles.roleInfo}>
                <View style={styles.roleTitleRow}>
                  <Text style={styles.roleTitle}>Keke Driver Operator</Text>
                  <View style={[styles.popularBadge, { backgroundColor: Colors.secondary + '15' }]}>
                    <Text style={[styles.popularText, { color: Colors.secondary }]}>COMMERCIAL</Text>
                  </View>
                </View>
                <Text style={styles.roleSubtitle}>
                  Fleet terminal • QR collection • Instant OPay/Bank payout withdrawals
                </Text>
              </View>
              <ChevronRight size={20} color={Colors.slate400} />
            </View>
          </DouCard>
        </View>

        {/* Staff / Security / Vendor Quick Switch */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.staffBar}
            onPress={() => navigation.navigate(Routes.rolePicker)}
            activeOpacity={0.8}
          >
            <View style={styles.staffLeft}>
              <Shield size={16} color={Colors.slate600} />
              <Text style={styles.staffBarText}>
                Student Affairs, Security Gate, or Vendor?
              </Text>
            </View>
            <Text style={styles.staffActionText}>Access Staff Portals ›</Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 40,
    justifyContent: 'space-between',
  },
  topSection: {
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  logoTouchable: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.slate200,
    ...Shadows.md,
  },
  badgeDevHint: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate200,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  campusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.slate100,
    marginBottom: Spacing.sm,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  campusPillText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.slate700,
  },
  welcomeTitle: {
    fontSize: FontSize.xxl,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.md,
  },
  cardsSection: {
    gap: Spacing.md,
    marginVertical: Spacing.lg,
  },
  roleCard: {
    borderRadius: BorderRadius.lg,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleInfo: {
    flex: 1,
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  roleTitle: {
    fontSize: FontSize.base,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  popularBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  popularText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  roleSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    lineHeight: 16,
  },
  bottomSection: {
    paddingBottom: Spacing.xl,
  },
  staffBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.slate50,
    borderWidth: 1,
    borderColor: Colors.slate200,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
  },
  staffLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  staffBarText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_500Medium',
    color: Colors.slate600,
  },
  staffActionText: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
});
