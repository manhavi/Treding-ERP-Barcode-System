import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TouchableOpacity, Platform, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import PurchaseScreen from '../screens/PurchaseScreen';
import InventoryScreen from '../screens/InventoryScreen';
import DispatchScreen from '../screens/DispatchScreen';
import BillingScreen from '../screens/BillingScreen';
import PartyListScreen from '../screens/PartyListScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { hasPermission, isAdmin, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            logout();
          },
        },
      ]
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Purchase':
              iconName = 'shopping-cart';
              break;
            case 'Inventory':
              iconName = 'inventory';
              break;
            case 'Dispatch':
              iconName = 'local-shipping';
              break;
            case 'Billing':
              iconName = 'receipt';
              break;
            case 'Parties':
              iconName = 'business';
              break;
            case 'Settings':
              iconName = 'settings';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarLabelStyle: {
          fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
          fontSize: 11,
          fontWeight: '600',
          marginTop: -4,
        },
        tabBarActiveTintColor: '#1565c0',
        tabBarInactiveTintColor: '#8d8d8d',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 2,
          borderTopColor: '#e3f2fd',
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
          shadowColor: '#1565c0',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 12,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: '#1565c0',
          elevation: 6,
          shadowColor: '#0d47a1',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          borderBottomWidth: 0,
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
          letterSpacing: 0.3,
          fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={handleLogout}
            style={{ marginRight: 15 }}
            activeOpacity={0.7}
          >
            <Icon name="logout" size={24} color="#ffffff" />
          </TouchableOpacity>
        ),
      })}
    >
      {hasPermission('purchase') && (
        <Tab.Screen name="Purchase" component={PurchaseScreen} />
      )}
      {hasPermission('inventory') && (
        <Tab.Screen name="Inventory" component={InventoryScreen} />
      )}
      {hasPermission('dispatch') && (
        <Tab.Screen name="Dispatch" component={DispatchScreen} />
      )}
      {hasPermission('billing') && (
        <Tab.Screen name="Billing" component={BillingScreen} />
      )}
      {hasPermission('parties') && (
        <Tab.Screen name="Parties" component={PartyListScreen} />
      )}
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}
