import React, { useState, useMemo, useCallback } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { APP_COLORS } from '../../constants/colors';
import { useTheme } from '../../contexts/theme.context';
import { useAuth } from '../../contexts/auth.context';
import { familyService } from '../../services/family/local-family.service';

import { UserRole } from '../../types/family.types';
import Alert from '../../utils/helpers/alert';
import { getStyles } from './styles';
import { 
  FamilySetupScreenProps, 
  SetupState, 
  validateFamilyName, 
  validateFamilyCode 
} from './types';

export default function FamilySetupScreen({ 
  onFamilySetup, 
  onLogout, 
  userEmail, 
  userName, 
  userId 
}: FamilySetupScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuth(); // Usando AuthContext
  const styles = useMemo(() => getStyles(colors), [colors]);
  
  // Fallback para props se user do context não estiver pronto (embora deva estar)
  const effectiveUserId = user?.id || userId;
  const effectiveUserEmail = user?.email || userEmail;
  const effectiveUserName = user?.name || userName;
  
  const [state, setState] = useState<SetupState>({
    currentStep: 'choose',
    familyName: '',
    familyCode: '',
    isLoading: false,
    lastInviteCode: null,
  });

  // ============= NAVEGAÇÃO =============
  const goTo = useCallback((option: 'create' | 'join') => {
    setState(prev => ({
      ...prev,
      currentStep: option === 'create' ? 'create-family' : 'join-family'
    }));
  }, []);

  const goBack = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: 'choose',
      familyName: '',
      familyCode: '',
      lastInviteCode: null,
    }));
  }, []);

  // ============= PROCESSAMENTO DE CÓDIGO =============
  const handleCodeChange = useCallback((text: string) => {
    const validChars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const filtered = text
      .toUpperCase()
      .split('')
      .filter(char => validChars.includes(char))
      .slice(0, 6)
      .join('');
    
    setState(prev => ({ ...prev, familyCode: filtered }));
  }, []);

  // ============= CRIAR FAMÍLIA =============
  const handleCreateFamily = useCallback(async () => {
    const error = validateFamilyName(state.familyName);
    if (error) {
      Alert.alert('Erro', error);
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const newFamily = await familyService.createFamily(state.familyName.trim(), {
        id: effectiveUserId,
        email: effectiveUserEmail,
        name: effectiveUserName,
        role: 'admin' as UserRole,
        isGuest: false,
        joinedAt: new Date(),
      });

      setState(prev => ({ ...prev, lastInviteCode: newFamily.inviteCode || null }));

      Alert.alert(
        'Família Criada!',
        `Família "${state.familyName}" criada com sucesso!\n\nCódigo: ${newFamily.inviteCode}`,
        [{
          text: 'OK',
          onPress: () => onFamilySetup(newFamily.id)
        }]
      );
    } catch (error) {
      console.error('❌ Erro ao criar família:', error);
      Alert.alert('Erro', 'Não foi possível criar a família. Tente novamente.');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.familyName, effectiveUserId, effectiveUserEmail, effectiveUserName, onFamilySetup]);

  // ============= ENTRAR EM FAMÍLIA =============
  const handleJoinFamily = useCallback(async () => {
    const error = validateFamilyCode(state.familyCode);
    if (error) {
      Alert.alert('Erro', error);
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await familyService.joinFamily(state.familyCode.trim(), {
        id: effectiveUserId,
        email: effectiveUserEmail,
        name: effectiveUserName,
        role: 'dependente' as UserRole,
        isGuest: false,
        joinedAt: new Date(),
      });

      const joinedFamily = await familyService.getUserFamily(effectiveUserId);
      
      Alert.alert('Sucesso!', 'Você entrou na família.', [{
        text: 'OK',
        onPress: () => onFamilySetup(joinedFamily?.id || '')
      }]);
    } catch (error) {
      console.error('❌ Erro ao entrar:', error);
      Alert.alert('Erro', 'Código inválido ou família não encontrada.');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.familyCode, effectiveUserId, effectiveUserEmail, effectiveUserName, onFamilySetup]);

  // ============= RENDERIZAÇÃO: ESCOLHA =============
  const ChooseStep = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="people" size={60} color={APP_COLORS.primary.main} />
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

      <Pressable
        style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.7 }]}
        onPress={onLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={APP_COLORS.text.secondary} />
        <Text style={styles.logoutButtonText}>Entrar com outro email</Text>
      </Pressable>
    </View>
  );

  // ============= RENDERIZAÇÃO: CRIAR FAMÍLIA =============
  const CreateFamilyStep = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={APP_COLORS.primary.main} />
        </Pressable>
        <Ionicons name="home" size={60} color={APP_COLORS.primary.main} />
        <Text style={styles.title}>Criar Família</Text>
        <Text style={styles.subtitle}>Insira o nome da sua família:</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nome da família"
          placeholderTextColor="#999"
          value={state.familyName}
          onChangeText={(name) => setState(prev => ({ ...prev, familyName: name }))}
          maxLength={50}
          editable={!state.isLoading}
        />

        <Pressable
          style={[styles.primaryButton, state.isLoading && styles.disabledButton]}
          onPress={handleCreateFamily}
          disabled={state.isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {state.isLoading ? 'Criando...' : 'Criar Família'}
          </Text>
        </Pressable>

        {state.lastInviteCode && (
          <View style={styles.inviteCodeBoxInline}>
            <Text style={styles.inviteCodeLabelInline}>Código gerado:</Text>
            <Text style={styles.inviteCodeTextInline}>{state.lastInviteCode}</Text>
          </View>
        )}
      </View>
    </View>
  );

  // ============= RENDERIZAÇÃO: ENTRAR EM FAMÍLIA =============
  const JoinFamilyStep = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={APP_COLORS.primary.main} />
        </Pressable>
        <Ionicons name="enter" size={60} color={APP_COLORS.status.warning} />
        <Text style={styles.title}>Entrar na Família</Text>
        <Text style={styles.subtitle}>Insira o código da família:</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Código da família (6 caracteres)"
          placeholderTextColor="#999"
          value={state.familyCode}
          onChangeText={handleCodeChange}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!state.isLoading}
        />

        <Pressable
          style={[styles.primaryButton, state.isLoading && styles.disabledButton]}
          onPress={handleJoinFamily}
          disabled={state.isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {state.isLoading ? 'Entrando...' : 'Entrar na Família'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  // ============= RENDERIZAÇÃO PRINCIPAL =============
  const renderCurrentStep = () => {
    switch (state.currentStep) {
      case 'choose':
        return <ChooseStep />;
      case 'create-family':
        return <CreateFamilyStep />;
      case 'join-family':
        return <JoinFamilyStep />;
      default:
        return <ChooseStep />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.inputBackground }} edges={['top', 'left', 'right']}>
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
    </SafeAreaView>
  );
}