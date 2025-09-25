import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../contexts/AuthContext';
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
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleConfigured, setIsGoogleConfigured] = useState(true);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_CLIENT_IDS.ANDROID,
    iosClientId: GOOGLE_CLIENT_IDS.IOS,
    webClientId: GOOGLE_CLIENT_IDS.WEB,
    // Pedimos o id_token (necessário para autenticação com Firebase).
    // Também mantemos escopos de profile/email.
    scopes: ['profile', 'email', 'openid'],
    responseType: 'id_token',
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

      // Verificação adicional para modo web
      if (Platform.OS === 'web' && authentication) {
        console.log('Modo web: verificando propriedades da autenticação');
        console.log('idToken presente:', !!authentication.idToken);
        console.log('accessToken presente:', !!authentication.accessToken);
      }

      // Verificar se authentication existe e tem as propriedades necessárias
      if (!authentication) {
        console.error('Objeto authentication não foi fornecido');
        setIsLoading(false);
        Alert.alert(
          'Erro na Autenticação',
          'Não foi possível obter as credenciais de autenticação. Tente novamente.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Se recebemos um idToken (JWT) vamos decodificar e usar os dados
      // diretamente (contém email, name, picture). Caso contrário, usamos
      // o accessToken como fallback para buscar no endpoint do Google.
      if (authentication.idToken) {
        fetchUserInfo(authentication.idToken, authentication, /* isIdToken */ true);
      } else if (authentication.accessToken) {
        fetchUserInfo(authentication.accessToken, authentication, /* isIdToken */ false);
      } else {
        console.error('Nem idToken nem accessToken foram fornecidos');
        setIsLoading(false);
        Alert.alert(
          'Erro na Autenticação',
          'Credenciais de autenticação incompletas. Tente novamente.',
          [{ text: 'OK' }]
        );
      }
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

  // token: pode ser um accessToken (string) ou um idToken (JWT string)
  // isIdToken: quando true, token é um idToken (JWT) e será decodificado
  const fetchUserInfo = async (token, credentials, isIdToken = false) => {
    try {
      setIsLoading(true);
      let userInfo = null;

      if (isIdToken && token) {
        // Decodifica o JWT (idToken) para obter os dados do usuário
        try {
          const parseJwt = (jwt) => {
            const parts = jwt.split('.');
            if (parts.length < 2) return null;
            const payload = parts[1];
            // base64url -> base64
            const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            // Polifill para atob/Buffer
            let jsonPayload = '';
            try {
              if (typeof atob === 'function') {
                jsonPayload = decodeURIComponent(
                  Array.prototype.map
                    .call(atob(b64), (c) => '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                );
              } else if (typeof Buffer !== 'undefined') {
                jsonPayload = Buffer.from(b64, 'base64').toString('utf8');
              } else {
                // último recurso: retornar null
                return null;
              }
              return JSON.parse(jsonPayload);
            } catch (e) {
              console.warn('Falha ao decodificar idToken:', e);
              return null;
            }
          };

          const payload = parseJwt(token);
          if (payload) {
            userInfo = {
              id: payload.sub || payload.user_id || null,
              email: payload.email || null,
              name: payload.name || payload.given_name || null,
              picture: payload.picture || null
            };
          }
        } catch (e) {
          console.warn('Erro ao extrair dados do idToken:', e);
        }
      }

      // Fallback: se não obtivemos userInfo a partir do idToken, tente o endpoint com accessToken
      if (!userInfo) {
        // Timeout de 10 segundos para a requisição
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const resp = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
          throw new Error(`Erro HTTP: ${resp.status}`);
        }

        const data = await resp.json();
        userInfo = data;
      }

      // Validação básica dos dados do usuário
      if (!userInfo || !userInfo.id || !userInfo.email) {
        throw new Error('Dados do usuário incompletos');
      }

      console.log('Informações do usuário obtidas com sucesso');
      setIsLoading(false);

      // Navega para seleção de tipo de usuário com os dados obtidos
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

      // Verificação adicional para modo web
      if (Platform.OS === 'web') {
        console.log('Modo web detectado - usando autenticação web');
        // Adicionar aviso sobre possíveis limitações do navegador
        console.warn('Nota: Alguns navegadores podem bloquear popups de autenticação devido a políticas de segurança');
      }

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
    // Gerar um id e email únicos para o usuário convidado para satisfazer
    // validações de `AuthContext.login` (exige id e email).
    const uniqueId = `guest_${Date.now()}`;
    const guestUser = { id: uniqueId, name: 'Convidado', picture: null, email: `${uniqueId}@local` };
    login(guestUser, USER_TYPES.CONVIDADO);
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