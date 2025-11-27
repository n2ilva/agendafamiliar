import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/theme.context';
import { getHeaderStyles } from '../header/header.styles';
import { sanitizeInviteCode } from '../../utils/validators/family.utils';
import Alert from '../../utils/helpers/alert';

interface JoinFamilyModalProps {
  visible: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<void>;
}

export const JoinFamilyModal: React.FC<JoinFamilyModalProps> = ({
  visible,
  onClose,
  onJoin,
}) => {
  const { colors } = useTheme();
  const styles = getHeaderStyles(colors);
  const [familyCode, setFamilyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setFamilyCode('');
      setCodeError(null);
    }
  }, [visible]);

  const handleJoin = async () => {
    const code = sanitizeInviteCode(familyCode);
    if (code.length !== 6) {
      Alert.alert('Código inválido', 'O código deve ter exatamente 6 caracteres (A–Z e 0–9).');
      return;
    }
    
    setLoading(true);
    try {
      await onJoin(code);
      onClose();
      Alert.alert('Sucesso', 'Você entrou na nova família.');
    } catch (e: any) {
      const msg = e?.message || 'Não foi possível entrar na família.';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Entrar em outra família</Text>
          <TextInput
            style={styles.input}
            value={familyCode}
            onChangeText={(text) => {
              const sanitized = sanitizeInviteCode(text);
              setFamilyCode(sanitized);
              if (sanitized.length > 0 && sanitized.length < 6) {
                setCodeError('O código deve ter 6 caracteres.');
              } else {
                setCodeError(null);
              }
            }}
            placeholder="Código da família (6 caracteres)"
            placeholderTextColor="#999"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
          />
          {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}
          <View style={styles.modalButtons}>
            <Pressable 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </Pressable>
            <Pressable 
              style={[
                styles.modalButton,
                styles.saveButton,
                (loading || sanitizeInviteCode(familyCode).length !== 6) && styles.buttonDisabled
              ]} 
              onPress={handleJoin}
              disabled={loading || sanitizeInviteCode(familyCode).length !== 6}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Entrar</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
