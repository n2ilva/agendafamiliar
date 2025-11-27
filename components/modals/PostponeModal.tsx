import React from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    Platform,
    Vibration,
    StyleSheet,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { APP_COLORS } from '../../utils/colors';
import { formatDate, formatTime } from '../../utils/DateUtils';

const THEME = {
    primary: APP_COLORS.primary.main,
    danger: APP_COLORS.status.error,
    success: APP_COLORS.status.success,
    warning: APP_COLORS.status.warning,
    textPrimary: APP_COLORS.text.primary,
    textSecondary: APP_COLORS.text.secondary,
};

interface PostponeModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    taskTitle?: string;
    postponeDate: Date | null;
    postponeTime: Date | null;
    onDateChange: (event: any, selectedDate?: Date) => void;
    onTimeChange: (event: any, selectedDate?: Date) => void;
    onOpenDatePicker: () => void;
    onOpenTimePicker: () => void;
    showDatePicker: boolean;
    showTimePicker: boolean;
    postponeIsPast: boolean;
    hasChanged: boolean;
    pickerDateValue: Date;
    pickerTimeValue: Date;
}

export const PostponeModal: React.FC<PostponeModalProps> = ({
    visible,
    onClose,
    onConfirm,
    taskTitle,
    postponeDate,
    postponeTime,
    onDateChange,
    onTimeChange,
    onOpenDatePicker,
    onOpenTimePicker,
    showDatePicker,
    showTimePicker,
    postponeIsPast,
    hasChanged,
    pickerDateValue,
    pickerTimeValue
}) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.postponeModalContent}>
                    <Text style={styles.modalTitle}>Adiar Tarefa</Text>
                    <Text style={styles.modalSubtitle}>
                        {taskTitle}
                    </Text>

                    {/* Agendamento */}
                    <Text style={[styles.pickerLabel, { marginTop: 8 }]}>Agendamento</Text>
                    <View style={[
                        styles.dateTimeContainer,
                        Platform.OS === 'web' && styles.dateTimeContainerWeb
                    ]}>
                        {/* Botão de Data */}
                        <Pressable
                            style={[
                                styles.dateTimeButton,
                                Platform.OS === 'web' && styles.dateTimeButtonWeb
                            ]}
                            onPress={onOpenDatePicker}
                        >
                            <Ionicons name="calendar-outline" size={16} color="#666" />
                            <Text style={styles.dateTimeButtonText}>
                                {postponeDate ? formatDate(postponeDate) : 'Selecionar data'}
                            </Text>
                        </Pressable>

                        {/* Botão de Hora */}
                        <Pressable
                            style={[
                                styles.dateTimeButton,
                                Platform.OS === 'web' && styles.dateTimeButtonWeb
                            ]}
                            onPress={onOpenTimePicker}
                        >
                            <Ionicons name="time-outline" size={16} color="#666" />
                            <Text style={styles.dateTimeButtonText}>
                                {postponeTime ? formatTime(postponeTime) : 'Selecionar horário'}
                            </Text>
                        </Pressable>
                    </View>

                    {/* DateTimePicker para Data */}
                    {showDatePicker && (
                        <DateTimePicker
                            value={pickerDateValue}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                        />
                    )}

                    {/* DateTimePicker para Horário */}
                    {showTimePicker && (
                        <DateTimePicker
                            value={pickerTimeValue}
                            mode="time"
                            is24Hour={true}
                            display="default"
                            onChange={onTimeChange}
                        />
                    )}

                    {/* Aviso sutil se data/hora estiver no passado */}
                    {postponeIsPast && (
                        <Text style={styles.postponeWarningText}>
                            A nova data/horário está no passado.
                        </Text>
                    )}

                    {/* Botões de Ação */}
                    <View style={styles.modalButtons}>
                        <Pressable
                            style={[styles.button, styles.cancelButton]}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.button, styles.addButton, !hasChanged && styles.buttonDisabled]}
                            disabled={!hasChanged}
                            onPress={onConfirm}
                        >
                            <Text style={styles.addButtonText}>Confirmar</Text>
                        </Pressable>
                    </View>
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
        padding: 20,
    },
    postponeModalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 400,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
        color: '#333',
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    pickerLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        marginTop: 16,
    },
    dateTimeContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    dateTimeContainerWeb: {
        flexDirection: 'column',
    },
    dateTimeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    dateTimeButtonWeb: {
        width: '100%',
    },
    dateTimeButtonText: {
        fontSize: 14,
        color: '#333',
    },
    postponeWarningText: {
        fontSize: 12,
        color: '#FF9500',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 8,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    button: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    addButton: {
        backgroundColor: APP_COLORS.primary.main,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    addButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
});

