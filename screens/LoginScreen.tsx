import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, TextInput, ActivityIndicator, Platform, ScrollView, Modal, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FirebaseAuthService from '../services/FirebaseAuthService';
import Alert from '../utils/Alert';

interface LoginScreenProps {
  // Interface vazia - login agora é gerenciado internamente
}

export const LoginScreen: React.FC<LoginScreenProps> = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [resetModalVisible, setResetModalVisible] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  const handleEmailAuth = async () => {
    // Validações mais detalhadas
    if (!email.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, digite seu email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Email inválido', 'Por favor, digite um email válido (exemplo: usuario@gmail.com).');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, digite sua senha.');
      return;
    }

    if (!isLogin && password.length < 6) {
      Alert.alert('Senha muito fraca', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (!isLogin && !name.trim()) {
      Alert.alert('Campo obrigatório', 'Por favor, digite seu nome completo.');
      return;
    }

    setLoading(true);

    try {
      let result;
      
      if (isLogin) {
        // Login
        result = await FirebaseAuthService.loginUser(email, password);
      } else {
        // Registro com papel de admin por padrão
        result = await FirebaseAuthService.registerUser(email, password, name, 'admin');
      }

      if (result.success) {
        if (!isLogin) {
          // Alerta após criar cadastro com confirmação e atualização automática
          Alert.alert(
            'Conta Criada com Sucesso!', 
            'Sua conta foi criada com sucesso! A página será atualizada automaticamente.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Limpar formulário e voltar para tela de login
                  setEmail('');
                  setPassword('');
                  setName('');
                  setIsLogin(true);
                  
                  // Atualizar a página automaticamente após um breve delay
                  setTimeout(() => {
                    if (typeof window !== 'undefined') {
                      window.location.reload();
                    }
                  }, 500);
                }
              }
            ]
          );
        }
        // O AuthStateListener no App.tsx irá detectar o login automaticamente
      } else {
        Alert.alert('Erro', result.error);
      }
    } catch (error: any) {
      Alert.alert('Erro', 'Erro inesperado: ' + error.message);
    }

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
      const result = await FirebaseAuthService.resetPassword(resetEmail.trim());
      
      if (result.success) {
        Alert.alert(
          'Email enviado!', 
          'Verifique sua caixa de entrada e spam. O link de redefinição de senha foi enviado para seu email.',
          [{ text: 'OK', onPress: () => setResetModalVisible(false) }]
        );
        setResetEmail('');
      } else {
        Alert.alert('Erro', result.error);
      }
    } catch (error: any) {
      Alert.alert('Erro', 'Erro inesperado: ' + error.message);
    }

    setResetLoading(false);
  };

  const validateInviteCode = (code: string) => {
    // Em um app real, isso validaria o código com o servidor
    // Por agora, vamos simular códigos válidos (6 caracteres alfanuméricos)
    const codePattern = /^[A-Z0-9]{6}$/;
    const validCodes = ['ABC123', 'DEF456', 'GHI789', 'XYZ789', 'QWE123']; // Códigos de exemplo
    
    const upperCode = code.toUpperCase();
    return codePattern.test(upperCode) && validCodes.includes(upperCode);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
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
            <Image source={require('../assets/icon.png')} style={styles.logo} />
            <Text style={styles.title}>Bem-vindo ao</Text>
            <Text style={styles.appName}>Agenda Familiar</Text>
          </View>

          {/* Toggle Login/Registro */}
          <View style={styles.authToggle}>
            <Pressable
              style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>Entrar</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>Registrar</Text>
            </Pressable>
          </View>

          {/* Formulário de Autenticação */}
          <View style={styles.authForm}>
            {!isLogin && (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
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
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
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
              style={styles.forgotPasswordButton}
              onPress={() => setResetModalVisible(true)}
            >
              <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
            </Pressable>
          )}
        </View>
        
        {/* Nota sobre configurações */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={16} color="#666" />
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
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setResetModalVisible(false);
                  setResetEmail('');
                }}
                disabled={resetLoading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.sendButton, resetLoading && styles.buttonDisabled]}
                onPress={handlePasswordReset}
                disabled={resetLoading}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#666',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
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
    shadowColor: '#000',
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
    color: '#999',
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
    color: '#666',
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
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 15,
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
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
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
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#007AFF',
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
