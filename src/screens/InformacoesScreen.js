import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const InformacoesScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Informações</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Como Usar o App</Text>
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>✨ Principais Funcionalidades:</Text>
            
            <View style={styles.infoItem}>
              <Ionicons name="people" size={18} color="#007AFF" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>Sistema de Família</Text>
                <Text style={styles.infoItemDesc}>Conecte sua família usando a chave única de 8 caracteres. Todos os membros veem e podem gerenciar as mesmas tarefas.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="checkbox" size={18} color="#28a745" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>Gerenciar Tarefas</Text>
                <Text style={styles.infoItemDesc}>Crie, edite e organize tarefas com categorias, datas/horários e repetições. Marque como concluída ao finalizar.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={18} color="#fd7e14" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>Calendário Inteligente</Text>
                <Text style={styles.infoItemDesc}>Use o calendário visual para agendar tarefas com data e hora específicas. Interface fácil de usar.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="checkmark-done" size={18} color="#6f42c1" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>Aprovação para Crianças</Text>
                <Text style={styles.infoItemDesc}>Tarefas de crianças precisam ser aprovadas por adultos. Acesse "Aprovações" para revisar.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="time" size={18} color="#dc3545" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>Histórico Completo</Text>
                <Text style={styles.infoItemDesc}>Veja todas as tarefas concluídas com data, hora e quem completou. Histórico sempre disponível.</Text>
              </View>
            </View>

            <View style={styles.tipBox}>
              <Ionicons name="bulb" size={20} color="#ffc107" />
              <Text style={styles.tipText}>
                <Text style={styles.tipTitle}>Dica: </Text>
                Administradores podem gerenciar membros da família e aprovar tarefas. Use categorias coloridas para organizar melhor suas atividades!
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Tipos de Usuário</Text>
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark" size={18} color="#dc3545" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>👑 Administrador</Text>
                <Text style={styles.infoItemDesc}>Controle total: gerenciar membros da família, aprovar tarefas, criar/editar/excluir qualquer tarefa.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="person" size={18} color="#007AFF" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>👤 Usuário Comum</Text>
                <Text style={styles.infoItemDesc}>Pode criar, editar e gerenciar suas próprias tarefas. Pode ver tarefas de toda a família.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="happy" size={18} color="#28a745" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>🧒 Criança</Text>
                <Text style={styles.infoItemDesc}>Pode marcar tarefas como concluídas, mas precisa de aprovação de um adulto para validação.</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 Como Começar</Text>
          <View style={styles.infoSection}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Faça login com sua conta Google</Text>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>Selecione seu tipo de usuário</Text>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Crie uma família nova ou entre com a chave</Text>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>Comece a criar e organizar suas tarefas!</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ Sobre o App</Text>
          <View style={styles.aboutSection}>
            <Text style={styles.aboutText}>
              <Text style={styles.appName}>Agenda Familiar</Text> foi desenvolvida para ajudar famílias a se organizarem melhor, 
              compartilhando tarefas e responsabilidades de forma colaborativa.
            </Text>
            <Text style={styles.aboutText}>
              Desenvolvido com React Native e Expo, o app funciona em iOS, Android e Web, 
              mantendo todos sincronizados com as mesmas informações.
            </Text>
            <Text style={styles.versionText}>Versão 1.0 - Setembro 2025</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: {
    padding: 5,
  },
  placeholder: {
    width: 34,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
  },
  infoItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  infoItemDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  tipTitle: {
    fontWeight: '600',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  aboutSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  appName: {
    fontWeight: '700',
    color: '#007AFF',
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});

export default InformacoesScreen;