import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DashboardScreen } from '@/app/dashboard/DashboardScreen';
import { DocumentsScreen } from '@/app/documents/DocumentsScreen';
import { UdhaarScreen } from '@/app/udhaar/UdhaarScreen';
import { VaultScreen } from '@/app/vault/VaultScreen';
import { SettingsScreen } from '@/app/settings/SettingsScreen';
import { OnboardingSecurityScreen } from '@/app/onboarding/OnboardingSecurityScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Documents: undefined;
  Udhaar: undefined;
  Vault: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingSecurityScreen} />
      <Stack.Screen name="Home" component={DashboardScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="Udhaar" component={UdhaarScreen} />
      <Stack.Screen name="Vault" component={VaultScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
