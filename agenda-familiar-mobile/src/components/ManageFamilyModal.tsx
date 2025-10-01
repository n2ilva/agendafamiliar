import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
  Share,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { familyService, Family } from '../services/familyService';

interface ManageFamilyModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const ManageFamilyModal: React.FC<ManageFamilyModalProps> = ({
  visible,
  onClose,
  onUpdate,
}) => {
  const { user } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && user) {
      loadFamilyData();
    }
  }, [visible, user]);

  const loadFamilyData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // For now, we'll need to get family data from user profile or search
      // This is a simplified version - in a real app you'd store family ID in user profile
      // For demo purposes, we'll show a placeholder
      setFamily(null);
    } catch (error) {
      console.error('Error loading family:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShareCode = async () => {
    if (!family) return;

    try {
      await Share.share({
        message: `Entre na minha família "${family.name}" usando o código: ${family.code}`,
        title: 'Código da Família',
      });
    } catch (error) {
      console.error('Error sharing code:', error);
    }
  };

  const handleLeaveFamily = () => {
    if (!family || !user) return;

    if (family.adminId === user.uid) {
      Alert.alert(
        'Não é possível sair',
        'Como administrador da família, você não pode sair. Transfira a administração para outro membro primeiro ou exclua a família.'
      );
      return;
    }

    Alert.alert(
      'Confirmar saída',
      'Tem certeza que deseja sair desta família? Você perderá acesso a todas as tarefas compartilhadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await familyService.leaveFamily(family.id!, user.uid);
              Alert.alert('Sucesso', 'Você saiu da família com sucesso');
              onUpdate();
              onClose();
            } catch (error) {
              console.error('Error leaving family:', error);
              Alert.alert('Erro', 'Não foi possível sair da família');
            }
          },
        },
      ]
    );
  };

  const handleDeleteFamily = () => {
    if (!family || !user) return;

    if (family.adminId !== user.uid) {
      Alert.alert('Erro', 'Apenas o administrador pode excluir a família');
      return;
    }

    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta família? Esta ação não pode ser desfeita e todos os membros perderão acesso.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await familyService.deleteFamily(family.id!);
              Alert.alert('Sucesso', 'Família excluída com sucesso');
              onUpdate();
              onClose();
            } catch (error) {
              console.error('Error deleting family:', error);
              Alert.alert('Erro', 'Não foi possível excluir a família');
            }
          },
        },
      ]
    );
  };

  const renderMember = ({ item, index }: { item: string; index: number }) => {
    const isAdmin = family?.adminId === item;
    const isCurrentUser = user?.uid === item;

    return (
      <View style={styles.memberItem}>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {isCurrentUser ? 'Você' : `Membro ${index + 1}`}
            {isAdmin && ' (Admin)'}
          </Text>
          {isCurrentUser && (
            <Text style={styles.currentUserBadge}>Você</Text>
          )}
        </View>
        {isAdmin && (
          <View style={styles.adminBadge}>
            <Text style={styles.adminText}>👑</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Gerenciar Família</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {loading ? (
              <View style={styles.centerContent}>
                <Text>Carregando...</Text>
              </View>
            ) : family ? (
              <>
                <View style={styles.familyInfo}>
                  <Text style={styles.familyName}>{family.name}</Text>
                  <View style={styles.codeContainer}>
                    <Text style={styles.codeLabel}>Código:</Text>
                    <Text style={styles.code}>{family.code}</Text>
                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={handleShareCode}
                    >
                      <Text style={styles.shareText}>📤</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Membros ({family.members.length}/{10})
                  </Text>
                  <FlatList
                    data={family.members}
                    keyExtractor={(item) => item}
                    renderItem={renderMember}
                    style={styles.membersList}
                  />
                </View>

                <View style={styles.actions}>
                  {family.adminId === user?.uid && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={handleDeleteFamily}
                    >
                      <Text style={styles.deleteText}>Excluir Família</Text>
                    </TouchableOpacity>
                  )}

                  {family.adminId !== user?.uid && (
                    <TouchableOpacity
                      style={styles.leaveButton}
                      onPress={handleLeaveFamily}
                    >
                      <Text style={styles.leaveText}>Sair da Família</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.centerContent}>
                <Text style={styles.noFamilyText}>
                  Você ainda não faz parte de uma família
                </Text>
                <Text style={styles.noFamilySubtext}>
                  Crie uma nova família ou entre em uma existente usando um código
                </Text>
              </View>
            )}
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
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 24,
    color: '#666',
  },
  content: {
    padding: 20,
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  familyInfo: {
    marginBottom: 20,
  },
  familyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
  },
  codeLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  code: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  shareButton: {
    padding: 4,
  },
  shareText: {
    fontSize: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  membersList: {
    maxHeight: 200,
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 16,
    color: '#333',
  },
  currentUserBadge: {
    backgroundColor: '#007AFF',
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  adminBadge: {
    padding: 4,
  },
  adminText: {
    fontSize: 16,
  },
  actions: {
    marginTop: 20,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  leaveButton: {
    backgroundColor: '#ffc107',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  leaveText: {
    color: '#212529',
    fontSize: 16,
    fontWeight: '600',
  },
  noFamilyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  noFamilySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});