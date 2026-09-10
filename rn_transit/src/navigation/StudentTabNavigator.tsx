import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Navigation, Wallet, Clock, ShoppingBag, User } from 'lucide-react-native';

import StudentHomeScreen from '../screens/student/StudentHomeScreen';
import StudentWalletScreen from '../screens/student/StudentWalletScreen';
import StudentQueueScreen from '../screens/student/StudentQueueScreen';
import StudentMarketplaceScreen from '../screens/student/StudentMarketplaceScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

import { Colors, FontSize } from '../config/theme';
import { Routes } from '../config/routes';

const Tab = createBottomTabNavigator();

export default function StudentTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName={Routes.studentHome}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.slate400,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tab.Screen
        name={Routes.studentHome}
        component={StudentHomeScreen}
        options={{
          tabBarLabel: 'Ride',
          tabBarIcon: ({ color, size }) => <Navigation size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name={Routes.studentWallet}
        component={StudentWalletScreen}
        options={{
          tabBarLabel: 'Wallet',
          tabBarIcon: ({ color, size }) => <Wallet size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name={Routes.studentQueue}
        component={StudentQueueScreen}
        options={{
          tabBarLabel: 'Queue',
          tabBarIcon: ({ color, size }) => <Clock size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name={Routes.studentMarketplace}
        component={StudentMarketplaceScreen}
        options={{
          tabBarLabel: 'Market',
          tabBarIcon: ({ color, size }) => <ShoppingBag size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name={Routes.settings}
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.slate100,
    height: Platform.OS === 'ios' ? 86 : 64,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
});
