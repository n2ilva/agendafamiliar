import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GOOGLE_CLIENT_IDS } from '../config/googleAuth';
import { USER_TYPES } from '../constants/userTypes';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
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

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      console.log('Autenticação bem-sucedida!', authentication);
      fetchUserInfo(authentication.accessToken);
    } else if (response?.type === 'error') {
      console.error('Erro na autenticação:', response.error);
      alert('Erro na autenticação. Tente novamente.');
    }
  }, [response]);

  const fetchUserInfo = async (token) => {
    try {
      const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userInfo = await response.json();
      console.log('Informações do usuário:', userInfo);
      navigation.navigate('UserTypeSelection', { user: userInfo });
    } catch (error) {
      console.error('Erro ao buscar informações do usuário:', error);
      alert('Erro ao obter informações do usuário. Tente novamente.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await promptAsync();
      if (result.type === 'success') {
        console.log('Login com Google iniciado');
      } else if (result.type === 'error') {
        console.error('Erro no prompt:', result.error);
        alert('Erro ao iniciar autenticação. Verifique sua conexão.');
      }
    } catch (error) {
      console.error('Erro ao tentar login:', error);
      alert('Erro inesperado. Tente novamente.');
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
          style={[styles.button, styles.googleButton]}
          onPress={handleGoogleLogin}
          disabled={!request}
        >
          <Ionicons name="logo-google" size={24} color="#fff" />
          <Text style={styles.buttonText}>Entrar com Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.guestButton]} onPress={handleGuestLogin}>
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