import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserRole } from '../types/FamilyTypes';

interface LoginScreenProps {
  onGuestLogin: (role: UserRole) => void;
  onGoogleLogin: (role: UserRole) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onGuestLogin, onGoogleLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [inviteCode, setInviteCode] = useState<string>('');

  const handleGoogleLogin = () => {
    onGoogleLogin(selectedRole);
  };

  const handleGuestLogin = () => {
    if (selectedRole === 'dependente') {
      if (!inviteCode.trim()) {
        Alert.alert('Código Necessário', 'Digite o código de convite para entrar como dependente da família.');
        return;
      }
      
      if (!validateInviteCode(inviteCode.trim())) {
        Alert.alert('Código Inválido', 'O código de convite não existe ou expirou. Peça um novo código para o administrador.');
        return;
      }
      
      Alert.alert('Sucesso!', `Bem-vindo à família! Código ${inviteCode.toUpperCase()} validado.`);
    }
    
    onGuestLogin(selectedRole);
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/icon.png')} style={styles.logo} />
        <Text style={styles.title}>Bem-vindo ao</Text>
        <Text style={styles.appName}>Agenda Familiar</Text>
      </View>

      <View style={styles.roleSelection}>
        <Text style={styles.roleTitle}>Escolha seu perfil:</Text>
        <View style={styles.roleButtons}>
          <TouchableOpacity 
            style={[styles.roleButton, selectedRole === 'admin' && styles.roleButtonSelected]} 
            onPress={() => setSelectedRole('admin')}
          >
            <Ionicons 
              name="shield-checkmark" 
              size={24} 
              color={selectedRole === 'admin' ? '#fff' : '#007AFF'} 
            />
            <Text style={[
              styles.roleButtonText, 
              selectedRole === 'admin' && styles.roleButtonTextSelected
            ]}>
              Administrador
            </Text>
            <Text style={[
              styles.roleDescription,
              selectedRole === 'admin' && styles.roleDescriptionSelected
            ]}>
              Gerencia tarefas da família
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.roleButton, selectedRole === 'dependente' && styles.roleButtonSelected]} 
            onPress={() => setSelectedRole('dependente')}
          >
            <Ionicons 
              name="person" 
              size={24} 
              color={selectedRole === 'dependente' ? '#fff' : '#007AFF'} 
            />
            <Text style={[
              styles.roleButtonText, 
              selectedRole === 'dependente' && styles.roleButtonTextSelected
            ]}>
              Dependente
            </Text>
            <Text style={[
              styles.roleDescription,
              selectedRole === 'dependente' && styles.roleDescriptionSelected
            ]}>
              Precisa de aprovação para concluir tarefas
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Campo de Código de Convite */}
      {selectedRole === 'dependente' && (
        <View style={styles.inviteContainer}>
          <Text style={styles.inviteTitle}>Código de Convite da Família</Text>
          <View style={styles.inviteInputContainer}>
            <Ionicons name="key-outline" size={20} color="#666" style={styles.inviteIcon} />
            <TextInput
              style={styles.inviteInput}
              placeholder="Digite o código de 6 caracteres"
              value={inviteCode}
              onChangeText={setInviteCode}
              maxLength={6}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
          <Text style={styles.inviteHint}>
            Peça o código para um administrador da família
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.googleButton]} onPress={handleGoogleLogin}>
          <Ionicons name="logo-google" size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Entrar com Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.guestButton]} onPress={handleGuestLogin}>
          <Ionicons name="person" size={24} color="#333" style={styles.buttonIcon} />
          <Text style={[styles.buttonText, styles.guestButtonText]}>Continuar como Convidado</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Organize suas tarefas de forma simples e compartilhada.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 30,
  },
  header: {
    alignItems: 'center',
    marginTop: 80,
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
  roleSelection: {
    width: '100%',
    marginBottom: 20,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  roleButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 8,
    textAlign: 'center',
  },
  roleButtonTextSelected: {
    color: '#fff',
  },
  roleDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  roleDescriptionSelected: {
    color: '#e6f3ff',
  },
  inviteContainer: {
    width: '100%',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  inviteInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 8,
  },
  inviteIcon: {
    marginRight: 10,
  },
  inviteInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  inviteHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
