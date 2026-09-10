import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Car, Users, FileText, Settings } from 'lucide-react-native';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import DriverDirectoryScreen from '../screens/admin/DriverDirectoryScreen';
import StudentDirectoryScreen from '../screens/admin/StudentDirectoryScreen';
import IncidentLogScreen from '../screens/admin/IncidentLogScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

import { Colors } from '../config/theme';
import { Routes } from '../config/routes';

const Tab = createBottomTabNavigator();

export default function AdminTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName={Routes.adminDashboard}
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
        name={Routes.adminDashboard}
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name={Routes.adminDrivers}
        component={DriverDirectoryScreen}
        options={{
          tabBarLabel: 'Fleet',
          tabBarIcon: ({ color, size }) => <Car size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name={Routes.adminStudents}
        component={StudentDirectoryScreen}
        options={{
          tabBarLabel: 'Students',
          tabBarIcon: ({ color, size }) => <Users size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name={Routes.adminReports}
        component={IncidentLogScreen}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, size }) => <FileText size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name={Routes.settings}
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={22} color={color} />,
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
