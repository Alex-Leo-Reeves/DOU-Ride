import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QrCode, Package, AlertCircle, User } from 'lucide-react-native';

import DriverPayLinkScreen from '../screens/driver/DriverPayLinkScreen';
import DriverDeliveryScreen from '../screens/driver/DriverDeliveryScreen';
import DriverLostItemsScreen from '../screens/driver/DriverLostItemsScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

import { Colors } from '../config/theme';
import { Routes } from '../config/routes';

const Tab = createBottomTabNavigator();

export default function DriverTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName={Routes.driverPayLink}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.secondary,
        tabBarInactiveTintColor: Colors.slate400,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tab.Screen
        name={Routes.driverPayLink}
        component={DriverPayLinkScreen}
        options={{
          tabBarLabel: 'Terminal',
          tabBarIcon: ({ color, size }) => <QrCode size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name={Routes.driverDelivery}
        component={DriverDeliveryScreen}
        options={{
          tabBarLabel: 'Deliveries',
          tabBarIcon: ({ color, size }) => <Package size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name={Routes.driverLostItems}
        component={DriverLostItemsScreen}
        options={{
          tabBarLabel: 'Lost & Found',
          tabBarIcon: ({ color, size }) => <AlertCircle size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name={Routes.settings}
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Profile & Bank',
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
