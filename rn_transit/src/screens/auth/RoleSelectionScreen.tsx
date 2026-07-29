import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../config/theme';
import { Routes } from '../../config/routes';

export default function RoleSelectionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.topSection}>
          <TouchableOpacity
            onLongPress={() => navigation.navigate(Routes.developerLogin)}
            activeOpacity={0.8}
            delayLongPress={3000}
          >
            <Image
              source={require('../../../assets/dou-logo.jpeg')}
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.welcomeTitle}>Welcome to DOU Transit</Text>
          <Text style={styles.welcomeSubtitle}>Campus transport made easy</Text>
        </View>

        <View style={styles.cardsSection}>
          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => navigation.navigate(Routes.studentRegister)}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Text style={styles.iconText}>🎓</Text>
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleTitle}>I am a Student</Text>
              <Text style={styles.roleSubtitle}>Request rides, join queues, and pay</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roleCard}
            onPress={() => navigation.navigate(Routes.driverRegister)}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Text style={styles.iconText}>🚗</Text>
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleTitle}>I am a Driver</Text>
              <Text style={styles.roleSubtitle}>Accept rides, earn and manage trips</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity onPress={() => navigation.navigate(Routes.rolePicker)}>
            <Text style={styles.staffLink}>
              Admin? Security? Vendor? Tap here
            </Text>
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
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  topSection: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.black,
  },
  welcomeTitle: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    color: Colors.black,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: FontSize.md,
    color: Colors.grey,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  cardsSection: {
    flex: 1,
    justifyContent: 'center',
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.black,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  roleInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  roleTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    color: Colors.black,
  },
  roleSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.grey,
    marginTop: 1,
  },
  chevron: {
    fontSize: 22,
    color: Colors.black,
    fontWeight: 'bold',
  },
  bottomSection: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  staffLink: {
    fontSize: FontSize.md,
    color: Colors.grey,
  },
});
