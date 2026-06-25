/**
 * Ambient types for react-native-vector-icons v10 (ships Flow types, not .d.ts).
 * We declare only the icon families we use. Avoids pulling the deprecated
 * @types/react-native-vector-icons (which drags an old @types/react-native).
 */
declare module 'react-native-vector-icons/MaterialIcons' {
  import type { Component } from 'react';
  import type { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number | undefined;
    color?: string | undefined;
  }

  export default class MaterialIcons extends Component<IconProps> {}
}
