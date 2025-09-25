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
          <Text style={styles.sectionTitle}>📱 Como Funciona o Agenda Familiar</Text>
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>✨ O que você pode fazer no app:</Text>

            <View style={styles.infoItem}>
              <Ionicons name="people" size={18} color="#007AFF" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>👨‍👩‍👧‍👦 Sistema Familiar Colaborativo</Text>
                <Text style={styles.infoItemDesc}>Conecte toda sua família usando uma chave única de 8 caracteres. Todos os membros veem as mesmas tarefas em tempo real e podem contribuir para a organização da casa.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="create" size={18} color="#28a745" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>📝 Criar Tarefas Personalizadas</Text>
                <Text style={styles.infoItemDesc}>Adicione tarefas com título, descrição detalhada, categoria colorida, data/hora específica e configurações de repetição (diária, semanal ou nunca).</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={18} color="#fd7e14" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>📅 Agendamento Inteligente</Text>
                <Text style={styles.infoItemDesc}>Use o calendário integrado para agendar tarefas em datas específicas. Configure lembretes automáticos e veja todas as tarefas organizadas cronologicamente.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="notifications" size={18} color="#dc3545" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>🔔 Notificações Automáticas</Text>
                <Text style={styles.infoItemDesc}>Receba lembretes quando tarefas estiverem próximas do vencimento. Notificações especiais para tarefas atrasadas e aprovações pendentes.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="filter" size={18} color="#6f42c1" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>🔍 Filtros e Organização</Text>
                <Text style={styles.infoItemDesc}>Filtre tarefas por status (pendentes, concluídas, atrasadas), categoria ou membro da família. Visualize apenas o que importa no momento.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="checkmark-done" size={18} color="#20c997" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>✅ Sistema de Aprovação</Text>
                <Text style={styles.infoItemDesc}>Crianças podem marcar tarefas como concluídas, mas precisam da aprovação de adultos. Administradores revisam e validam as atividades realizadas.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="time" size={18} color="#e83e8c" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>📊 Histórico Completo</Text>
                <Text style={styles.infoItemDesc}>Acompanhe todas as tarefas já realizadas com data, hora e quem executou. Perfeito para acompanhar o progresso e responsabilidades.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="stats-chart" size={18} color="#17a2b8" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>📈 Barra de Progresso Visual</Text>
                <Text style={styles.infoItemDesc}>Veja o progresso geral das tarefas com uma barra intuitiva que mostra quantas foram concluídas, quantas estão pendentes e aguardando aprovação.</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="sync" size={18} color="#ffc107" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoItemTitle}>🔄 Sincronização Automática</Text>
                <Text style={styles.infoItemDesc}>Todas as mudanças são sincronizadas automaticamente entre todos os dispositivos da família. Funciona offline e sincroniza quando conectar.</Text>
              </View>
            </View>

            <View style={styles.tipBox}>
              <Ionicons name="bulb" size={20} color="#ffc107" />
              <Text style={styles.tipText}>
                <Text style={styles.tipTitle}>💡 Dicas de Uso: </Text>
                Use categorias coloridas para organizar tarefas por tipo (casa, escola, lazer). Configure repetições para tarefas diárias como "arrumar o quarto" ou "escovar os dentes". Administradores podem gerenciar membros e aprovar atividades das crianças!
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
          <Text style={styles.sectionTitle}>� Funcionalidades Avançadas</Text>
          <View style={styles.infoSection}>
            <View style={styles.featureGroup}>
              <Text style={styles.featureGroupTitle}>📋 Gerenciamento de Tarefas</Text>

              <View style={styles.subFeature}>
                <Ionicons name="add-circle" size={16} color="#007AFF" style={styles.subIcon} />
                <Text style={styles.subFeatureText}>
                  <Text style={styles.subFeatureTitle}>Criar Tarefa: </Text>
                  Toque no botão "+" para adicionar título, descrição, categoria, data/hora e repetição
                </Text>
              </View>

              <View style={styles.subFeature}>
                <Ionicons name="pencil" size={16} color="#28a745" style={styles.subIcon} />
                <Text style={styles.subFeatureText}>
                  <Text style={styles.subFeatureTitle}>Editar: </Text>
                  Pressione e segure uma tarefa para editar ou excluir
                </Text>
              </View>

              <View style={styles.subFeature}>
                <Ionicons name="checkmark-circle" size={16} color="#20c997" style={styles.subIcon} />
                <Text style={styles.subFeatureText}>
                  <Text style={styles.subFeatureTitle}>Concluir: </Text>
                  Marque o checkbox para completar. Crianças precisam de aprovação
                </Text>
              </View>
            </View>

            <View style={styles.featureGroup}>
              <Text style={styles.featureGroupTitle}>👥 Gerenciamento Familiar</Text>

              <View style={styles.subFeature}>
                <Ionicons name="person-add" size={16} color="#fd7e14" style={styles.subIcon} />
                <Text style={styles.subFeatureText}>
                  <Text style={styles.subFeatureTitle}>Criar Família: </Text>
                  Como administrador, crie uma nova família com chave única
                </Text>
              </View>

              <View style={styles.subFeature}>
                <Ionicons name="enter" size={16} color="#6f42c1" style={styles.subIcon} />
                <Text style={styles.subFeatureText}>
                  <Text style={styles.subFeatureTitle}>Entrar na Família: </Text>
                  Use a chave de 8 caracteres para se juntar a uma família existente
                </Text>
              </View>

              <View style={styles.subFeature}>
                <Ionicons name="settings" size={16} color="#dc3545" style={styles.subIcon} />
                <Text style={styles.subFeatureText}>
                  <Text style={styles.subFeatureTitle}>Gerenciar Membros: </Text>
                  Administradores podem remover membros ou alterar permissões
                </Text>
              </View>
            </View>

            <View style={styles.featureGroup}>
              <Text style={styles.featureGroupTitle}>🔔 Sistema de Notificações</Text>

              <View style={styles.subFeature}>
                <Ionicons name="alarm" size={16} color="#e83e8c" style={styles.subIcon} />
                <Text style={styles.subFeatureText}>
                  <Text style={styles.subFeatureTitle}>Lembretes: </Text>
                  Notificações automáticas antes do vencimento das tarefas
                </Text>
              </View>

              <View style={styles.subFeature}>
                <Ionicons name="warning" size={16} color="#ffc107" style={styles.subIcon} />
                <Text style={styles.subFeatureText}>
                  <Text style={styles.subFeatureTitle}>Tarefas Atrasadas: </Text>
                  Alertas especiais para tarefas que passaram do prazo
                </Text>
              </View>

              <View style={styles.subFeature}>
                <Ionicons name="shield-checkmark" size={16} color="#17a2b8" style={styles.subIcon} />
                <Text style={styles.subFeatureText}>
                  <Text style={styles.subFeatureTitle}>Aprovações Pendentes: </Text>
                  Notificações para administradores sobre tarefas aguardando validação
                </Text>
              </View>
            </View>

            <View style={styles.featureGroup}>
              <Text style={styles.featureGroupTitle}>📊 Acompanhamento e Relatórios</Text>

              <View style={styles.subFeature}>
                <Ionicons name="bar-chart" size={16} color="#007AFF" style={styles.subIcon} />
                <Text style={styles.subFeatureText}>
                  <Text style={styles.subFeatureTitle}>Barra de Progresso: </Text>
                  Visualize o progresso geral com estatísticas visuais intuitivas
                </Text>
              </View>

              <View style={styles.subFeature}>
                <Ionicons name="filter" size={16} color="#28a745" style={styles.subIcon} />
                <Text style={styles.subFeatureText}>
                  <Text style={styles.subFeatureTitle}>Filtros Avançados: </Text>
                  Filtre por status, categoria, membro ou data para focar no que importa
                </Text>
              </View>

              <View style={styles.subFeature}>
                <Ionicons name="document-text" size={16} color="#fd7e14" style={styles.subIcon} />
                <Text style={styles.subFeatureText}>
                  <Text style={styles.subFeatureTitle}>Histórico Detalhado: </Text>
                  Veja quem fez o quê e quando, com registros completos de todas as atividades
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>�🚀 Como Começar</Text>
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
          <Text style={styles.sectionTitle}>ℹ️ Sobre o Agenda Familiar</Text>
          <View style={styles.aboutSection}>
            <Text style={styles.aboutText}>
              <Text style={styles.appName}>Agenda Familiar</Text> é um aplicativo completo para organização familiar que transforma a gestão de tarefas domésticas em uma experiência colaborativa e divertida.
            </Text>

            <Text style={styles.aboutText}>
              Desenvolvido com as tecnologias mais modernas - React Native e Expo - o app funciona perfeitamente em iOS, Android e Web, mantendo todos os membros da família sincronizados em tempo real através do Firebase.
            </Text>

            <Text style={styles.aboutText}>
              Seja para organizar tarefas diárias como "arrumar o quarto" ou "fazer o dever de casa", planejar eventos especiais da família, ou simplesmente manter todos na mesma página, o Agenda Familiar oferece todas as ferramentas necessárias para uma casa mais organizada e harmoniosa.
            </Text>

            <View style={styles.techStack}>
              <Text style={styles.techTitle}>🛠️ Tecnologias Utilizadas:</Text>
              <Text style={styles.techItem}>• React Native & Expo (Interface multiplataforma)</Text>
              <Text style={styles.techItem}>• Firebase (Autenticação e banco de dados em tempo real)</Text>
              <Text style={styles.techItem}>• AsyncStorage (Armazenamento local offline)</Text>
              <Text style={styles.techItem}>• Expo Notifications (Sistema de notificações)</Text>
              <Text style={styles.techItem}>• Google OAuth (Login seguro)</Text>
            </View>

            <Text style={styles.versionText}>Versão 1.0 - Outubro 2025</Text>
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
  featureGroup: {
    marginBottom: 20,
  },
  featureGroupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subFeature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    marginLeft: 10,
  },
  subIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  subFeatureText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  subFeatureTitle: {
    fontWeight: '600',
    color: '#333',
  },
  techStack: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  techTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 8,
  },
  techItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },
});

export default InformacoesScreen;