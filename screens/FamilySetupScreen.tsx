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
import { THEME } from '../utils/colors';
import { familyService } from '../services/LocalFamilyService';
import { UserRole } from '../types/FamilyTypes';
import Alert from '../utils/Alert';

interface Props {
  onFamilySetup: (familyId: string) => void;
  onLogout: () => void;
  userEmail: string;
  userName: string;
  userId: string;
}

type SetupStep = 'choose' | 'create-family' | 'join-family';

export default function FamilySetupScreen({ onFamilySetup, onLogout, userEmail, userName, userId }: Props) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('choose');
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastInviteCode, setLastInviteCode] = useState<string | null>(null);

  // Validação do código da família: apenas caracteres alfanuméricos válidos (evitando ambiguidade)
  // Formato: 6 caracteres (A-Z, 2-9, sem 0, 1, I, O para evitar confusão)
  const handleCodeChange = (text: string) => {
    // Remove caracteres inválidos e limita a 6 caracteres
    const validChars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const filtered = text
      .toUpperCase()
      .split('')
      .filter(char => validChars.includes(char))
      .slice(0, 6)
      .join('');
    
    setFamilyCode(filtered);
  };

  const goTo = (option: 'create' | 'join') => {
    setCurrentStep(option === 'create' ? 'create-family' : 'join-family');
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

      // armazenar o código para exibição no componente (apenas para debug/manual testing)
      setLastInviteCode(newFamily.inviteCode || null);

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

  const handleJoin = async () => {
    if (!familyCode.trim()) {
      Alert.alert('Erro', 'Por favor, insira o código da família');
      return;
    }

    setIsLoading(true);
    try {
      console.log('� Entrando na família como dependente...');
      await familyService.joinFamily(familyCode.trim(), {
        id: userId,
        email: userEmail,
        name: userName,
        role: 'dependente' as UserRole,
        isGuest: false,
        joinedAt: new Date(),
      });

      const joinedFamily = await familyService.getUserFamily(userId);

      Alert.alert('Sucesso!', 'Você entrou na família.', [
        {
          text: 'OK',
          onPress: () => onFamilySetup(joinedFamily?.id || '')
        }
      ]);
    } catch (error) {
      console.error('❌ Erro ao entrar na família:', error);
      Alert.alert('Erro', 'Código da família inválido ou família não encontrada.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderChoose = () => (
    <View style={styles.container}>
      <View style={styles.header}>
  <Ionicons name="people" size={60} color={THEME.primary} />
        <Text style={styles.title}>Bem-vindo!</Text>
        <Text style={styles.subtitle}>Escolha uma opção para começar:</Text>
      </View>

      <View style={styles.optionsContainer}>
          <Pressable
          style={({ pressed }) => [
              styles.roleOption,
              Platform.OS === 'web' && styles.roleOptionWeb,
            pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
          ]}
          onPress={() => goTo('create')}
          android_ripple={{ color: 'rgba(0, 122, 255, 0.1)' }}
        >
          <Ionicons name="person-circle" size={40} color="#007AFF" />
          <Text style={styles.roleTitle}>Criar nova família</Text>
          <Text style={styles.roleDescription}>
            Crie uma nova família e seja o administrador
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
              styles.roleOption,
              Platform.OS === 'web' && styles.roleOptionWeb,
            pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }
          ]}
          onPress={() => goTo('join')}
          android_ripple={{ color: 'rgba(52, 199, 89, 0.1)' }}
        >
          <Ionicons name="person" size={40} color="#34C759" />
          <Text style={styles.roleTitle}>Entrar em uma família</Text>
          <Text style={styles.roleDescription}>
            Use o código da família para entrar como dependente
          </Text>
        </Pressable>
      </View>

      {/* Botão para voltar ao login */}
      <Pressable
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && { opacity: 0.7 }
        ]}
        onPress={onLogout}
      >
  <Ionicons name="log-out-outline" size={20} color={THEME.textSecondary} />
        <Text style={styles.logoutButtonText}>Entrar com outro email</Text>
      </Pressable>
    </View>
  );

  const renderCreateFamily = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => setCurrentStep('choose')}
        >
          <Ionicons name="arrow-back" size={24} color={THEME.primary} />
        </Pressable>
  <Ionicons name="home" size={60} color={THEME.primary} />
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

        {/* Exibição temporária do invite code para facilitar testes manuais */}
        {lastInviteCode ? (
          <View style={styles.inviteCodeBoxInline}>
            <Text style={styles.inviteCodeLabelInline}>Código gerado:</Text>
            <Text style={styles.inviteCodeTextInline}>{lastInviteCode}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  const renderJoinFamily = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => setCurrentStep('choose')}
        >
          <Ionicons name="arrow-back" size={24} color={THEME.primary} />
        </Pressable>
  <Ionicons name="enter" size={60} color={THEME.warning} />
        <Text style={styles.title}>Entrar na Família</Text>
        <Text style={styles.subtitle}>Insira o código da família:</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Código da família (6 caracteres)"
          value={familyCode}
          onChangeText={handleCodeChange}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Pressable
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={handleJoin}
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
      case 'choose':
        return renderChoose();
      case 'create-family':
        return renderCreateFamily();
      case 'join-family':
        return renderJoinFamily();
      default:
        return renderChoose();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, Platform.OS === 'web' && styles.scrollContainerWeb]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.pageContainer, Platform.OS === 'web' && styles.pageContainerWeb]}>
          {renderCurrentStep()}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  scrollContainerWeb: {
    paddingHorizontal: 0,
  },
  pageContainer: {
    width: '100%',
    alignSelf: 'center',
  },
  pageContainerWeb: {
    width: '70%',
    maxWidth: 1000,
    minWidth: 320,
    alignSelf: 'center',
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
    color: THEME.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  optionsContainer: {
    width: '100%',
    gap: 20,
  },
    // No web, remover espaçamentos extras entre "cards" de opção
    optionsContainerWeb: {
      gap: 12,
    },
    roleOption: {
      backgroundColor: THEME.surface,
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
    roleOptionWeb: {
      alignSelf: 'stretch',
      width: '100%',
      marginHorizontal: 0,
    },
  roleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.textPrimary,
    marginTop: 15,
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
    gap: 20,
  },
  input: {
    backgroundColor: THEME.surface,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  primaryButton: {
    backgroundColor: THEME.primary,
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
  inviteCodeBoxInline: {
    marginTop: 12,
    alignItems: 'center',
  },
  inviteCodeLabelInline: {
    fontSize: 14,
    color: THEME.textSecondary,
  },
  inviteCodeTextInline: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
    color: THEME.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: THEME.background,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  logoutButtonText: {
    fontSize: 14,
    color: THEME.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
});