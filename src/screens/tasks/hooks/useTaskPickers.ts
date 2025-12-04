import { useState, useRef, useCallback } from 'react';
import { Keyboard } from 'react-native';
import logger from '../../../utils/helpers/logger';

export interface PickerState {
  showDatePicker: boolean;
  showTimePicker: boolean;
  showSubtaskDatePicker: boolean;
  showSubtaskTimePicker: boolean;
}

export interface UseTaskPickersReturn {
  // Estados dos pickers
  showDatePicker: boolean;
  showTimePicker: boolean;
  showSubtaskDatePicker: boolean;
  showSubtaskTimePicker: boolean;
  
  // Refs para valores intermediários
  pickerDateValueRef: React.MutableRefObject<Date>;
  pickerTimeValueRef: React.MutableRefObject<Date>;
  pickerSubtaskDateValueRef: React.MutableRefObject<Date>;
  pickerSubtaskTimeValueRef: React.MutableRefObject<Date>;
  
  // Ações
  openDatePicker: (initialDate?: Date) => void;
  openTimePicker: (initialTime?: Date) => void;
  openSubtaskDatePicker: (initialDate?: Date) => void;
  openSubtaskTimePicker: (initialTime?: Date) => void;
  closeAllPickers: () => void;
  
  // Handlers para mudanças
  handleDateChange: (date: Date) => void;
  handleTimeChange: (time: Date) => void;
  handleSubtaskDateChange: (date: Date) => void;
  handleSubtaskTimeChange: (time: Date) => void;
}

export function useTaskPickers(): UseTaskPickersReturn {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSubtaskDatePicker, setShowSubtaskDatePicker] = useState(false);
  const [showSubtaskTimePicker, setShowSubtaskTimePicker] = useState(false);

  // Refs para valores intermediários (evita re-renders durante seleção)
  const pickerDateValueRef = useRef<Date>(new Date());
  const pickerTimeValueRef = useRef<Date>(new Date());
  const pickerSubtaskDateValueRef = useRef<Date>(new Date());
  const pickerSubtaskTimeValueRef = useRef<Date>(new Date());

  const openDatePicker = useCallback((initialDate?: Date) => {
    try { Keyboard.dismiss(); } catch {}
    pickerDateValueRef.current = initialDate || new Date();
    setShowDatePicker(true);
    logger.debug('PICKERS', 'DatePicker aberto');
  }, []);

  const openTimePicker = useCallback((initialTime?: Date) => {
    try { Keyboard.dismiss(); } catch {}
    pickerTimeValueRef.current = initialTime || new Date();
    setShowTimePicker(true);
    logger.debug('PICKERS', 'TimePicker aberto');
  }, []);

  const openSubtaskDatePicker = useCallback((initialDate?: Date) => {
    try { Keyboard.dismiss(); } catch {}
    pickerSubtaskDateValueRef.current = initialDate || new Date();
    setShowSubtaskDatePicker(true);
    logger.debug('PICKERS', 'SubtaskDatePicker aberto');
  }, []);

  const openSubtaskTimePicker = useCallback((initialTime?: Date) => {
    try { Keyboard.dismiss(); } catch {}
    pickerSubtaskTimeValueRef.current = initialTime || new Date();
    setShowSubtaskTimePicker(true);
    logger.debug('PICKERS', 'SubtaskTimePicker aberto');
  }, []);

  const closeAllPickers = useCallback(() => {
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowSubtaskDatePicker(false);
    setShowSubtaskTimePicker(false);
    logger.debug('PICKERS', 'Todos os pickers fechados');
  }, []);

  const handleDateChange = useCallback((date: Date) => {
    pickerDateValueRef.current = date;
  }, []);

  const handleTimeChange = useCallback((time: Date) => {
    pickerTimeValueRef.current = time;
  }, []);

  const handleSubtaskDateChange = useCallback((date: Date) => {
    pickerSubtaskDateValueRef.current = date;
  }, []);

  const handleSubtaskTimeChange = useCallback((time: Date) => {
    pickerSubtaskTimeValueRef.current = time;
  }, []);

  return {
    showDatePicker,
    showTimePicker,
    showSubtaskDatePicker,
    showSubtaskTimePicker,
    pickerDateValueRef,
    pickerTimeValueRef,
    pickerSubtaskDateValueRef,
    pickerSubtaskTimeValueRef,
    openDatePicker,
    openTimePicker,
    openSubtaskDatePicker,
    openSubtaskTimePicker,
    closeAllPickers,
    handleDateChange,
    handleTimeChange,
    handleSubtaskDateChange,
    handleSubtaskTimeChange,
  };
}
