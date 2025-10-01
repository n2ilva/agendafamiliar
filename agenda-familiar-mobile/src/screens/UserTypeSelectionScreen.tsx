import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { userTypes } from '../constants/userTypes';
import { firestore } from '../services/firebase';

export const UserTypeSelectionScreen: React.FC = () => {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectType = async () => {
    if (!selectedType || !user) return;

    setLoading(true);
    try {
      // Save user type to Firestore
      await firestore()
        .collection('users')
        .doc(user.uid)
        .set({
          email: user.email,
          userType: selectedType,
          createdAt: new Date(),
        }, { merge: true });

      // Navigate to home screen (this will be handled by navigation)
    } catch (error) {
      console.error('Error saving user type:', error);
      Alert.alert('Erro', 'Não foi possível salvar o tipo de usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bem-vindo!</Text>
        <Text style={styles.subtitle}>
          Escolha seu tipo de usuário para continuar
        </Text>
      </View>

      <View style={styles.optionsContainer}>
        {userTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.option,
              selectedType === type.id && styles.optionSelected,
            ]}
            onPress={() => setSelectedType(type.id)}
          >
            <Text style={styles.optionEmoji}>{type.emoji}</Text>
            <Text
              style={[
                styles.optionText,
                selectedType === type.id && styles.optionTextSelected,
              ]}
            >
              {type.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.continueButton,
          (!selectedType || loading) && styles.continueButtonDisabled,
        ]}
        onPress={handleSelectType}
        disabled={!selectedType || loading}
      >
        <Text style={styles.continueButtonText}>
          {loading ? 'Salvando...' : 'Continuar'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  optionsContainer: {
    marginBottom: 40,
  },
  option: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionSelected: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
  },
  optionEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  optionTextSelected: {
    color: '#fff',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});