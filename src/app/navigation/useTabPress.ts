/**
 * Shared handler that maps a bottom-nav {@link TabKey} to a navigation action,
 * so every primary screen wires its BottomNav the same way.
 */
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { TabKey } from '@ui/components/BottomNav';
import type { RootStackParamList } from './RootNavigator';

export function useTabPress(): (tab: TabKey) => void {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList>>();

  return (tab: TabKey): void => {
    switch (tab) {
      case 'dashboard':
        navigation.navigate('Home');
        break;
      case 'documents':
        navigation.navigate('Documents');
        break;
      case 'udhaar':
        navigation.navigate('Udhaar');
        break;
      case 'vault':
        navigation.navigate('Vault');
        break;
    }
  };
}
