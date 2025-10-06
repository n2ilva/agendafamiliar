import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, TextInput, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserRole } from '../types/FamilyTypes';
import FirebaseAuthService from '../services/FirebaseAuthService';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Configurar WebBrowser para mobile
WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  onGuestLogin: (role?: UserRole) => void;
  onGoogleLogin?: (role?: UserRole) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGuestLogin, onGoogleLogin }) => {
  const [inviteCode, setInviteCode] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

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
        // Registro - sempre como admin por padrão
        result = await FirebaseAuthService.registerUser(email, password, name, 'admin');
      }

      if (result.success) {
        Alert.alert('Sucesso!', isLogin ? 'Login realizado com sucesso!' : 'Conta criada com sucesso!');
        // O AuthStateListener no App.tsx irá detectar o login automaticamente
      } else {
        Alert.alert('Erro', result.error);
      }
    } catch (error: any) {
      Alert.alert('Erro', 'Erro inesperado: ' + error.message);
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      let accessToken: string | undefined;
      
      if (Platform.OS !== 'web') {
        // Para mobile, usar expo-auth-session
        const redirectUri = AuthSession.makeRedirectUri({
          scheme: 'taskapp'
        });
        
        console.log('Redirect URI:', redirectUri); // Para debug
        
        const request = new AuthSession.AuthRequest({
          clientId: '706947026533-p95dfh9iuoakp88hqhub0nj4q1k29e1o.apps.googleusercontent.com', // Seu client ID
          scopes: ['openid', 'profile', 'email'],
          responseType: AuthSession.ResponseType.Token,
          redirectUri,
        });
        
        const result = await request.promptAsync({
          authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        });
        
        if (result.type === 'success' && result.params.access_token) {
          accessToken = result.params.access_token;
        } else {
          if (result.type === 'cancel') {
            // Usuário cancelou o login
            setLoading(false);
            return;
          }
          throw new Error('Falha na autenticação com Google');
        }
      }
      
      // Fazer login no Firebase - sempre como admin por padrão
      const authResult = await FirebaseAuthService.loginWithGoogle(accessToken, 'admin');
      
      if (authResult.success && authResult.user) {
        console.log('Login com Google bem-sucedido:', authResult.user);
        // O observer em App.tsx vai detectar automaticamente a mudança de estado
      } else {
        Alert.alert('Erro', authResult.error || 'Erro no login com Google');
      }
    } catch (error: any) {
      console.error('Erro no login com Google:', error);
      
      let errorMessage = 'Erro inesperado no login com Google.';
      
      if (error.message.includes('cancelado')) {
        return; // Não mostrar erro se o usuário cancelou
      } else if (error.message.includes('network') || error.message.includes('conexão')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (error.message.includes('Falha na autenticação')) {
        errorMessage = 'Não foi possível autenticar com Google. Tente novamente.';
      }
      
      Alert.alert('Erro no Google Login', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    // Sempre entrar como admin no modo convidado
    onGuestLogin('admin');
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>Bem-vindo ao</Text>
          <Text style={styles.appName}>Agenda Familiar</Text>
        </View>

        {/* Toggle Login/Registro */}
        <View style={styles.authToggle}>
          <TouchableOpacity 
            style={[styles.toggleButton, isLogin && styles.toggleButtonActive]}
            onPress={() => setIsLogin(true)}
          >
            <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, !isLogin && styles.toggleButtonActive]}
            onPress={() => setIsLogin(false)}
          >
            <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>Registrar</Text>
          </TouchableOpacity>
        </View>

        {/* Formulário de Autenticação */}
        <View style={styles.authForm}>
          {!isLogin && (
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
        <TouchableOpacity 
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
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.googleButton]} onPress={handleGoogleLogin}>
          <Ionicons name="logo-google" size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Entrar com Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.guestButton]} onPress={handleGuestLogin}>
          <Ionicons name="person" size={24} color="#333" style={styles.buttonIcon} />
          <Text style={[styles.buttonText, styles.guestButtonText]}>Continuar como Convidado</Text>
        </TouchableOpacity>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  googleButton: {
    backgroundColor: '#4285F4',
  },
  guestButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonIcon: {
    marginRight: 15,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  guestButtonText: {
    color: '#333',
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
});
