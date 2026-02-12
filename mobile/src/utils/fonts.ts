import { Platform, TextStyle } from 'react-native';

/**
 * Get system font for English text
 * Prevents Chinese/Japanese character display issues
 */
export const getEnglishFont = (): TextStyle => {
  return {
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  };
};

/**
 * Default text style with English font
 */
export const defaultTextStyle: TextStyle = getEnglishFont();
