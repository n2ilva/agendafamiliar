import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, Modal, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { APP_COLORS } from '../../../../constants/colors';

interface IOSDateTimePickerProps {
  visible: boolean;
  mode: 'date' | 'time';
  value: Date;
  onChange: (date: Date) => void;
  onDone: () => void;
  onClose: () => void;
  minimumDate?: Date;
  colors: any;
}

export const IOSDateTimePicker = memo(function IOSDateTimePicker({
  visible,
  mode,
  value,
  onChange,
  onDone,
  onClose,
  minimumDate,
  colors,
}: IOSDateTimePickerProps) {
  if (!visible || Platform.OS !== 'ios') return null;

  const handleChange = useCallback((_: any, selectedDate?: Date) => {
    if (selectedDate) {
      onChange(selectedDate);
    }
  }, [onChange]);

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Pressable onPress={onDone} style={styles.doneButton}>
              <Text style={styles.doneText}>Concluído</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={value}
            mode={mode}
            display="spinner"
            onChange={handleChange}
            minimumDate={minimumDate}
            locale="pt-BR"
            textColor={colors.textPrimary}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
});

interface AndroidDateTimePickerProps {
  visible: boolean;
  mode: 'date' | 'time';
  value: Date;
  onChange: (date: Date | undefined) => void;
  onClose: () => void;
  minimumDate?: Date;
}

export const AndroidDateTimePicker = memo(function AndroidDateTimePicker({
  visible,
  mode,
  value,
  onChange,
  onClose,
  minimumDate,
}: AndroidDateTimePickerProps) {
  if (!visible || Platform.OS !== 'android') return null;

  const handleChange = useCallback((_: any, selectedDate?: Date) => {
    onClose();
    onChange(selectedDate);
  }, [onChange, onClose]);

  return (
    <DateTimePicker
      value={value}
      mode={mode}
      display="default"
      onChange={handleChange}
      minimumDate={minimumDate}
    />
  );
});

interface WebDateTimePickerProps {
  visible: boolean;
  mode: 'date' | 'time';
  value: Date;
  onChange: (date: Date) => void;
  onDone: () => void;
  onClose: () => void;
  colors: any;
}

export const WebDateTimePicker = memo(function WebDateTimePicker({
  visible,
  mode,
  value,
  onChange,
  onDone,
  onClose,
  colors,
}: WebDateTimePickerProps) {
  if (!visible || Platform.OS !== 'web') return null;

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatTimeForInput = (date: Date) => {
    return date.toTimeString().slice(0, 5);
  };

  const handleDateChange = (e: any) => {
    const newDate = new Date(e.target.value + 'T12:00:00');
    onChange(newDate);
  };

  const handleTimeChange = (e: any) => {
    const [hours, minutes] = e.target.value.split(':');
    const newDate = new Date(value);
    newDate.setHours(parseInt(hours), parseInt(minutes));
    onChange(newDate);
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.webContainer, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.webTitle, { color: colors.textPrimary }]}>
            {mode === 'date' ? 'Selecione a Data' : 'Selecione a Hora'}
          </Text>
          
          {mode === 'date' ? (
            <input
              type="date"
              value={formatDateForInput(value)}
              onChange={handleDateChange}
              style={styles.webInput as any}
            />
          ) : (
            <input
              type="time"
              value={formatTimeForInput(value)}
              onChange={handleTimeChange}
              style={styles.webInput as any}
            />
          )}
          
          <View style={styles.webButtons}>
            <Pressable style={styles.webCancelButton} onPress={onClose}>
              <Text style={styles.webCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.webDoneButton} onPress={onDone}>
              <Text style={styles.webDoneText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doneText: {
    color: APP_COLORS.primary.main,
    fontSize: 17,
    fontWeight: '600',
  },
  // Web styles
  webContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -150 }, { translateY: -100 }],
    width: 300,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  webTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  webInput: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  webButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  webCancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  webCancelText: {
    color: '#666',
    fontSize: 16,
  },
  webDoneButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: APP_COLORS.primary.main,
    alignItems: 'center',
  },
  webDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
