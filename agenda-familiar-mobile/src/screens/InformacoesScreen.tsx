import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';

export const InformacoesScreen: React.FC = () => {
  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sobre o App</Text>
        <Text style={styles.subtitle}>Agenda Familiar</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Versão</Text>
        <Text style={styles.versionText}>1.0.0</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Descrição</Text>
        <Text style={styles.descriptionText}>
          Agenda Familiar é um aplicativo desenvolvido para ajudar famílias a organizarem
          suas tarefas diárias de forma colaborativa e eficiente. Com ele, você pode criar,
          gerenciar e acompanhar tarefas compartilhadas entre os membros da família.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Funcionalidades</Text>
        <View style={styles.featuresList}>
          <Text style={styles.featureItem}>• ✅ Criação e gerenciamento de tarefas</Text>
          <Text style={styles.featureItem}>• 👨‍👩‍👧‍👦 Organização familiar com códigos únicos</Text>
          <Text style={styles.featureItem}>• 📱 Interface mobile otimizada</Text>
          <Text style={styles.featureItem}>• 🔒 Autenticação segura com Firebase</Text>
          <Text style={styles.featureItem}>• 📊 Acompanhamento de progresso</Text>
          <Text style={styles.featureItem}>• 📅 Sistema de datas e categorias</Text>
          <Text style={styles.featureItem}>• 🔔 Notificações e lembretes</Text>
          <Text style={styles.featureItem}>• 📈 Histórico de tarefas concluídas</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tecnologias Utilizadas</Text>
        <View style={styles.techList}>
          <Text style={styles.techItem}>• React Native com Expo</Text>
          <Text style={styles.techItem}>• Firebase (Auth, Firestore)</Text>
          <Text style={styles.techItem}>• TypeScript</Text>
          <Text style={styles.techItem}>• React Navigation</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contato</Text>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => handleOpenLink('mailto:suporte@agendafamiliar.com')}
        >
          <Text style={styles.contactText}>📧 suporte@agendafamiliar.com</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Links Úteis</Text>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => handleOpenLink('https://github.com/n2ilva/agenda-familiar')}
        >
          <Text style={styles.linkText}>🐙 Repositório no GitHub</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => handleOpenLink('https://agendafamiliar.com')}
        >
          <Text style={styles.linkText}>🌐 Site oficial</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacidade e Termos</Text>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => handleOpenLink('https://agendafamiliar.com/privacy')}
        >
          <Text style={styles.linkText}>🔒 Política de Privacidade</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => handleOpenLink('https://agendafamiliar.com/terms')}
        >
          <Text style={styles.linkText}>📋 Termos de Uso</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2024 Agenda Familiar. Todos os direitos reservados.
        </Text>
        <Text style={styles.footerSubtext}>
          Desenvolvido com ❤️ para famílias
        </Text>
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
    alignItems: 'center',
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
    fontSize: 18,
    color: '#007AFF',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  versionText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  featuresList: {
    marginTop: 8,
  },
  featureItem: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 22,
  },
  techList: {
    marginTop: 8,
  },
  techItem: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 22,
  },
  contactButton: {
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 16,
    color: '#007AFF',
  },
  linkButton: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  linkText: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});