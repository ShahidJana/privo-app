import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '@/app/home/HomeScreen';
import { OnboardingSecurityScreen } from '@/app/onboarding/OnboardingSecurityScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export function RootNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingSecurityScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}
