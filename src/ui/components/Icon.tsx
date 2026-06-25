/**
 * Icon — thin wrapper over MaterialIcons so screens never import the icon
 * library directly. Maps the app's Material-Symbols-style names to MaterialIcons.
 */
import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export function Icon({ name, size = 24, color, style }: IconProps): React.JSX.Element {
  return <MaterialIcon name={name} size={size} color={color} style={style} />;
}
