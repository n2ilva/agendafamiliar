import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { APP_COLORS } from '../../utils/colors';
import { AVAILABLE_ICONS, AVAILABLE_COLORS } from '../../utils/TaskConstants';

const THEME = {
  primary: APP_COLORS.primary.main,
  textPrimary: APP_COLORS.text.primary,
  textSecondary: APP_COLORS.text.secondary,
};

interface AddCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  selectedIcon: string;
  setSelectedIcon: (icon: string) => void;
  selectedColorIndex: number;
  setSelectedColorIndex: (index: number) => void;
  activeTheme: 'light' | 'dark';
  colors: any;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  visible,
  onClose,
  onAdd,
  newCategoryName,
  setNewCategoryName,
  selectedIcon,
  setSelectedIcon,
  selectedColorIndex,
  setSelectedColorIndex,
  activeTheme,
  colors,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Nova Categoria</Text>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={24} color={APP_COLORS.text.secondary} />
              </Pressable>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                style={[styles.input, { 
                  color: colors.textPrimary,
                  backgroundColor: activeTheme === 'dark' ? APP_COLORS.background.darkGray : APP_COLORS.background.lightGray,
                  borderColor: activeTheme === 'dark' ? APP_COLORS.border.dark : APP_COLORS.border.light,
                }]}
                placeholder="Nome da categoria"
                placeholderTextColor={activeTheme === 'dark' ? APP_COLORS.text.muted : APP_COLORS.text.light}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                maxLength={20}
              />

              <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}>Ícone:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={Platform.OS === 'web'}
                style={[
                  styles.horizontalScrollContainer,
                  Platform.OS === 'web' && ({ overflow: 'scroll' } as any)
                ]}
                contentContainerStyle={styles.iconSelectorContainer}
              >
                {AVAILABLE_ICONS.map((icon) => (
                  <Pressable
                    key={icon}
                    style={[
                      styles.iconSelector,
                      { backgroundColor: activeTheme === 'dark' ? APP_COLORS.background.darkGray : APP_COLORS.background.lightGray },
                      selectedIcon === icon && { 
                        backgroundColor: APP_COLORS.primary.lighter,
                        borderColor: APP_COLORS.primary.main,
                        borderWidth: 2,
                      }
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                  >
                    <Ionicons 
                      name={icon as any} 
                      size={22} 
                      color={selectedIcon === icon ? APP_COLORS.primary.main : APP_COLORS.text.secondary} 
                    />
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}>Cor:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={Platform.OS === 'web'}
                style={[
                  styles.horizontalScrollContainer,
                  Platform.OS === 'web' && ({ overflow: 'scroll' } as any)
                ]}
                contentContainerStyle={styles.colorSelectorContainer}
              >
                {AVAILABLE_COLORS.map((colorConfig, index) => (
                  <Pressable
                    key={index}
                    style={[
                      styles.colorSelector,
                      { backgroundColor: colorConfig.color },
                      selectedColorIndex === index && styles.colorSelectorActive
                    ]}
                    onPress={() => setSelectedColorIndex(index)}
                  >
                    {selectedColorIndex === index && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.categoryPreview}>
                <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>Pré-visualização:</Text>
                <View style={[
                  styles.categoryPreviewItem,
                  { 
                    backgroundColor: AVAILABLE_COLORS[selectedColorIndex].bgColor,
                    borderColor: AVAILABLE_COLORS[selectedColorIndex].color
                  }
                ]}>
                  <Ionicons 
                    name={selectedIcon as any} 
                    size={16} 
                    color={AVAILABLE_COLORS[selectedColorIndex].color} 
                  />
                  <Text style={[
                    styles.categoryPreviewText,
                    { color: AVAILABLE_COLORS[selectedColorIndex].color }
                  ]}>
                    {newCategoryName || 'Nova Categoria'}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.button, styles.addButton]}
                onPress={onAdd}
              >
                <Text style={styles.addButtonText}>Criar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalScrollContent: {
    paddingBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  horizontalScrollContainer: {
    marginBottom: 16,
  },
  iconSelectorContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  iconSelector: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border.light,
  },
  colorSelectorContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  colorSelector: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelectorActive: {
    borderWidth: 3,
    borderColor: APP_COLORS.background.white,
    shadowColor: APP_COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  categoryPreview: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border.light,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryPreviewText: {
    fontSize: 15,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: APP_COLORS.background.lightGray,
  },
  cancelButtonText: {
    color: APP_COLORS.text.secondary,
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: APP_COLORS.primary.main,
  },
  addButtonText: {
    color: APP_COLORS.text.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
