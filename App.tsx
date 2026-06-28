/**
 * Privo — app root.
 * Wires up gesture handling, safe areas, navigation and theming.
 */
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@lib/queryClient';
import { VaultLockProvider } from '@/app/lock/VaultLockProvider';
import { RootNavigator } from '@/app/navigation/RootNavigator';

function App(): React.JSX.Element {
  const isDark = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
          <VaultLockProvider>
            <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
              <RootNavigator />
            </NavigationContainer>
          </VaultLockProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default App;
