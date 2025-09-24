import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GOOGLE_CLIENT_IDS } from '../config/googleAuth';
import { USER_TYPES } from '../constants/userTypes';

WebBrowser.maybeCompleteAuthSession();

// Função helper para timeout
const withTimeout = (promise, timeoutMs) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    )
  ]);
};

export default function LoginScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleConfigured, setIsGoogleConfigured] = useState(true);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_CLIENT_IDS.ANDROID,
    iosClientId: GOOGLE_CLIENT_IDS.IOS,
    webClientId: GOOGLE_CLIENT_IDS.WEB,
    scopes: ['profile', 'email'],
    responseType: 'token',
    additionalParameters: {
      access_type: 'offline',
      prompt: 'consent',
    },
  });

  // Verifica se as configurações do Google estão disponíveis
  useEffect(() => {
    const checkGoogleConfig = () => {
      const hasAndroidId = GOOGLE_CLIENT_IDS.ANDROID && GOOGLE_CLIENT_IDS.ANDROID !== 'your-android-client-id';
      const hasIosId = GOOGLE_CLIENT_IDS.IOS && GOOGLE_CLIENT_IDS.IOS !== 'your-ios-client-id';
      const hasWebId = GOOGLE_CLIENT_IDS.WEB && GOOGLE_CLIENT_IDS.WEB !== 'your-web-client-id';

      setIsGoogleConfigured(hasAndroidId || hasIosId || hasWebId);
    };

    checkGoogleConfig();
  }, []);

  useEffect(() => {
    let timeoutId;

    if (response?.type === 'success') {
      const { authentication } = response;
      console.log('Autenticação bem-sucedida!', authentication);
      fetchUserInfo(authentication.accessToken, authentication);
    } else if (response?.type === 'error') {
      console.error('Erro na autenticação:', response.error);
      setIsLoading(false);
      Alert.alert(
        'Erro na Autenticação',
        'Não foi possível fazer login com o Google. Verifique sua conexão com a internet e tente novamente.',
        [{ text: 'OK' }]
      );
    } else if (response?.type === 'cancel') {
      setIsLoading(false);
      console.log('Autenticação cancelada pelo usuário');
    }

    // Timeout de segurança para casos onde a resposta não chega
    if (isLoading && !response) {
      timeoutId = setTimeout(() => {
        console.warn('Timeout aguardando resposta da autenticação');
        setIsLoading(false);
        Alert.alert(
          'Timeout',
          'A autenticação está demorando mais que o esperado. Tente novamente.',
          [{ text: 'OK' }]
        );
      }, 45000); // 45 segundos
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [response, isLoading]);

  const fetchUserInfo = async (token, credentials) => {
    try {
      setIsLoading(true);

      // Timeout de 10 segundos para a requisição
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const userInfo = await response.json();

      // Validação básica dos dados do usuário
      if (!userInfo.id || !userInfo.email) {
        throw new Error('Dados do usuário incompletos');
      }

      console.log('Informações do usuário obtidas com sucesso');
      setIsLoading(false);

      navigation.navigate('UserTypeSelection', {
        user: userInfo,
        googleCredentials: credentials
      });
    } catch (error) {
      console.error('Erro ao buscar informações do usuário:', error);
      setIsLoading(false);

      if (error.name === 'AbortError') {
        Alert.alert(
          'Timeout',
          'A solicitação demorou muito para responder. Verifique sua conexão com a internet e tente novamente.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Erro',
          'Não foi possível obter suas informações do Google. Tente novamente.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleGoogleLogin = async () => {
    if (!isGoogleConfigured) {
      Alert.alert(
        'Configuração Incompleta',
        'O login com Google não está configurado corretamente. Entre em contato com o suporte.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsLoading(true);

      // Timeout de 30 segundos para o processo de autenticação
      const result = await withTimeout(promptAsync(), 30000);

      if (result.type === 'error') {
        console.error('Erro no prompt:', result.error);
        setIsLoading(false);
        Alert.alert(
          'Erro',
          'Não foi possível iniciar a autenticação. Verifique sua conexão com a internet.',
          [{ text: 'OK' }]
        );
      }
      // O useEffect tratará o sucesso
    } catch (error) {
      console.error('Erro ao tentar login:', error);
      setIsLoading(false);

      if (error.message === 'TIMEOUT') {
        Alert.alert(
          'Timeout',
          'A autenticação demorou muito para responder. Verifique sua conexão com a internet e tente novamente.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Erro Inesperado',
          'Ocorreu um erro inesperado. Tente novamente.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleGuestLogin = () => {
    console.log('Botão Convidado pressionado');
    const guestUser = { name: 'Convidado', picture: null, email: 'guest@local' };
    navigation.navigate('Home', { user: guestUser, userType: USER_TYPES.CONVIDADO });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.content}>
        <Text style={styles.title}>Agenda Familiar</Text>
        <Text style={styles.subtitle}>Tarefas compartilhadas, vida organizada.</Text>

        <TouchableOpacity
          style={[styles.button, styles.googleButton, (isLoading || !request) && styles.buttonDisabled]}
          onPress={handleGoogleLogin}
          disabled={isLoading || !request || !isGoogleConfigured}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="logo-google" size={24} color="#fff" />
          )}
          <Text style={styles.buttonText}>
            {isLoading ? 'Conectando...' : 'Entrar com Google'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.guestButton, isLoading && styles.buttonDisabled]}
          onPress={handleGuestLogin}
          disabled={isLoading}
        >
          <Ionicons name="person-outline" size={24} color="#333" />
          <Text style={[styles.buttonText, { color: '#333' }]}>Entrar como Convidado</Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Todos os dados criados no modo convidado serão migrados automaticamente quando você fizer login com o Google.
          </Text>
          <View style={styles.advantages}>
            <Text style={styles.advantagesTitle}>Vantagens de logar com o Google:</Text>
            <View style={styles.advantageItem}>
              <Ionicons name="cloud-upload-outline" size={20} color="#34C759" />
              <Text style={styles.advantageText}>Salvar os arquivos em nuvem</Text>
            </View>
            <View style={styles.advantageItem}>
              <Ionicons name="phone-portrait-outline" size={20} color="#007AFF" />
              <Text style={styles.advantageText}>Fácil acesso em todos os dispositivos móveis</Text>
            </View>
            <View style={styles.advantageItem}>
              <Ionicons name="sync-circle-outline" size={20} color="#AF52DE" />
              <Text style={styles.advantageText}>Sincronização automática da família</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  infoContainer: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  advantages: {},
  advantagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  advantageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  advantageText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
});