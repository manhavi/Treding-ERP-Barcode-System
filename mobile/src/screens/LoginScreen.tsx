import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, spacing, borderRadius, typography, shadows } from '../theme/colors';

export default function LoginScreen() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleCodeChange = (text: string) => {
    const numericText = text.replace(/\D/g, '').slice(0, 6);
    setCode(numericText);
  };

  const handleSubmit = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await login(code);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        (err.code === 'ERR_NETWORK' || err.message?.includes('Network')
          ? 'Cannot reach server. Check API_URL in project .env and that backend is running.'
          : err.message || 'Login failed.');
      Alert.alert('Login Failed', msg);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Icon name="store" size={32} color={colors.primary} />
              </View>
            </View>
          </View>
          <Text style={styles.title}>Aaradhya Fashion</Text>
          <Text style={styles.subtitle}>Lehenga Choli Business Management</Text>
        </View>

        <View style={styles.loginCard}>
          <View style={styles.cardAccent} />
          <View style={styles.cardHeader}>
            <Icon name="lock" size={24} color={colors.primary} />
            <Text style={styles.cardTitle}>Secure Login</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Enter 6-Digit Code</Text>
            <View style={styles.inputWrapper}>
              <Icon name="vpn-key" size={20} color={colors.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={handleCodeChange}
                placeholder="000000"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="numeric"
                maxLength={6}
                autoFocus
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, (loading || code.length !== 6) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading || code.length !== 6}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.textWhite} />
            ) : (
              <>
                <Icon name="login" size={20} color={colors.textWhite} />
                <Text style={styles.buttonText}>Login</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.primaryLighter,
    ...shadows.xl,
  },
  logoImage: {
    width: 88,
    height: 88,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
    color: colors.primary,
    marginBottom: spacing.xs,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  subtitle: {
    ...typography.body2,
    textAlign: 'center',
    color: colors.textTertiary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System',
  },
  loginCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.accent,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body2,
    marginBottom: spacing.sm,
    color: colors.textPrimary,
    fontWeight: '600',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  inputWrapper: {
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
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
  button: {
    backgroundColor: colors.buttonPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    ...shadows.primary,
  },
  buttonDisabled: {
    backgroundColor: colors.buttonDisabled,
    ...shadows.sm,
  },
  buttonText: {
    ...typography.button,
    color: colors.textWhite,
    fontSize: 17,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'System',
  },
});
