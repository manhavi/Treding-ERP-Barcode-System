import React from 'react';
import { Text, TextProps, Platform, StyleSheet } from 'react-native';

/**
 * Text component that always uses English font
 * Prevents Chinese/Japanese character display
 */
export const EnglishText: React.FC<TextProps> = ({ style, ...props }) => {
  const englishFontStyle = Platform.OS === 'android' 
    ? { fontFamily: 'sans-serif' } 
    : { fontFamily: 'System' };
  
  return (
    <Text 
      {...props} 
      style={[englishFontStyle, style]} 
    />
  );
};

export default EnglishText;
