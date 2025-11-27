import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
    Task,
    FamilyUser,
    RepeatType,
    RepeatConfig,
    CategoryConfig,
    MemberPermissions,
} from '../../../types/family.types';
import { getRepeat } from '../../../utils/validators/task.utils';
import { APP_COLORS, CATEGORY_COLORS } from '../../../constants/colors';

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const getRepeatText = (repeatConfig: RepeatConfig): string => {
    switch (repeatConfig.type) {
        case RepeatType.NONE:
            return '';
        case RepeatType.DAILY:
            return 'Todos os dias';
        case RepeatType.WEEKENDS:
            return 'Fins de semana';
        case RepeatType.CUSTOM: {
            const days = repeatConfig.days?.slice().sort((a, b) => a - b) || [];
            if (!days.length) return 'Recorrente';
            const labels = days.map(dayIndex => WEEKDAY_LABELS[dayIndex % 7]);
            return `Dias: ${labels.join(', ')}`;
        }
        case RepeatType.MONTHLY:
            return 'Mensal';
        case RepeatType.INTERVAL: {
            const interval = repeatConfig.intervalDays || 1;
            return `A cada ${interval} dia${interval > 1 ? 's' : ''}`;
        }
        default:
            return 'Recorrente';
    }
};

interface TaskItemProps {
    item: Task;
    user: { id: string; name: string; role: 'admin' | 'dependente' };
    activeTheme: string;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onToggle: () => void;
    onToggleSubtask: (subtaskId: string, categoryId?: string) => void;
    onToggleLock: () => void;
    onPostpone: () => void;
    onEdit: () => void;
    onDelete: () => void;
    activeTab: 'today' | 'upcoming';
    familyMembers: FamilyUser[];
    myEffectivePerms?: MemberPermissions | null;
}

