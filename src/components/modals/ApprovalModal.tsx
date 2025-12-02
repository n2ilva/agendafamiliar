import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APP_COLORS } from '../../constants/colors';
import { UserRole } from '../../types/family.types';
import { ThemeColors } from '../../contexts/theme.context';

interface AdminRoleRequest {
  id: string;
  requesterName: string;
  requestedAt?: Date | string;
}

interface ApprovalNotification {
  id: string;
  taskId: string;
  taskTitle: string;
  dependenteName: string;
  read: boolean;
}

interface TaskApproval {
  id: string;
  taskId: string;
  requestedAt?: Date | string;
}

interface Task {
  id: string;
  title: string;
}

interface ApprovalModalProps {
  visible: boolean;
  onClose: () => void;
  userRole: UserRole;
  adminRoleRequests: AdminRoleRequest[];
  notifications: ApprovalNotification[];
  approvals: TaskApproval[];
  tasks: Task[];
  resolvingAdminRequestId: string | null;
  onResolveAdminRequest: (requestId: string, approve: boolean) => void;
  onRejectTask: (approvalId: string, reason: string) => void;
  onApproveTask: (approvalId: string, message: string) => void;
  onMarkNotificationRead: (notificationId: string) => void;
  colors: ThemeColors;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  visible,
  onClose,
  userRole,
  adminRoleRequests,
  notifications,
  approvals,
  tasks,
  resolvingAdminRequestId,
  onResolveAdminRequest,
  onRejectTask,
  onApproveTask,
  onMarkNotificationRead,
  colors,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Solicitações de Aprovação</Text>

          {userRole === 'admin' && (
            <>
              {/* Seção: Solicitações para virar Admin */}
              <View style={{ paddingHorizontal: 4, marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
                  {adminRoleRequests.length > 0 ? `(${adminRoleRequests.length})` : ''}
                </Text>
                {adminRoleRequests.length === 0 ? (
                  <Text style={{ color: colors.textPrimary }}></Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {adminRoleRequests.map((req: AdminRoleRequest) => (
                      <View
                        key={req.id}
                        style={{
                          backgroundColor: colors.surface,
                          borderRadius: 10,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: colors.border
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary }}>
                          {req.requesterName}
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textPrimary, marginTop: 2 }}>
                          pediu para se tornar administrador
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textPrimary, marginTop: 6 }}>
                          {req.requestedAt
                            ? new Date(req.requestedAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                            : ''}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                          <Pressable
                            disabled={!!resolvingAdminRequestId}
                            onPress={() => onResolveAdminRequest(req.id, false)}
                            style={[
                              styles.approvalButton,
                              styles.rejectButton,
                              resolvingAdminRequestId === req.id && { opacity: 0.6 }
                            ]}
                          >
                            <Ionicons name="close-circle" size={20} color="#fff" />
                            <Text style={styles.approvalButtonText}>
                              {resolvingAdminRequestId === req.id ? 'Processando...' : 'Rejeitar'}
                            </Text>
                          </Pressable>
                          <Pressable
                            disabled={!!resolvingAdminRequestId}
                            onPress={() => onResolveAdminRequest(req.id, true)}
                            style={[
                              styles.approvalButton,
                              styles.approveButton,
                              resolvingAdminRequestId === req.id && { opacity: 0.6 }
                            ]}
                          >
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <Text style={styles.approvalButtonText}>
                              {resolvingAdminRequestId === req.id ? 'Processando...' : 'Aprovar'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <View style={{ height: 1, backgroundColor: '#eee', marginHorizontal: 4, marginBottom: 12 }} />
            </>
          )}

          {notifications.length === 0 ? (
            <Text style={[styles.noNotificationsText, { color: colors.textSecondary }]}>
              Nenhuma solicitação pendente
            </Text>
          ) : (
            <ScrollView
              style={styles.notificationsList}
              contentContainerStyle={{ paddingBottom: 80 }}
              showsVerticalScrollIndicator={true}
            >
              {notifications.map(notification => {
                const approval = approvals.find(a => a.taskId === notification.taskId);
                const task = tasks.find(t => t.id === notification.taskId);

                if (!approval || !task) return null;

                return (
                  <View key={notification.id} style={[styles.notificationItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.notificationTitle, { color: colors.textPrimary }]}>
                      {notification.dependenteName} quer completar:
                    </Text>
                    <Text style={[styles.notificationTaskTitle, { color: colors.textPrimary }]}>
                      "{notification.taskTitle}"
                    </Text>
                    <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
                      {approval.requestedAt
                        ? new Date(approval.requestedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                        : 'Data não disponível'}
                    </Text>

                    <View style={styles.approvalActions}>
                      <Pressable
                        style={[styles.approvalButton, styles.rejectButton]}
                        onPress={() => {
                          onRejectTask(approval.id, 'Rejeitado pelo administrador');
                          onMarkNotificationRead(notification.id);
                        }}
                      >
                        <Ionicons name="close-circle" size={20} color="#fff" />
                        <Text style={styles.approvalButtonText}>Rejeitar</Text>
                      </Pressable>

                      <Pressable
                        style={[styles.approvalButton, styles.approveButton]}
                        onPress={() => {
                          onApproveTask(approval.id, 'Aprovado pelo administrador');
                          onMarkNotificationRead(notification.id);
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.approvalButtonText}>Aprovar</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <Pressable
            style={[
              styles.closeButton,
              styles.closeButtonFixed,
              Platform.OS === 'web' && styles.closeButtonFixedWeb
            ]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: APP_COLORS.background.white,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  noNotificationsText: {
    textAlign: 'center',
    fontSize: 14,
    color: APP_COLORS.text.light,
    paddingVertical: 32,
  },
  notificationsList: {
    maxHeight: 400,
  },
  notificationItem: {
    backgroundColor: APP_COLORS.background.lightGray,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border.light,
  },
  notificationTitle: {
    fontSize: 14,
    marginBottom: 6,
  },
  notificationTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    marginBottom: 12,
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  approvalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
  },
  rejectButton: {
    backgroundColor: APP_COLORS.status.error,
  },
  approveButton: {
    backgroundColor: APP_COLORS.status.success,
  },
  approvalButtonText: {
    color: APP_COLORS.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: APP_COLORS.primary.main,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonFixed: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  closeButtonFixedWeb: {
    position: 'relative',
    bottom: 0,
    left: 0,
    right: 0,
  },
  closeButtonText: {
    color: APP_COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
