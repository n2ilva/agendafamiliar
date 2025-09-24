import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

const ManageFamilyModal = ({ visible, onClose }) => {
  const { family, updateFamily, user } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState(family?.name || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateFamilyName = async () => {
    if (!newFamilyName.trim()) {
      Alert.alert('Erro', 'O nome da família não pode estar vazio');
      return;
    }

    setIsLoading(true);
    try {
      const updatedFamily = { ...family, name: newFamilyName.trim() };
      await updateFamily(updatedFamily);
      setIsEditingName(false);
      Alert.alert('Sucesso', 'Nome da família atualizado com sucesso!');
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareFamilyKey = () => {
    Alert.alert(
      'Chave da Família',
      `Chave: ${family.key}\n\nCompartilhe esta chave com pessoas que você deseja convidar para a família.`,
      [
        {
          text: 'Copiar',
          onPress: () => {
            // TODO: Implementar cópia para clipboard
            Alert.alert('Chave copiada!', `Chave: ${family.key}`);
          },
        },
        { text: 'OK' },
      ]
    );
  };

  const handleClose = () => {
    if (!isLoading) {
      setIsEditingName(false);
      setNewFamilyName(family?.name || '');
      onClose();
    }
  };

  if (!family) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>👨‍👩‍👧‍👦 Gerenciar Família</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={isLoading}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Nome da Família */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nome da Família</Text>
              {isEditingName ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.input}
                    value={newFamilyName}
                    onChangeText={setNewFamilyName}
                    placeholder="Nome da família"
                    maxLength={50}
                    editable={!isLoading}
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      onPress={() => {
                        setIsEditingName(false);
                        setNewFamilyName(family.name);
                      }}
                      style={[styles.editButton, styles.cancelEditButton]}
                      disabled={isLoading}
                    >
                      <Ionicons name="close" size={16} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleUpdateFamilyName}
                      style={[styles.editButton, styles.saveEditButton]}
                      disabled={isLoading || !newFamilyName.trim()}
                    >
                      <Ionicons name="checkmark" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.nameContainer}
                  onPress={() => setIsEditingName(true)}
                >
                  <Text style={styles.familyName}>{family.name}</Text>
                  <Ionicons name="pencil" size={16} color="#007AFF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Chave da Família */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chave da Família</Text>
              <View style={styles.keyContainer}>
                <Text style={styles.familyKey}>{family.key}</Text>
                <TouchableOpacity
                  onPress={handleShareFamilyKey}
                  style={styles.shareButton}
                >
                  <Ionicons name="share-outline" size={16} color="#007AFF" />
                  <Text style={styles.shareButtonText}>Compartilhar</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.keyHelp}>
                Use esta chave para convidar novos membros para a família
              </Text>
            </View>

            {/* Membros da Família */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Membros ({family.members.length})</Text>
              {family.members.map((member) => (
                <View key={member.id} style={styles.memberItem}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberEmail}>{member.email}</Text>
                    <Text style={styles.memberType}>
                      {member.isAdmin ? 'Administrador' : 'Membro'}
                    </Text>
                  </View>
                  {member.id === user.id && (
                    <View style={styles.currentUserBadge}>
                      <Text style={styles.currentUserText}>Você</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Estatísticas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estatísticas</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{family.members.length}</Text>
                  <Text style={styles.statLabel}>Membros</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {new Date(family.createdAt).toLocaleDateString('pt-BR')}
                  </Text>
                  <Text style={styles.statLabel}>Criada em</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.button, styles.closeButton]}
              disabled={isLoading}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  familyName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 5,
  },
  input: {
    flex: 1,
    padding: 10,
    fontSize: 16,
    backgroundColor: 'white',
    borderRadius: 6,
    marginRight: 10,
  },
  editActions: {
    flexDirection: 'row',
  },
  editButton: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  cancelEditButton: {
    backgroundColor: '#f0f0f0',
  },
  saveEditButton: {
    backgroundColor: '#34C759',
  },
  keyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
  },
  familyKey: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  keyHelp: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  memberEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  memberType: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
    marginTop: 2,
  },
  currentUserBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentUserText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actions: {
    padding: 20,
    paddingTop: 10,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    backgroundColor: '#f0f0f0',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default ManageFamilyModal;