export const TaskItem: React.FC<TaskItemProps> = ({
    item,
    user,
    activeTheme,
    isCollapsed,
    onToggleCollapse,
    onToggle,
    onToggleSubtask,
    onToggleLock,
    onPostpone,
    onEdit,
    onDelete,
    activeTab,
    familyMembers,
    myEffectivePerms,
}) => {
    const styles = useMemo(() => getStyles(activeTheme), [activeTheme]);
    const repeatConfig = useMemo(() => getRepeat(item), [item]);

    // Verificar se a tarefa está vencida
    const isOverdue = useMemo(() => {
        if (item.completed) return false;
        if (!item.dueDate) return false;
        const now = new Date();
        const due = new Date(item.dueDate);
        if (item.dueTime) {
            const dueTime = new Date(item.dueTime);
            due.setHours(dueTime.getHours(), dueTime.getMinutes(), dueTime.getSeconds());
        } else {
            due.setHours(23, 59, 59, 999);
        }
        return due < now;
    }, [item.completed, item.dueDate, item.dueTime]);

    // Determinar se a tarefa está desbloqueada
    const isTaskUnlocked = (item as any).unlocked === true;

    // Determinar se é aba "Próximas"
    const isUpcomingTab = activeTab === 'upcoming';

    // Determinar se a tarefa é recorrente e está completa mas ainda futura
    const isPendingRecurring = item.completed && repeatConfig.type !== RepeatType.NONE && isUpcomingTab;

// Determinar se o checkbox deve ser desabilitado
const shouldDisableCheckbox = useMemo(() => {
    // Se for aba "Próximas" e a tarefa não estiver desbloqueada, desabilitar
    if (isUpcomingTab && !isTaskUnlocked) return true;
    return false;
}, [isUpcomingTab, isTaskUnlocked]);

// Sanitizar strings para evitar XSS
const sanitizedTitle = useMemo(() => {
    return (item.title || '').replace(/<[^>]*>/g, '');
}, [item.title]);

const sanitizedDescription = useMemo(() => {
    return (item.description || '').replace(/<[^>]*>/g, '');
}, [item.description]);

const sanitizedCreatedByName = useMemo(() => {
    return (item.createdByName || '').replace(/<[^>]*>/g, '');
}, [item.createdByName]);

const sanitizedEditedByName = useMemo(() => {
    return (item.editedByName || '').replace(/<[^>]*>/g, '');
}, [item.editedByName]);

// Configuração da categoria
    const categoryConfig: CategoryConfig = useMemo(() => {
        const categoryId = item.category;
        const categoryData = CATEGORY_COLORS[categoryId as keyof typeof CATEGORY_COLORS];
        
        if (categoryData) {
            return {
                id: categoryId,
                name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
                icon: categoryData.icon,
                color: categoryData.color,
                bgColor: categoryData.bgColor,
                isDefault: true,
            };
        }
        
        // Fallback para categoria padrão
        return {
            id: 'trabalho',
            name: 'Trabalho',
            icon: 'briefcase',
            color: CATEGORY_COLORS.trabalho.color,
            bgColor: CATEGORY_COLORS.trabalho.bgColor,
            isDefault: true,
        };
    }, [item.category]);// Funções de formatação
const formatDate = (date: Date | string | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
};

const formatTime = (time: Date | string | undefined): string => {
    if (!time) return '';
    const t = new Date(time);
    const hours = String(t.getHours()).padStart(2, '0');
    const minutes = String(t.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const formatDateTime = (dateTime: Date | string | undefined): string => {
    if (!dateTime) return '';
    const dt = new Date(dateTime);
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const hours = String(dt.getHours()).padStart(2, '0');
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
};

return (
    <View style={[
        styles.taskItem,
        item.completed && styles.taskCompleted,
        isOverdue && styles.taskOverdue
    ]}>
        {/* Cabeçalho da Categoria */}
        <Pressable
            style={styles.categoryHeader}
            onPress={onToggleCollapse}
        >
            <View style={styles.categoryHeaderContent}>
                <Ionicons
                    name={categoryConfig.icon as any}
                    size={14}
                    color={categoryConfig.color}
                />
                <Text style={[styles.categoryHeaderText, { color: categoryConfig.color }]}>
                    {categoryConfig.name}
                </Text>
                {repeatConfig.type !== RepeatType.NONE && (
                    <Ionicons
                        name="repeat"
                        size={12}
                        color={categoryConfig.color}
                        style={{ marginLeft: 4 }}
                    />
                )}
            </View>
            {/* Lado direito do header: cadeado (se privado) + botão de expandir */}
            <View style={styles.categoryHeaderRight}>
                {((item as any).private === true) && item.createdBy === user.id && (
                    <Ionicons name="lock-closed" size={14} color={APP_COLORS.text.secondary} />
                )}
                <Ionicons
                    name={isCollapsed ? "chevron-down-outline" : "chevron-up-outline"}
                    size={16}
                    color={categoryConfig.color}
                />
            </View>
        </Pressable>

        {/* Conteúdo Principal da Tarefa */}
        <View style={styles.taskCardHeader}>
            <View style={styles.taskMainContent}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
                    <Pressable
                        onPress={onToggle}
                        style={[styles.checkboxContainer, { flex: 1 }]}
                        disabled={isPendingRecurring || shouldDisableCheckbox}
                    >
                        <View style={[
                            styles.checkbox,
                            item.completed && styles.checkboxCompleted,
                            (isPendingRecurring || shouldDisableCheckbox) && styles.checkboxDisabled
                        ]}>
                            {item.completed && (
                                <Ionicons name="checkmark" size={18} color={APP_COLORS.text.white} />
                            )}
                        </View>
                        <Text style={styles.taskTitle}>
                            {sanitizedTitle || 'Sem título'}
                        </Text>
                        {sanitizedDescription && (
                            <Text style={[
                                styles.taskDescription,
                                item.completed && styles.taskDescriptionCompleted
                            ]}>
                                {sanitizedDescription}
                            </Text>
                        )}
                    </Pressable>

                    {/* Botões de ação rápida (admin apenas) */}
                    {!item.completed && user.role === 'admin' && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {/* Ícone de Bloquear/Desbloquear - apenas na aba Próximas */}
                            {isUpcomingTab && (
                                <Pressable
                                    onPress={onToggleLock}
                                    style={styles.unlockIconButton}
                                >
                                    <Ionicons
                                        name={isTaskUnlocked ? "lock-open-outline" : "lock-closed-outline"}
                                        size={22}
                                        color={isTaskUnlocked ? APP_COLORS.primary.main : APP_COLORS.text.light}
                                    />
                                </Pressable>
                            )}

                            {/* Ícone de Adiar - visível em todas as abas */}
                            <Pressable
                                onPress={onPostpone}
                                style={styles.unlockIconButton}
                            >
                                <Ionicons
                                    name="calendar-outline"
                                    size={22}
                                    color={APP_COLORS.text.light}
                                />
                            </Pressable>
                        </View>
                    )}
                </View>
            </View>
        </View>

        {/* Informações de Agendamento */}
        <View style={styles.scheduleInfo}>
            {(item.dueTime || item.dueDate) && (
                <View style={styles.scheduleItem}>
                    <Ionicons
                        name="time-outline"
                        size={14}
                        color={isOverdue ? APP_COLORS.status.error : APP_COLORS.text.secondary}
                    />
                    <Text style={[styles.scheduleText, isOverdue && styles.overdueText]}>
                        {item.dueDate ? `${formatDate(item.dueDate)} ` : ''}{formatTime(item.dueTime)}
                    </Text>
                </View>
            )}

            {/* Indicador de tarefa vencida na mesma linha dos chips de data */}
            {isOverdue && (
                <View style={styles.overdueIndicator}>
                    <Ionicons name="warning" size={14} color={APP_COLORS.status.error} />
                    <Text style={styles.overdueLabel}>VENCIDA</Text>
                </View>
            )}

            {repeatConfig.type !== RepeatType.NONE && (
                <View style={styles.scheduleItem}>
                    <Ionicons
                        name="repeat"
                        size={14}
                        color={APP_COLORS.text.secondary}
                    />
                    <Text style={styles.scheduleText}>
                        {getRepeatText(repeatConfig)}
                    </Text>
                </View>
            )}
        </View>

        {/* Conteúdo Expandido (oculto quando colapsado) */}
        {!isCollapsed && (
            <>
                {/* Subtarefas no card */}
                {Array.isArray((item as any).subtasks) && (item as any).subtasks.length > 0 && (
                    <View style={{ paddingHorizontal: 12, paddingBottom: 8, gap: 6 }}>
                        {(item as any).subtasks.map((st: any) => (
                            <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Pressable
                                    onPress={() => onToggleSubtask(st.id)}
                                    style={[
                                        styles.checkbox,
                                        st.done && styles.checkboxCompleted,
                                        shouldDisableCheckbox && styles.checkboxDisabled
                                    ]}
                                    disabled={shouldDisableCheckbox}
                                >
                                    {st.done && <Ionicons name="checkmark" size={16} color={APP_COLORS.text.white} />}
                                </Pressable>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.taskDescription, st.done && styles.taskDescriptionCompleted, { flexShrink: 1 }]}>
                                            {st.title || 'Subtarefa'}
                                        </Text>
                                        {st.done && st.completedByName && (
                                            <Text style={[styles.authorshipText, { fontSize: 10, marginLeft: 8 }]}>
                                                {`por ${st.completedByName}`}
                                            </Text>
                                        )}
                                    </View>
                                    {/* Horário da subtarefa */}
                                    {(st.dueTime || st.dueDate) && (
                                        <View style={styles.subtaskScheduleInfo}>
                                            <Ionicons name="time-outline" size={12} color={APP_COLORS.text.light} />
                                            <Text style={styles.subtaskScheduleText}>
                                                {st.dueDate ? `${formatDate(st.dueDate)} ` : ''}{formatTime(st.dueTime)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Categorias de Subtarefas no card */}
                {Array.isArray((item as any).subtaskCategories) && (item as any).subtaskCategories.length > 0 && (
                    <View style={{ paddingHorizontal: 12, paddingBottom: 8, gap: 10 }}>
                        {(item as any).subtaskCategories.map((category: any) => (
                            <View key={category.id} style={{
                                borderWidth: 1,
                                borderColor: activeTheme === 'dark' ? APP_COLORS.border.dark : APP_COLORS.border.light,
                                borderRadius: 8,
                                overflow: 'hidden'
                            }}>
                                {/* Cabeçalho da categoria */}
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    paddingHorizontal: 10,
                                    paddingVertical: 8,
                                    backgroundColor: activeTheme === 'dark' ? APP_COLORS.background.dark : APP_COLORS.background.gray
                                }}>
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: '600',
                                        color: activeTheme === 'dark' ? APP_COLORS.text.light : APP_COLORS.text.secondary,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5
                                    }}>
                                        {category.name}
                                    </Text>
                                    <Text style={{
                                        fontSize: 11,
                                        color: activeTheme === 'dark' ? APP_COLORS.text.muted : APP_COLORS.text.light
                                    }}>
                                        {category.subtasks?.filter((st: any) => st.done).length || 0}/{category.subtasks?.length || 0}
                                    </Text>
                                </View>

                                {/* Lista de subtarefas da categoria */}
                                {Array.isArray(category.subtasks) && category.subtasks.length > 0 && (
                                    <View style={{
                                        paddingHorizontal: 10,
                                        paddingVertical: 8,
                                        gap: 6,
                                        backgroundColor: activeTheme === 'dark' ? APP_COLORS.background.darkGray : APP_COLORS.background.white
                                    }}>
                                        {category.subtasks.map((st: any) => (
                                            <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Pressable
                                                    onPress={() => onToggleSubtask(st.id, category.id)}
                                                    style={[
                                                        styles.checkbox,
                                                        st.done && styles.checkboxCompleted,
                                                        shouldDisableCheckbox && styles.checkboxDisabled
                                                    ]}
                                                    disabled={shouldDisableCheckbox}
                                                >
                                                    {st.done && <Ionicons name="checkmark" size={16} color={APP_COLORS.text.white} />}
                                                </Pressable>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <Text style={[
                                                            styles.taskDescription,
                                                            st.done && styles.taskDescriptionCompleted,
                                                            { flexShrink: 1 }
                                                        ]}>
                                                            {st.title || 'Subtarefa'}
                                                        </Text>
                                                        {st.done && st.completedByName && (
                                                            <Text style={[styles.authorshipText, { fontSize: 10, marginLeft: 8 }]}>
                                                                {`por ${st.completedByName}`}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    {/* Horário da subtarefa */}
                                                    {(st.dueTime || st.dueDate) && (
                                                        <View style={styles.subtaskScheduleInfo}>
                                                            <Ionicons name="time-outline" size={12} color={APP_COLORS.text.light} />
                                                            <Text style={styles.subtaskScheduleText}>
                                                                {st.dueDate ? `${formatDate(st.dueDate)} ` : ''}{formatTime(st.dueTime)}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* Indicador de status de aprovação */}
                {item.status === 'pendente_aprovacao' && (
                    <View style={styles.approvalStatus}>
                        <Ionicons name="hourglass-outline" size={16} color={APP_COLORS.status.warning} />
                        <Text style={styles.approvalStatusText}>Pendente Aprovação</Text>
                    </View>
                )}
                {item.status === 'aprovada' && (
                    <View style={[styles.approvalStatus, styles.approvalStatusApproved]}>
                        <Ionicons name="checkmark-circle" size={16} color={APP_COLORS.status.success} />
                        <Text style={[styles.approvalStatusText, styles.approvalStatusTextApproved]}>Aprovada</Text>
                    </View>
                )}
                {item.status === 'rejeitada' && (
                    <View style={[styles.approvalStatus, styles.approvalStatusRejected]}>
                        <Ionicons name="close-circle" size={16} color={APP_COLORS.status.error} />
                        <Text style={[styles.approvalStatusText, styles.approvalStatusTextRejected]}>Rejeitada</Text>
                    </View>
                )}

                {/* Informações de Autoria - Compactas */}
                <View style={styles.authorshipInfo}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.authorshipRow}>
                            <Ionicons name="person-outline" size={12} color={APP_COLORS.text.light} />
                            <Text style={styles.authorshipText}>
                                {`${sanitizedCreatedByName || 'Usuário'} • ${formatDateTime(item.createdAt)}`}
                            </Text>
                        </View>
                        {item.editedBy && sanitizedEditedByName && (
                            <View style={styles.authorshipRow}>
                                <Ionicons name="pencil-outline" size={12} color={APP_COLORS.text.light} />
                                <Text style={styles.authorshipText}>
                                    {`Editado por ${sanitizedEditedByName}${item.editedAt ? ` • ${formatDateTime(item.editedAt)}` : ''}`}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Botões de ação: sempre clicáveis; handlers validam permissão em runtime */}
                    {(user.role === 'admin' || user.role === 'dependente') && (
                        (() => {
                            const isFamilyTask = (item as any).familyId && (item as any).private !== true;
                            const selfMember = familyMembers.find(m => m.id === user.id);
                            // Preferir permissões efetivas; se ausentes, cair para permissões locais
                            const perms = (myEffectivePerms ?? (selfMember as any)?.permissions) || {};
                            // Visual: só mostrar como desativado se soubermos explicitamente que NÃO pode (false).
                            // Quando indefinido (ainda sincronizando), exibimos ativo (o handler fará o enforcement).
                            const visualCanEdit = user.role === 'admin' || (user.role === 'dependente' && isFamilyTask && perms.edit !== false);
                            const visualCanDelete = user.role === 'admin' || (user.role === 'dependente' && isFamilyTask && perms.delete !== false);
                            return (
                                <View style={styles.scheduleActions}>
                                    <Pressable
                                        onPress={onEdit}
                                        style={[styles.scheduleActionButton, !visualCanEdit && { opacity: 0.5 }]}
                                    >
                                        <Ionicons name="pencil-outline" size={14} color={visualCanEdit ? APP_COLORS.primary.main : APP_COLORS.text.light} />
                                    </Pressable>
                                    <Pressable
                                        onPress={onDelete}
                                        style={[styles.scheduleActionButton, !visualCanDelete && { opacity: 0.5 }]}
                                    >
                                        <Ionicons name="trash-outline" size={14} color={visualCanDelete ? APP_COLORS.status.error : APP_COLORS.border.light} />
                                    </Pressable>
                                </View>
                            );
                        })()
                    )}
                </View>
            </>
        )}
    </View>
);
};

const getStyles = (activeTheme: string) => StyleSheet.create({
    taskItem: {
        backgroundColor: activeTheme === 'dark' ? APP_COLORS.background.darkGray : APP_COLORS.background.white,
        borderRadius: 12,
        marginHorizontal: 0,
        marginBottom: 12,
        padding: 0,
        shadowColor: APP_COLORS.shadow.dark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: activeTheme === 'dark' ? APP_COLORS.border.dark : APP_COLORS.border.light,
        overflow: 'hidden',
        alignSelf: 'stretch',
        width: '100%',
    },
    taskCompleted: {
        opacity: 0.6,
        backgroundColor: activeTheme === 'dark' ? APP_COLORS.background.dark : APP_COLORS.background.gray,
    },
    taskOverdue: {
        borderColor: APP_COLORS.status.error,
        borderWidth: 1,
    },
    categoryHeader: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: activeTheme === 'dark' ? 0 : 1,
        borderBottomColor: activeTheme === 'dark' ? 'transparent' : APP_COLORS.border.light,
    },
    categoryHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryHeaderText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    categoryHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    taskCardHeader: {
        padding: 12,
        paddingBottom: 8,
    },
    taskMainContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    checkboxContainer: {
        marginRight: 12,
        marginTop: 2,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: activeTheme === 'dark' ? APP_COLORS.text.white : APP_COLORS.primary.main,
        backgroundColor: activeTheme === 'dark' ? 'transparent' : APP_COLORS.background.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxCompleted: {
        backgroundColor: APP_COLORS.primary.main,
        borderColor: APP_COLORS.primary.main,
    },
    checkboxDisabled: {
        backgroundColor: activeTheme === 'dark' ? 'transparent' : APP_COLORS.background.lightGray,
        borderColor: activeTheme === 'dark' ? APP_COLORS.border.medium : APP_COLORS.border.medium,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: activeTheme === 'dark' ? APP_COLORS.text.white : APP_COLORS.text.primary,
        lineHeight: 22,
        marginBottom: 3,
    },
    taskDescription: {
        fontSize: 13,
        color: activeTheme === 'dark' ? APP_COLORS.text.light : APP_COLORS.text.secondary,
        lineHeight: 18,
        marginTop: 3,
    },
    taskDescriptionCompleted: {
        textDecorationLine: 'line-through',
        color: activeTheme === 'dark' ? APP_COLORS.text.muted : APP_COLORS.text.light,
    },
    unlockIconButton: {
        padding: 8,
        marginLeft: 8,
    },
    scheduleInfo: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        paddingBottom: 12,
        gap: 6,
        borderTopWidth: activeTheme === 'dark' ? 0 : 1,
        borderTopColor: activeTheme === 'dark' ? 'transparent' : APP_COLORS.border.light,
        paddingTop: 8,
    },
    scheduleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: activeTheme === 'dark' ? APP_COLORS.border.dark : APP_COLORS.background.gray,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: activeTheme === 'dark' ? 0 : 1,
        borderColor: activeTheme === 'dark' ? 'transparent' : APP_COLORS.border.light,
    },
    scheduleText: {
        fontSize: 11,
        color: activeTheme === 'dark' ? APP_COLORS.text.white : APP_COLORS.text.primary,
        marginLeft: 3,
        fontWeight: '600',
    },
    overdueText: {
        color: APP_COLORS.status.error,
    },
    overdueIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: activeTheme === 'dark' ? `${APP_COLORS.status.error}33` : APP_COLORS.status.errorLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: APP_COLORS.status.error,
        gap: 4,
    },
    overdueLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: APP_COLORS.status.error,
    },
    subtaskScheduleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        marginLeft: 2,
    },
    subtaskScheduleText: {
        fontSize: 10,
        color: activeTheme === 'dark' ? APP_COLORS.text.light : APP_COLORS.text.light,
        marginLeft: 4,
        fontStyle: 'italic',
    },
    approvalStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: activeTheme === 'dark' ? `${APP_COLORS.status.warning}33` : APP_COLORS.status.warningLight,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginHorizontal: 12,
        marginBottom: 8,
        borderRadius: 8,
        gap: 8,
    },
    approvalStatusText: {
        fontSize: 12,
        fontWeight: '600',
        color: APP_COLORS.status.warningDark,
    },
    approvalStatusApproved: {
        backgroundColor: activeTheme === 'dark' ? `${APP_COLORS.status.success}33` : APP_COLORS.status.successLight,
    },
    approvalStatusTextApproved: {
        color: APP_COLORS.status.successDark,
    },
    approvalStatusRejected: {
        backgroundColor: activeTheme === 'dark' ? `${APP_COLORS.status.error}33` : APP_COLORS.status.errorLight,
    },
    approvalStatusTextRejected: {
        color: APP_COLORS.status.errorDark,
    },
    authorshipInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: activeTheme === 'dark' ? APP_COLORS.background.dark : APP_COLORS.background.gray,
        borderTopWidth: 1,
        borderTopColor: activeTheme === 'dark' ? APP_COLORS.border.dark : APP_COLORS.border.light,
    },
    authorshipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    authorshipText: {
        fontSize: 10,
        color: activeTheme === 'dark' ? APP_COLORS.text.muted : APP_COLORS.text.light,
    },
    scheduleActions: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 'auto',
    },
    scheduleActionButton: {
        backgroundColor: activeTheme === 'dark' ? APP_COLORS.border.dark : APP_COLORS.background.white,
        borderWidth: 1,
        borderColor: activeTheme === 'dark' ? APP_COLORS.border.medium : APP_COLORS.border.light,
        borderRadius: 6,
        padding: 6,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 4,
    },
});
