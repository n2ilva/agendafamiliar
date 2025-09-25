import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AVAILABLE_ICONS, AVAILABLE_COLORS, createCustomCategory } from '../constants/categories';

export default function AddCategoryModal({ visible, onClose, onSave }) {
  const [categoryName, setCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('document');
  const [selectedColor, setSelectedColor] = useState('#8E8E93');

  const resetForm = () => {
    setCategoryName('');
    setSelectedIcon('document');
    setSelectedColor('#8E8E93');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = () => {
    if (!categoryName.trim()) {
      Alert.alert('Erro', 'Por favor, digite um nome para a categoria.');
      return;
    }

    const newCategory = createCustomCategory(categoryName.trim(), selectedIcon, selectedColor);
    onSave(newCategory);
    resetForm();
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelButton}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Nova Categoria</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={[styles.saveButton, !categoryName.trim() && styles.disabledSaveButton]}>
              Salvar
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Preview da categoria */}
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>Visualização</Text>
            <View style={[styles.categoryPreview, { backgroundColor: selectedColor }]}>
              <Ionicons name={selectedIcon} size={20} color="#fff" />
              <Text style={styles.categoryPreviewText}>
                {categoryName || 'Nome da categoria'}
              </Text>
            </View>
          </View>

          {/* Nome da categoria */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nome da Categoria</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Digite o nome da categoria"
              value={categoryName}
              onChangeText={setCategoryName}
              maxLength={20}
              autoFocus
            />
          </View>

          {/* Seleção de ícone */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escolher Ícone</Text>
            <Text style={styles.sectionSubtitle}>Arraste para ver mais ícones →</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.iconScrollContainer}
              contentContainerStyle={styles.iconContainer}
            >
              {AVAILABLE_ICONS.map(iconName => (
                <TouchableOpacity
                  key={iconName}
                  style={[
                    styles.iconOption,
                    selectedIcon === iconName && styles.selectedIconOption
                  ]}
                  onPress={() => setSelectedIcon(iconName)}
                >
                  <Ionicons 
                    name={iconName} 
                    size={24} 
                    color={selectedIcon === iconName ? '#007AFF' : '#666'}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Seleção de cor */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escolher Cor</Text>
            <View style={styles.colorContainer}>
              {AVAILABLE_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColorOption
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#FF3B30',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledSaveButton: {
    color: '#ccc',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  previewSection: {
    marginBottom: 30,
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
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  categoryPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    minWidth: 120,
  },
  categoryPreviewText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  iconScrollContainer: {
    maxHeight: 60,
  },
  iconContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  selectedIconOption: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: '#333',
  },
});