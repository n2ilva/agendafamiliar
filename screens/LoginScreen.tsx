import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Image, TextInput, ActivityIndicator, Platform, ScrollView, Modal, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { APP_COLORS } from '../utils/colors';
import { useTheme } from '../contexts/ThemeContext';

const THEME = {
    primary: APP_COLORS.primary.main,
    danger: APP_COLORS.status.error,
    success: APP_COLORS.status.success,
    warning: APP_COLORS.status.warning,
    textPrimary: APP_COLORS.text.primary,
    textSecondary: APP_COLORS.text.secondary,
};

import LocalAuthService from '../services/LocalAuthService';
import FirebaseAuthService from '../services/FirebaseAuthService';
import ConnectivityService from '../services/ConnectivityService';
import Alert from '../utils/Alert';

// ============= TIPOS =============
interface AuthFormState {
  email: string;
  password: string;
  name: string;
  isLogin: boolean;
}

interface PasswordResetState {
  email: string;
  visible: boolean;
  loading: boolean;
}

// ============= VALIDAÇÕES CONSOLIDADAS =============
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email: string): string | null => {
  if (!email.trim()) {
    return 'Por favor, digite seu email.';
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return 'Por favor, digite um email válido (exemplo: usuario@gmail.com).';
  }
  return null;
};

const validatePassword = (password: string, isSignUp: boolean = false): string | null => {
  if (!password.trim()) {
    return 'Por favor, digite sua senha.';
  }
  if (isSignUp && password.length < 6) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }
  return null;
};

const validateName = (name: string): string | null => {
  if (!name.trim()) {
    return 'Por favor, digite seu nome completo.';
  }
  return null;
};

interface LoginScreenProps {
  // Interface vazia - login agora é gerenciado internamente
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  
  const [form, setForm] = useState<AuthFormState>({
    email: '',
    password: '',
    name: '',
    isLogin: true,
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [reset, setReset] = useState<PasswordResetState>({
    email: '',
    visible: false,
    loading: false,
  });

  // ============= VALIDAÇÃO CONSOLIDADA =============
  const validateAuthForm = useCallback((): string | null => {
    const emailError = validateEmail(form.email);
    if (emailError) {
      Alert.alert('Campo obrigatório', emailError);
      return emailError;
    }

    const passwordError = validatePassword(form.password, !form.isLogin);
    if (passwordError) {
      Alert.alert('Campo obrigatório', passwordError);
      return passwordError;
    }

    if (!form.isLogin) {
      const nameError = validateName(form.name);
      if (nameError) {
        Alert.alert('Campo obrigatório', nameError);
        return nameError;
      }
    }

    return null;
  }, [form]);

  // ============= CONECTIVIDADE =============
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    let isOnline = ConnectivityService.isConnected();
    
    if (!isOnline) {
      try {
        const state = await ConnectivityService.checkConnectivity();
        isOnline = state.isConnected;
      } catch (e) {
        console.warn('⚠️ Falha ao checar conectividade:', e);
        isOnline = false;
      }
    }
    
    return isOnline;
  }, []);

  // ============= AUTENTICAÇÃO =============
  const handleEmailAuth = useCallback(async () => {
    if (validateAuthForm()) return;

    setAuthLoading(true);
    try {
      const isOnline = await checkConnectivity();
      let result;

      if (isOnline) {
        result = form.isLogin
          ? await FirebaseAuthService.loginUser(form.email, form.password)
          : await FirebaseAuthService.registerUser(form.email, form.password, form.name);
      } else {
        result = form.isLogin
          ? await LocalAuthService.loginUser(form.email, form.password)
          : await LocalAuthService.registerUser(form.email, form.password, form.name, 'admin');
      }

      if (result.success) {
        if (!form.isLogin) {
          Alert.alert(
            'Conta Criada com Sucesso!', 
            'Sua conta foi criada com sucesso! A página será atualizada automaticamente.',
            [{
              text: 'OK',
              onPress: () => {
                setForm({ email: '', password: '', name: '', isLogin: true });
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }
            }]
          );
        }
      } else {
        Alert.alert('Erro', result.error);
      }
    } catch (error: any) {
      console.error('Erro na autenticação:', error);
      Alert.alert('Erro', 'Erro inesperado: ' + error.message);
    } finally {
      setAuthLoading(false);
    }
  }, [form, validateAuthForm, checkConnectivity]);

  const handlePasswordReset = useCallback(async () => {
    const emailError = validateEmail(reset.email);
    if (emailError) {
      Alert.alert('Email inválido', emailError);
      return;
    }

    setReset(prev => ({ ...prev, loading: true }));
    try {
      const isOnline = await checkConnectivity();

      if (!isOnline) {
        Alert.alert('Sem conexão', 'O reset de senha requer conexão com a internet.');
        return;
      }

      const result = await FirebaseAuthService.resetPassword(reset.email.trim());
      
      if (result.success) {
        Alert.alert(
          'Email enviado!', 
          'Verifique sua caixa de entrada e spam.',
          [{ text: 'OK', onPress: () => {
            setReset({ email: '', visible: false, loading: false });
          }}]
        );
      } else {
        Alert.alert('Erro', result.error || 'Não foi possível enviar o email.');
      }
    } catch (error: any) {
      console.error('Erro no reset:', error);
      Alert.alert('Erro', 'Erro inesperado: ' + error.message);
    } finally {
      setReset(prev => ({ ...prev, loading: false }));
    }
  }, [reset.email, checkConnectivity]);
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Bem-vindo ao</Text>
              <Text style={styles.appName}>Agenda Familiar</Text>
            </View>

