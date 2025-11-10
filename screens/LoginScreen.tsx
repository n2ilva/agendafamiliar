import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, TextInput, ActivityIndicator, Platform, ScrollView, Modal, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../utils/colors';
import { useTheme } from '../contexts/ThemeContext';
import LocalAuthService from '../services/LocalAuthService';
import FirebaseAuthService from '../services/FirebaseAuthService';
import ConnectivityService from '../services/ConnectivityService';
import Alert from '../utils/Alert';

interface LoginScreenProps {
  // Interface vazia - login agora é gerenciado internamente
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [resetModalVisible, setResetModalVisible] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleEmailAuth = async () => {
    console.log('🔵 handleEmailAuth iniciado');
    console.log('📧 Email:', email);
    console.log('🔐 Password length:', password.length);
    console.log('👤 isLogin:', isLogin);
    
    // Validações mais detalhadas
    if (!email.trim()) {
      console.log('❌ Email vazio');
      Alert.alert('Campo obrigatório', 'Por favor, digite seu email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.log('❌ Email inválido');
      Alert.alert('Email inválido', 'Por favor, digite um email válido (exemplo: usuario@gmail.com).');
      return;
    }

    if (!password.trim()) {
      console.log('❌ Senha vazia');
      Alert.alert('Campo obrigatório', 'Por favor, digite sua senha.');
      return;
    }

    if (!isLogin && password.length < 6) {
      console.log('❌ Senha muito curta');
      Alert.alert('Senha muito fraca', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!isLogin && !name.trim()) {
      console.log('❌ Nome vazio');
      Alert.alert('Campo obrigatório', 'Por favor, digite seu nome completo.');
      return;
    }

    console.log('✅ Validações passaram, iniciando autenticação...');
    setLoading(true);

    try {
      console.log('🌐 Verificando conectividade...');
      let result;
      
      // Verificar conectividade atual (pode ser inicializada no App.tsx)
      let isOnline = ConnectivityService.isConnected();
      console.log('📡 isConnected (cache):', isOnline);
      
      if (!isOnline) {
        try {
          console.log('🔄 Checando conectividade ativa...');
          const st = await ConnectivityService.checkConnectivity();
          isOnline = st.isConnected;
          console.log('📡 isConnected (verificação):', isOnline);
        } catch (e) {
          console.warn('⚠️ Falha ao checar conectividade, assumindo offline:', e);
          isOnline = false;
        }
      }

      if (isOnline) {
        console.log('☁️ Online - usando autenticação Firebase');
        // Prefer remote auth when online
        if (isLogin) {
          console.log('🔑 Tentando login remoto...');
          result = await FirebaseAuthService.loginUser(email, password);
        } else {
          console.log('📝 Tentando registro remoto...');
          result = await FirebaseAuthService.registerUser(email, password, name);
        }
      } else {
        console.log('💾 Offline - usando autenticação local');
        // Fallback local
        if (isLogin) {
          console.log('🔑 Tentando login local...');
          result = await LocalAuthService.loginUser(email, password);
        } else {
          console.log('📝 Tentando registro local...');
          result = await LocalAuthService.registerUser(email, password, name, 'admin');
        }
      }

      console.log('📊 Resultado da autenticação:', result);

      if (result.success) {
        console.log('✅ Autenticação bem-sucedida!');
        if (!isLogin) {
          // Alerta após criar cadastro com confirmação e atualização automática
          console.log('🎉 Mostrando alert de conta criada');
          Alert.alert(
            'Conta Criada com Sucesso!', 
            'Sua conta foi criada com sucesso! A página será atualizada automaticamente.',
            [
              {
                text: 'OK',
                onPress: () => {
                  console.log('👍 Usuário clicou OK no alert');
                  // Limpar formulário e voltar para tela de login
                  setEmail('');
                  setPassword('');
                  setName('');
                  setIsLogin(true);
                  
                  // Atualizar a página automaticamente após um breve delay
                  setTimeout(() => {
                    if (typeof window !== 'undefined') {
                      console.log('🔄 Recarregando página...');
                      window.location.reload();
                    }
                  }, 500);
                }
              }
            ]
          );
        }
        // O AuthStateListener no App.tsx irá detectar o login automaticamente
        console.log('👂 Aguardando AuthStateListener detectar mudança...');
      } else {
        console.log('❌ Autenticação falhou:', result.error);
        Alert.alert('Erro', result.error);
      }
    } catch (error: any) {
      console.error('💥 Erro inesperado na autenticação:', error);
      Alert.alert('Erro', 'Erro inesperado: ' + error.message);
    }

    console.log('🔚 Finalizando handleEmailAuth');
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, digite seu email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail.trim())) {
      Alert.alert('Email inválido', 'Por favor, digite um email válido.');
      return;
    }

    setResetLoading(true);

    try {
      // Verificar conectividade
      let isOnline = ConnectivityService.isConnected();
      
      if (!isOnline) {
        try {
          const st = await ConnectivityService.checkConnectivity();
          isOnline = st.isConnected;
        } catch (e) {
          isOnline = false;
        }
      }

      let result;
      
      if (isOnline) {
        // Usar Firebase diretamente quando online
        result = await FirebaseAuthService.resetPassword(resetEmail.trim());
      } else {
        // Offline: avisa que precisa de conexão
        Alert.alert(
          'Sem conexão', 
          'O reset de senha requer conexão com a internet. Por favor, conecte-se e tente novamente.'
        );
        setResetLoading(false);
        return;
      }
      
      if (result.success) {
        Alert.alert(
          'Email enviado!', 
          'Verifique sua caixa de entrada e spam. O link de redefinição de senha foi enviado para seu email.',
          [{ text: 'OK', onPress: () => setResetModalVisible(false) }]
        );
        setResetEmail('');
      } else {
        Alert.alert('Erro', result.error || 'Não foi possível enviar o email de reset.');
      }
    } catch (error: any) {
      console.error('Erro inesperado no reset de senha:', error);
      Alert.alert('Erro', 'Erro inesperado: ' + error.message);
    }

    setResetLoading(false);
  };

