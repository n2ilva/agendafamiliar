import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { APP_COLORS } from '../../constants/colors';
import { RepeatType } from '../../types/family.types';

const THEME = {
  primary: APP_COLORS.primary.main,
  textPrimary: APP_COLORS.text.primary,
  textSecondary: APP_COLORS.text.secondary,
};

interface RepeatConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  repeatType: RepeatType;
  tempCustomDays: number[];
  onToggleDay: (day: number) => void;
  tempIntervalDays: number;
  setTempIntervalDays: (days: number) => void;
  tempDurationMonths: number;
  setTempDurationMonths: (months: number) => void;
  tempWeekly: boolean;
  setTempWeekly: (weekly: boolean) => void;
  tempWeeksCount: number;
  setTempWeeksCount: (weeks: number) => void;
  tempMonthly?: boolean;
  setTempMonthly?: (monthly: boolean) => void;
  tempMonthsCount?: number;
  setTempMonthsCount?: (months: number) => void;
  activeTheme: 'light' | 'dark';
}

export const RepeatConfigModal: React.FC<RepeatConfigModalProps> = ({
  visible,
  onClose,
  onSave,
  repeatType,
  tempCustomDays,
  onToggleDay,
  tempIntervalDays,
  setTempIntervalDays,
  tempDurationMonths,
  setTempDurationMonths,
  tempWeekly,
  setTempWeekly,
  tempWeeksCount,
  setTempWeeksCount,
  tempMonthly = false,
  setTempMonthly,
  tempMonthsCount = 1,
  setTempMonthsCount,
  activeTheme,
}) => {
  // Tipo de intervalo: 'days' | 'weeks' | 'months'
  const intervalMode = tempMonthly ? 'months' : (tempWeekly ? 'weeks' : 'days');
  
  const setIntervalMode = (mode: 'days' | 'weeks' | 'months') => {
    if (mode === 'days') {
      setTempWeekly(false);
      setTempMonthly?.(false);
    } else if (mode === 'weeks') {
      setTempWeekly(true);
      setTempMonthly?.(false);
      const currentDays = tempIntervalDays || 7;
      const weeks = Math.max(1, Math.round(currentDays / 7));
      setTempWeeksCount(weeks);
      setTempIntervalDays(weeks * 7);
    } else {
      setTempWeekly(false);
      setTempMonthly?.(true);
      setTempMonthsCount?.(tempMonthsCount || 1);
      // Sinalizar intervalo mensal com valor especial (30 * meses)
      setTempIntervalDays((tempMonthsCount || 1) * 30);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.smallModalBackdrop}
        onPress={onClose}
      >
        <Pressable style={styles.smallModalContent} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.smallModalTitle}>
            {repeatType === RepeatType.CUSTOM ? 'Repetir semanalmente' : 'Sistema de Repetição'}
          </Text>
          
          {repeatType === RepeatType.CUSTOM && (
            <View style={styles.customDaysSelector}>
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.dayButton,
                    tempCustomDays.includes(index) && styles.dayButtonActive
                  ]}
                  onPress={() => onToggleDay(index)}
                >
                  <Text style={[
                    styles.dayButtonText,
                    tempCustomDays.includes(index) && styles.dayButtonTextActive
                  ]}>
                    {day}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          
          {repeatType === RepeatType.INTERVAL && (
            <View style={{ gap: 12 }}>
              <Text style={styles.customDaysLabel}>Repetir a cada:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Pressable
                  style={[styles.toggleButton, intervalMode === 'days' && styles.toggleButtonActive]}
                  onPress={() => setIntervalMode('days')}
                >
                  <Text style={[styles.toggleButtonText, intervalMode === 'days' && styles.toggleButtonTextActive]}>Dias</Text>
                </Pressable>
                <Pressable
                  style={[styles.toggleButton, intervalMode === 'weeks' && styles.toggleButtonActive]}
                  onPress={() => setIntervalMode('weeks')}
                >
                  <Text style={[styles.toggleButtonText, intervalMode === 'weeks' && styles.toggleButtonTextActive]}>Semanas</Text>
                </Pressable>
                <Pressable
                  style={[styles.toggleButton, intervalMode === 'months' && styles.toggleButtonActive]}
                  onPress={() => setIntervalMode('months')}
                >
                  <Text style={[styles.toggleButtonText, intervalMode === 'months' && styles.toggleButtonTextActive]}>Meses</Text>
                </Pressable>
              </View>
              
              {intervalMode === 'days' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.customDaysLabel, { flex: 0, minWidth: 60 }]}>A cada</Text>
                  <TextInput
                    style={[styles.input, { width: 80, textAlign: 'center' }]}
                    keyboardType="number-pad"
                    value={String(tempIntervalDays || '')}
                    onChangeText={(v) => setTempIntervalDays(Math.max(1, parseInt(v || '0', 10) || 0))}
                    placeholder="dias"
                    placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                  />
                  <Text style={styles.customDaysLabel}>dia(s)</Text>
                </View>
              )}
              
              {intervalMode === 'weeks' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.customDaysLabel, { flex: 0, minWidth: 60 }]}>A cada</Text>
                  <TextInput
                    style={[styles.input, { width: 80, textAlign: 'center' }]}
                    keyboardType="number-pad"
                    value={String(tempWeeksCount || '')}
                    onChangeText={(v) => {
                      const w = Math.max(1, parseInt(v || '0', 10) || 0);
                      setTempWeeksCount(w);
                      setTempIntervalDays(w * 7);
                    }}
                    placeholder="semanas"
                    placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                  />
                  <Text style={styles.customDaysLabel}>semana(s)</Text>
                </View>
              )}

              {intervalMode === 'months' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.customDaysLabel, { flex: 0, minWidth: 60 }]}>A cada</Text>
                  <TextInput
                    style={[styles.input, { width: 80, textAlign: 'center' }]}
                    keyboardType="number-pad"
                    value={String(tempMonthsCount || '')}
                    onChangeText={(v) => {
                      const m = Math.max(1, parseInt(v || '0', 10) || 0);
                      setTempMonthsCount?.(m);
                      setTempIntervalDays(m * 30);
                    }}
                    placeholder="meses"
                    placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                  />
                  <Text style={styles.customDaysLabel}>mês(es)</Text>
                </View>
              )}
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <Text style={[styles.customDaysLabel, { flex: 0, minWidth: 60 }]}>Duração</Text>
                <TextInput
                  style={[styles.input, { width: 80, textAlign: 'center' }]}
                  keyboardType="number-pad"
                  value={String(tempDurationMonths || '')}
                  onChangeText={(v) => setTempDurationMonths(Math.max(0, parseInt(v || '0', 10) || 0))}
                  placeholder="∞"
                  placeholderTextColor={activeTheme === 'dark' ? '#888' : '#999'}
                />
                <Text style={styles.customDaysLabel}>mês(es) (0 = sem fim)</Text>
              </View>
            </View>
          )}
          
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <Pressable 
              style={[styles.button, styles.cancelButton]} 
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.saveButton]}
              onPress={onSave}
            >
              <Text style={styles.saveButtonText}>OK</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  smallModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallModalContent: {
    backgroundColor: APP_COLORS.background.white,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: APP_COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  smallModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: APP_COLORS.text.primary,
  },
  customDaysSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  dayButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: APP_COLORS.background.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border.light,
  },
  dayButtonActive: {
    backgroundColor: APP_COLORS.primary.main,
    borderColor: APP_COLORS.primary.dark,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: APP_COLORS.text.secondary,
  },
  dayButtonTextActive: {
    color: APP_COLORS.text.white,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: APP_COLORS.background.lightGray,
    borderWidth: 1,
    borderColor: APP_COLORS.border.light,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: APP_COLORS.primary.main,
    borderColor: APP_COLORS.primary.dark,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.text.secondary,
  },
  toggleButtonTextActive: {
    color: APP_COLORS.text.white,
  },
  customDaysLabel: {
    fontSize: 14,
    color: APP_COLORS.text.secondary,
  },
  input: {
    borderWidth: 1,
    borderColor: APP_COLORS.border.light,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: APP_COLORS.background.lightGray,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: APP_COLORS.background.lightGray,
  },
  cancelButtonText: {
    color: APP_COLORS.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: APP_COLORS.primary.main,
  },
  saveButtonText: {
    color: APP_COLORS.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