            {/* Toggle Login/Registro */}
            <View style={styles.authToggle}>
              <Pressable
                style={({ pressed }) => [
                  styles.toggleButton,
                  form.isLogin && styles.toggleButtonActive,
                  pressed && { opacity: 0.7 }
                ]}
                onPress={() => setForm(prev => ({ ...prev, isLogin: true }))}
                android_ripple={{ color: 'rgba(0, 122, 255, 0.2)' }}
              >
                <Text style={[styles.toggleText, form.isLogin && styles.toggleTextActive]}>Entrar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.toggleButton,
                  !form.isLogin && styles.toggleButtonActive,
                  pressed && { opacity: 0.7 }
                ]}
                onPress={() => setForm(prev => ({ ...prev, isLogin: false }))}
                android_ripple={{ color: 'rgba(0, 122, 255, 0.2)' }}
              >
                <Text style={[styles.toggleText, !form.isLogin && styles.toggleTextActive]}>Registrar</Text>
              </Pressable>
            </View>

            {/* Formulário de Autenticação */}
            <View style={styles.authForm}>
              {!form.isLogin && (
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={APP_COLORS.text.secondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nome completo"
                    value={form.name}
                    onChangeText={(name) => setForm(prev => ({ ...prev, name }))}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={APP_COLORS.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  value={form.email}
                  onChangeText={(email) => setForm(prev => ({ ...prev, email }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={APP_COLORS.text.secondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Senha"
                  placeholderTextColor="#999"
                  value={form.password}
                  onChangeText={(password) => setForm(prev => ({ ...prev, password }))}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={({ pressed }) => [styles.passwordToggle, pressed && { opacity: 0.5 }]}
                  android_ripple={{ color: 'rgba(0, 0, 0, 0.1)', radius: 20, borderless: true }}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color={APP_COLORS.text.secondary} 
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryButton,
                  authLoading && styles.buttonDisabled,
                  pressed && !authLoading && styles.buttonPressed
                ]}
                onPress={handleEmailAuth}
                disabled={authLoading}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
              >
                {authLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="mail" size={24} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>
                      {form.isLogin ? 'Entrar com Email' : 'Criar Conta'}
                    </Text>
                  </>
                )}
              </Pressable>

              {form.isLogin && (
                <Pressable
                  style={({ pressed }) => [styles.forgotPasswordButton, pressed && { opacity: 0.6 }]}
                  onPress={() => setReset(prev => ({ ...prev, visible: true }))}
                >
                  <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
                </Pressable>
              )}
            </View>
            
            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={16} color={APP_COLORS.text.secondary} />
              <Text style={styles.infoText}>
                Você pode alterar seu perfil e configurações após fazer login
              </Text>
            </View>
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>Organize suas tarefas de forma simples e compartilhada.</Text>
            </View>
          </View>
        </ScrollView>

        {/* Modal de Reset de Senha */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={reset.visible}
          onRequestClose={() => setReset(prev => ({ ...prev, visible: false }))}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Redefinir Senha</Text>
              <Text style={styles.modalSubtitle}>
                Digite seu email para receber um link de redefinição de senha
              </Text>
              
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Digite seu email"
                  placeholderTextColor="#999"
                  value={reset.email}
                  onChangeText={(email) => setReset(prev => ({ ...prev, email }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>

              <View style={styles.modalButtons}>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalButton,
                    styles.cancelButton,
                    pressed && !reset.loading && { opacity: 0.7 }
                  ]}
                  onPress={() => setReset({ email: '', visible: false, loading: false })}
                  disabled={reset.loading}
                  android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalButton,
                    styles.sendButton,
                    reset.loading && styles.buttonDisabled,
                    pressed && !reset.loading && styles.buttonPressed
                  ]}
                  onPress={handlePasswordReset}
                  disabled={reset.loading}
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
                >
                  {reset.loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.sendButtonText}>Enviar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 30,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    width: '100%',
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonIcon: {
    marginRight: 15,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  footer: {
    marginBottom: 40,
  },
  footerText: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: APP_COLORS.text.secondary,
    textAlign: 'center',
    flex: 1,
  },
  authToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
    alignSelf: 'center',
    width: '80%',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: APP_COLORS.primary.main,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.text.secondary,
  },
  toggleTextActive: {
    color: '#fff',
  },
  authForm: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.background.lightGray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border.light,
    paddingLeft: 15,
    paddingRight: 8, // Menos padding à direita para o botão de senha
    paddingVertical: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  passwordToggle: {
    padding: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: APP_COLORS.text.primary,
  },
  primaryButton: {
    backgroundColor: APP_COLORS.primary.main,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: APP_COLORS.primary.main,
    textDecorationLine: 'underline',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: APP_COLORS.background.lightGray,
    borderRadius: 20,
    padding: 25,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: APP_COLORS.text.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: APP_COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  sendButton: {
    backgroundColor: APP_COLORS.primary.main,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

