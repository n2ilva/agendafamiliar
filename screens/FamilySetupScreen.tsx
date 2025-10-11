import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { familyService } from '../services/LocalFamilyService';
import { UserRole } from '../types/FamilyTypes';
import Alert from '../utils/Alert';

interface Props {
  onFamilySetup: (familyId: string) => void;
  userEmail: string;
  userName: string;
  userId: string;
}

type SetupStep = 'select-role' | 'admin-options' | 'create-family' | 'join-family' | 'dependent-join';

export default function FamilySetupScreen({ onFamilySetup, userEmail, userName, userId }: Props) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('select-role');
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelection = (role: 'admin' | 'dependent') => {
    if (role === 'admin') {
      setCurrentStep('admin-options');
    } else {
      setCurrentStep('dependent-join');
    }
  };

  const handleAdminOption = (option: 'create' | 'join') => {
    if (option === 'create') {
      setCurrentStep('create-family');
    } else {
      setCurrentStep('join-family');
    }
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) {
      Alert.alert('Erro', 'Por favor, insira o nome da família');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🏠 Criando nova família...');
      
      const newFamily = await familyService.createFamily(familyName.trim(), {
        id: userId,
        email: userEmail,
        name: userName,
        role: 'admin' as UserRole,
        isGuest: false,
        joinedAt: new Date(),
      });

      Alert.alert(
        'Família Criada!',
        `Família "${familyName}" criada com sucesso!\n\nCódigo da família: ${newFamily.inviteCode}\n\nCompartilhe este código com os membros da família.`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('✅ Família criada e usuário adicionado como admin');
              onFamilySetup(newFamily.id);
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Erro ao criar família:', error);
      Alert.alert('Erro', 'Não foi possível criar a família. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinAsAdmin = async () => {
    if (!familyCode.trim()) {
      Alert.alert('Erro', 'Por favor, insira o código da família');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🏠 Entrando na família como segundo admin...');
      
      await familyService.joinFamily(familyCode.trim(), {
        id: userId,
        email: userEmail,
        name: userName,
        role: 'admin' as UserRole,
        isGuest: false,
        joinedAt: new Date(),
      });

      // Buscar a família do usuário
      const joinedFamily = await familyService.getUserFamily(userId);

      Alert.alert(
        'Sucesso!',
        'Você entrou na família como administrador.',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('✅ Usuário adicionado como segundo admin');
              onFamilySetup(joinedFamily?.id || '');
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Erro ao entrar na família:', error);
      Alert.alert('Erro', 'Código da família inválido ou família não encontrada.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinAsDependent = async () => {
    if (!familyCode.trim()) {
      Alert.alert('Erro', 'Por favor, insira o código da família');
      return;
    }

    setIsLoading(true);
    try {
      console.log('👶 Entrando na família como dependente...');
      
      await familyService.joinFamily(familyCode.trim(), {
        id: userId,
        email: userEmail,
        name: userName,
        role: 'dependente' as UserRole,
        isGuest: false,
        joinedAt: new Date(),
      });

      // Buscar a família do usuário
      const joinedFamily = await familyService.getUserFamily(userId);

      Alert.alert(
        'Sucesso!',
        'Você entrou na família como dependente.',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('✅ Usuário adicionado como dependente');
              onFamilySetup(joinedFamily?.id || '');
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Erro ao entrar na família:', error);
      Alert.alert('Erro', 'Código da família inválido ou família não encontrada.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSelectRole = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="people" size={60} color="#007AFF" />
        <Text style={styles.title}>Configurar Perfil</Text>
        <Text style={styles.subtitle}>Escolha como você deseja usar o aplicativo:</Text>
      </View>

      <View style={styles.optionsContainer}>
        <Pressable
          style={styles.roleOption}
          onPress={() => handleRoleSelection('admin')}
        >
          <Ionicons name="person-circle" size={40} color="#007AFF" />
          <Text style={styles.roleTitle}>Administrador</Text>
          <Text style={styles.roleDescription}>
            Criar nova família ou entrar como segundo administrador
          </Text>
        </Pressable>

        <Pressable
          style={styles.roleOption}
          onPress={() => handleRoleSelection('dependent')}
        >
          <Ionicons name="person" size={40} color="#34C759" />
          <Text style={styles.roleTitle}>Dependente</Text>
          <Text style={styles.roleDescription}>
            Entrar em uma família existente usando código
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderAdminOptions = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => setCurrentStep('select-role')}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </Pressable>
        <Ionicons name="person-circle" size={60} color="#007AFF" />
        <Text style={styles.title}>Administrador</Text>
        <Text style={styles.subtitle}>Escolha uma opção:</Text>
      </View>

      <View style={styles.optionsContainer}>
        <Pressable
          style={styles.roleOption}
          onPress={() => handleAdminOption('create')}
        >
          <Ionicons name="add-circle" size={40} color="#007AFF" />
          <Text style={styles.roleTitle}>Criar Nova Família</Text>
          <Text style={styles.roleDescription}>
            Criar uma nova família e ser o primeiro administrador
          </Text>
        </Pressable>

        <Pressable
          style={styles.roleOption}
          onPress={() => handleAdminOption('join')}
        >
          <Ionicons name="enter" size={40} color="#FF9500" />
          <Text style={styles.roleTitle}>Entrar como Segundo Admin</Text>
          <Text style={styles.roleDescription}>
            Entrar em uma família existente como administrador
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderCreateFamily = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => setCurrentStep('admin-options')}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </Pressable>
        <Ionicons name="home" size={60} color="#007AFF" />
        <Text style={styles.title}>Criar Família</Text>
        <Text style={styles.subtitle}>Insira o nome da sua família:</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nome da família"
          value={familyName}
          onChangeText={setFamilyName}
          maxLength={50}
        />

        <Pressable
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={handleCreateFamily}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {isLoading ? 'Criando...' : 'Criar Família'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderJoinFamily = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => setCurrentStep('admin-options')}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </Pressable>
        <Ionicons name="enter" size={60} color="#FF9500" />
        <Text style={styles.title}>Entrar como Admin</Text>
        <Text style={styles.subtitle}>Insira o código da família:</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Código da família"
          value={familyCode}
          onChangeText={setFamilyCode}
          maxLength={20}
          autoCapitalize="characters"
        />

        <Pressable
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={handleJoinAsAdmin}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {isLoading ? 'Entrando...' : 'Entrar na Família'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderDependentJoin = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => setCurrentStep('select-role')}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </Pressable>
        <Ionicons name="person" size={60} color="#34C759" />
        <Text style={styles.title}>Entrar na Família</Text>
        <Text style={styles.subtitle}>Insira o código fornecido pelo administrador:</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Código da família"
          value={familyCode}
          onChangeText={setFamilyCode}
          maxLength={20}
          autoCapitalize="characters"
        />

        <Pressable
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={handleJoinAsDependent}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {isLoading ? 'Entrando...' : 'Entrar na Família'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'select-role':
        return renderSelectRole();
      case 'admin-options':
        return renderAdminOptions();
      case 'create-family':
        return renderCreateFamily();
      case 'join-family':
        return renderJoinFamily();
      case 'dependent-join':
        return renderDependentJoin();
      default:
        return renderSelectRole();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderCurrentStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  optionsContainer: {
    width: '100%',
    gap: 20,
  },
  roleOption: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
    gap: 20,
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});