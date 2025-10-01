import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export const ConfiguracoesScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert(
      'Confirmar saída',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Erro', 'Não foi possível fazer logout');
            }
          },
        },
      ]
    );
  };

  const handleNavigateToFamily = () => {
    // This would navigate to family management screen
    Alert.alert('Em breve', 'Gerenciamento de família será implementado em breve');
  };

  const handleNavigateToProfile = () => {
    // This would navigate to profile screen
    Alert.alert('Em breve', 'Edição de perfil será implementada em breve');
  };

  const handleNavigateToNotifications = () => {
    // This would navigate to notifications settings
    Alert.alert('Em breve', 'Configurações de notificações serão implementadas em breve');
  };

  const handleNavigateToPrivacy = () => {
    // This would navigate to privacy settings
    Alert.alert('Em breve', 'Configurações de privacidade serão implementadas em breve');
  };

  const handleNavigateToHelp = () => {
    // This would navigate to help screen
    Alert.alert('Em breve', 'Central de ajuda será implementada em breve');
  };

  const handleNavigateToAbout = () => {
    navigation.navigate('Informacoes' as never);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configurações</Text>
        <Text style={styles.subtitle}>Gerencie suas preferências</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Conta</Text>

        <TouchableOpacity style={styles.menuItem} onPress={handleNavigateToProfile}>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemText}>Perfil</Text>
            <Text style={styles.menuItemSubtitle}>
              {user?.email || 'Email não disponível'}
            </Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleNavigateToFamily}>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemText}>Família</Text>
            <Text style={styles.menuItemSubtitle}>Gerenciar membros da família</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notificações</Text>

        <TouchableOpacity style={styles.menuItem} onPress={handleNavigateToNotifications}>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemText}>Notificações</Text>
            <Text style={styles.menuItemSubtitle}>Configurar alertas e lembretes</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.menuItem}>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemText}>Lembretes automáticos</Text>
            <Text style={styles.menuItemSubtitle}>Receber lembretes de tarefas</Text>
          </View>
          <Switch
            value={true}
            onValueChange={() => {}}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={'#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacidade</Text>

        <TouchableOpacity style={styles.menuItem} onPress={handleNavigateToPrivacy}>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemText}>Privacidade</Text>
            <Text style={styles.menuItemSubtitle}>Controle seus dados pessoais</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suporte</Text>

        <TouchableOpacity style={styles.menuItem} onPress={handleNavigateToHelp}>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemText}>Ajuda</Text>
            <Text style={styles.menuItemSubtitle}>Perguntas frequentes e tutoriais</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleNavigateToAbout}>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuItemText}>Sobre</Text>
            <Text style={styles.menuItemSubtitle}>Versão do app e informações</Text>
          </View>
          <Text style={styles.menuItemArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.version}>
        <Text style={styles.versionText}>Agenda Familiar v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  menuItemArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    alignItems: 'center',
    padding: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#999',
  },
});