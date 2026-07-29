import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';

export default function RolePickerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const roles = [
    { icon: '🛡️', title: 'Student Affairs (Admin)', subtitle: 'Dashboard, student & driver management', route: Routes.staffLogin },
    { icon: '🔒', title: 'Security Gate', subtitle: 'QR scanner, student search, reports', route: Routes.guardLogin },
    { icon: '🏪', title: 'Vendor', subtitle: 'Manage products and fulfill orders', route: Routes.login },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.icon}>⚙️</Text>
        <Text style={styles.title}>Staff & Admin Portal</Text>
        <Text style={styles.subtitle}>Select your role to sign in</Text>

        <View style={styles.cards}>
          {roles.map((role, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.card}
              onPress={() => navigation.navigate(role.route)}
              activeOpacity={0.8}
            >
              <View style={styles.iconBox}>
                <Text style={styles.cardIcon}>{role.icon}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{role.title}</Text>
                <Text style={styles.cardSubtitle}>{role.subtitle}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 24, alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: FontSize.xxxl, fontWeight: 'bold', color: Colors.black, textAlign: 'center' },
  subtitle: { fontSize: FontSize.lg, color: Colors.grey, marginTop: 8, textAlign: 'center' },
  cards: { width: '100%', marginTop: 32 },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 20, marginBottom: 12,
    borderWidth: 2, borderColor: Colors.black, borderRadius: BorderRadius.md,
    backgroundColor: Colors.white, ...Shadows.lg,
  },
  iconBox: { width: 48, height: 48, borderRadius: BorderRadius.md, backgroundColor: Colors.black, justifyContent: 'center', alignItems: 'center' },
  cardIcon: { fontSize: 22 },
  cardInfo: { flex: 1, marginLeft: 16 },
  cardTitle: { fontSize: FontSize.lg, fontWeight: 'bold', color: Colors.black },
  cardSubtitle: { fontSize: FontSize.sm, color: Colors.grey, marginTop: 2 },
  chevron: { fontSize: 28, color: Colors.black, fontWeight: 'bold' },
  backLink: { fontSize: FontSize.md, color: Colors.grey, marginTop: 24, textDecorationLine: 'underline' },
});
