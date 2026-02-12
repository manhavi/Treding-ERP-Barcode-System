import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/colors';

export default function SettingsScreen() {
  const { logout, user } = useAuth();

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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Premium Header */}
        <View style={styles.header}>
          <View style={styles.headerAccent} />
          <View style={styles.headerIconContainer}>
            <Icon name="settings" size={32} color={colors.primary} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>App Settings</Text>
            <Text style={styles.subtitle}>Configure app preferences</Text>
          </View>
        </View>

        {/* User Info Card */}
        {user && (
          <View style={styles.userCard}>
            <View style={styles.userIconContainer}>
              <Icon name="person" size={24} color={colors.primary} />
            </View>
            <View style={styles.userInfoContainer}>
              <Text style={styles.userLabel}>Logged in as</Text>
              <Text style={styles.userName}>{user.username}</Text>
            </View>
          </View>
        )}

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Icon name="logout" size={22} color={colors.textWhite} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <View style={styles.appLogoContainer}>
            <Image source={require('../assets/logo.png')} style={styles.appLogoImage} resizeMode="contain" />
          </View>
          <Text style={styles.appInfoText}>Aaradhya Fashion</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appCopyright}>
            Lehenga Choli Business Management System
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  headerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.accent,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  subtitle: {
    ...typography.body3,
    color: colors.textTertiary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  section: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  sectionDescription: {
    ...typography.body3,
    color: colors.textTertiary,
    lineHeight: 20,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.body2,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  ipInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  hint: {
    ...typography.caption,
    color: colors.textDisabled,
    marginTop: spacing.sm,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  button: {
    backgroundColor: colors.buttonPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
    ...shadows.primary,
  },
  buttonText: {
    ...typography.button,
    color: colors.textWhite,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  userCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.lg,
  },
  userIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLightest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoContainer: {
    flex: 1,
  },
  userLabel: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  userName: {
    ...typography.h6,
    color: colors.primary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  appLogoContainer: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.borderLight,
    ...shadows.md,
  },
  appLogoImage: {
    width: 64,
    height: 64,
  },
  appInfoText: {
    ...typography.h4,
    color: colors.primary,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  appVersion: {
    ...typography.body2,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  appCopyright: {
    ...typography.caption,
    color: colors.textDisabled,
    textAlign: 'center',
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  logoutSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.lg,
  },
  logoutButton: {
    backgroundColor: colors.buttonDanger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    width: '100%',
    gap: spacing.sm,
    ...shadows.lg,
  },
  logoutButtonText: {
    ...typography.button,
    color: colors.textWhite,
    fontSize: 17,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
});
