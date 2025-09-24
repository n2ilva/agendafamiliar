import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { USER_TYPES } from '../constants/userTypes';
import { useAuth } from '../contexts/AuthContext';

export default function UserTypeSelectionScreen({ navigation, route }) {
  const { user, googleCredentials } = route.params;
  const [selectedType, setSelectedType] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const userTypeOptions = [
    {
      type: USER_TYPES.ADMIN,
      title: 'Administrador',
      description: 'Acesso completo: criar, editar, excluir e aprovar todas as tarefas',
      icon: 'shield-checkmark',
      color: '#FF6B35'
    },
    {
      type: USER_TYPES.DEPENDENTE,
      title: 'Dependente',
      description: 'Pode criar e editar próprias tarefas. Precisa de aprovação para concluir',
      icon: 'person',
      color: '#4A90E2'
    },
    {
      type: USER_TYPES.CONVIDADO,
      title: 'Convidado',
      description: 'Acesso temporário: pode criar e editar apenas suas próprias tarefas',
      icon: 'person-outline',
      color: '#7ED321'
    }
  ];

  const handleConfirm = async () => {
    if (selectedType && !isLoading) {
      setIsLoading(true);
      try {
        // Faz login através do AuthContext com as credenciais do Google
        const success = await login(user, selectedType, googleCredentials);

        if (success) {
          // Navegação será feita automaticamente pelo AppNavigator baseado no estado
          console.log('Login realizado com sucesso, AppNavigator fará a navegação');
        } else {
          alert('Erro ao fazer login. Tente novamente.');
        }
      } catch (error) {
        console.error('Erro no login:', error);
        alert('Erro ao fazer login. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.content}>
        <Text style={styles.title}>Selecione seu tipo de usuário</Text>
        <Text style={styles.subtitle}>
          Escolha o nível de acesso adequado para sua conta
        </Text>

        <View style={styles.optionsContainer}>
          {userTypeOptions.map((option) => (
            <TouchableOpacity
              key={option.type}
              style={[
                styles.optionCard,
                selectedType === option.type && styles.selectedOption
              ]}
              onPress={() => setSelectedType(option.type)}
            >
              <View style={styles.optionHeader}>
                <Ionicons 
                  name={option.icon} 
                  size={28} 
                  color={selectedType === option.type ? '#fff' : option.color} 
                />
                <Text style={[
                  styles.optionTitle,
                  selectedType === option.type && styles.selectedText
                ]}>
                  {option.title}
                </Text>
              </View>
              <Text style={[
                styles.optionDescription,
                selectedType === option.type && styles.selectedText
              ]}>
                {option.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!selectedType || isLoading) && styles.disabledButton
          ]}
          onPress={handleConfirm}
          disabled={!selectedType || isLoading}
        >
          <Text style={styles.confirmButtonText}>
            {isLoading ? 'Fazendo Login...' : 'Confirmar Seleção'}
          </Text>
          {isLoading ? (
            <Ionicons name="sync" size={20} color="#fff" />
          ) : (
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          )}
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            Você poderá alterar seu tipo de usuário nas configurações a qualquer momento.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
    lineHeight: 22,
  },
  optionsContainer: {
    marginBottom: 40,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 15,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 43,
  },
  selectedText: {
    color: '#fff',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    marginLeft: 10,
  },
});