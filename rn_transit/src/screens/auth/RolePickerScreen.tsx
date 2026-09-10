import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  Store,
  Terminal,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';
import { DouCard } from '../../components/DouCard';

export default function RolePickerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const roles = [
    {
      icon: Building2,
      color: Colors.primary,
      badge: 'ADMIN',
      title: 'Student Affairs Command',
      subtitle: 'Disciplinary hearing logs, fleet suspensions, and bank approval desk',
      route: Routes.staffLogin,
    },
    {
      icon: ShieldCheck,
      color: Colors.secondary,
      badge: 'SECURITY',
      title: 'Security Gate 1 & 2',
      subtitle: 'Optical QR pass scanner, biometric face matching, and blacklist check',
      route: Routes.guardLogin,
    },
    {
      icon: Store,
      color: Colors.warning,
      badge: 'MERCHANT',
      title: 'Campus Food & Provisions',
      subtitle: 'Mummy B Kitchen, Chidi provisions, meal prep & courier pickup PINs',
      route: Routes.staffLogin,
    },
    {
      icon: Terminal,
      color: Colors.slate800,
      badge: 'ENGINEERING',
      title: 'GIS Developer Console',
      subtitle: 'Map new university landmarks, pickup spots, and inspect GPS telemetry',
      route: Routes.developerLogin,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={Colors.slate800} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Staff & Operations Portal</Text>
          <Text style={styles.headerSubtitle}>Dennis Osadebay University Campus Infrastructure</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeading}>Select Operational Role</Text>
        <Text style={styles.sectionSubheading}>
          Access restricted back-office tools and enforcement terminals
        </Text>

        <View style={styles.cardList}>
          {roles.map((role, idx) => {
            const Icon = role.icon;
            return (
              <DouCard
                key={idx}
                variant="elevated"
                padding={Spacing.md}
                style={styles.card}
                onPress={() => navigation.navigate(role.route)}
              >
                <View style={styles.cardInner}>
                  <View style={[styles.iconBox, { backgroundColor: role.color + '15' }]}>
                    <Icon size={24} color={role.color} />
                  </View>

                  <View style={styles.cardInfo}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle}>{role.title}</Text>
                      <View style={[styles.badge, { backgroundColor: role.color + '15' }]}>
                        <Text style={[styles.badgeText, { color: role.color }]}>{role.badge}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardSubtitle}>{role.subtitle}</Text>
                  </View>

                  <ChevronRight size={18} color={Colors.slate400} />
                </View>
              </DouCard>
            );
          })}
        </View>
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
  sectionHeading: {
    fontSize: FontSize.base,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
  },
  sectionSubheading: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  cardList: {
    gap: Spacing.sm,
  },
  card: {
    marginBottom: Spacing.xs,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: FontSize.sm,
    fontFamily: 'Inter_700Bold',
    color: Colors.slate900,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: 'Inter_700Bold',
  },
  cardSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: 'Inter_400Regular',
    color: Colors.slate500,
    lineHeight: 16,
  },
});