  // Removido código não utilizado: validação de código de convite

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
            <Image source={require('../assets/icon_natal.jpeg')} style={styles.logo} />
            <Text style={styles.title}>Bem-vindo ao</Text>
            <Text style={styles.appName}>Agenda Familiar</Text>
          </View>

          {/* Toggle Login/Registro */}
          <View style={styles.authToggle}>
            <Pressable
              style={({ pressed }) => [
                styles.toggleButton,
                isLogin && styles.toggleButtonActive,
                pressed && { opacity: 0.7 }
              ]}
              onPress={() => setIsLogin(true)}
              android_ripple={{ color: 'rgba(0, 122, 255, 0.2)' }}
            >
              <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>Entrar</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.toggleButton,
                !isLogin && styles.toggleButtonActive,
                pressed && { opacity: 0.7 }
              ]}
              onPress={() => setIsLogin(false)}
              android_ripple={{ color: 'rgba(0, 122, 255, 0.2)' }}
            >
              <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>Registrar</Text>
            </Pressable>
          </View>

          {/* Formulário de Autenticação */}
          <View style={styles.authForm}>
            {!isLogin && (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={THEME.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nome completo"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>
              </>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={THEME.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={THEME.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={({ pressed }) => [
                  styles.passwordToggle,
                  pressed && { opacity: 0.5 }
                ]}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)', radius: 20, borderless: true }}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={THEME.textSecondary} 
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              loading && styles.buttonDisabled,
              pressed && !loading && styles.buttonPressed
            ]}
            onPress={() => {
              console.log('🖱️ BOTÃO CLICADO - Entrar com Email');
              console.log('⏳ Loading state:', loading);
              console.log('📝 Email atual:', email);
              console.log('🔒 Password atual (length):', password.length);
              handleEmailAuth();
            }}
            disabled={loading}
            android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="mail" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>
                  {isLogin ? 'Entrar com Email' : 'Criar Conta'}
                </Text>
              </>
            )}
          </Pressable>

          {isLogin && (
            <Pressable
              style={({ pressed }) => [
                styles.forgotPasswordButton,
                pressed && { opacity: 0.6 }
              ]}
              onPress={() => setResetModalVisible(true)}
            >
              <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
            </Pressable>
          )}
        </View>
        
        {/* Nota sobre configurações */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={16} color={THEME.textSecondary} />
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
        visible={resetModalVisible}
        onRequestClose={() => setResetModalVisible(false)}
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
                value={resetEmail}
                onChangeText={setResetEmail}
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
                  pressed && !resetLoading && { opacity: 0.7 }
                ]}
                onPress={() => {
                  setResetModalVisible(false);
                  setResetEmail('');
                }}
                disabled={resetLoading}
                android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.sendButton,
                  resetLoading && styles.buttonDisabled,
                  pressed && !resetLoading && styles.buttonPressed
                ]}
                onPress={handlePasswordReset}
                disabled={resetLoading}
                android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
              >
                {resetLoading ? (
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
    color: THEME.textSecondary,
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
    backgroundColor: THEME.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textSecondary,
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
    backgroundColor: THEME.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.border,
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
    color: THEME.textPrimary,
  },
  primaryButton: {
    backgroundColor: THEME.primary,
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
    color: THEME.primary,
    textDecorationLine: 'underline',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: THEME.surface,
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
    color: THEME.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: THEME.textSecondary,
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
    backgroundColor: THEME.primary,
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
