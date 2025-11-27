import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryConfig } from '../../../types/family.types';
import { APP_COLORS } from '../../../constants/colors';

interface TaskFilterButtonProps {
  onPress: () => void;
  buttonRef: React.RefObject<View>;
}

export const TaskFilterButton: React.FC<TaskFilterButtonProps> = ({ onPress, buttonRef }) => {
  return (
    <Pressable 
      ref={buttonRef}
      style={styles.filterButton}
      onPress={onPress}
      android_ripple={{ color: `${APP_COLORS.primary.main}1A`, borderless: false }}
    >
      <Ionicons name="filter" size={18} color={APP_COLORS.primary.main} />
    </Pressable>
  );
};

interface TaskFilterDropdownProps {
  visible: boolean;
  onClose: () => void;
  position: { top: number; right: number };
  categories: CategoryConfig[];
  selectedCategory: string;
  onSelect: (categoryId: string) => void;
  onDeleteCategory: (categoryId: string) => void;
}

export const TaskFilterDropdown: React.FC<TaskFilterDropdownProps> = ({
  visible,
  onClose,
  position,
  categories,
  selectedCategory,
  onSelect,
  onDeleteCategory
}) => {
  if (!visible) return null;

  return (
    <>
      {/* Overlay para fechar dropdown */}
      <Pressable
        style={styles.dropdownOverlay}
        onPress={onClose}
        pointerEvents="auto"
      />
      
      <View style={[
        styles.filterDropdownMenuFloating,
        {
          top: position.top,
          right: position.right
        }
      ]} pointerEvents="auto">
        <ScrollView 
          style={{ maxHeight: 320 }} 
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {categories.map((category) => (
            <Pressable
              key={category.id}
              style={[
                styles.filterDropdownItem,
                selectedCategory === category.id && styles.filterDropdownItemActive
              ]}
              onPress={() => {
                onSelect(category.id);
                onClose();
              }}
            >
              <View style={{ 
                width: 32, 
                height: 32, 
                borderRadius: 8,
                backgroundColor: selectedCategory === category.id ? `${APP_COLORS.primary.main}15` : category.bgColor,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Ionicons 
                  name={category.icon as any} 
                  size={18} 
                  color={selectedCategory === category.id ? APP_COLORS.primary.main : category.color} 
                />
              </View>
              <Text style={[
                styles.filterDropdownItemText,
                selectedCategory === category.id && styles.filterDropdownItemTextActive
              ]}>
                {category.name}
              </Text>
              
              {selectedCategory === category.id && (
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: `${APP_COLORS.primary.main}15`,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Ionicons name="checkmark" size={16} color={APP_COLORS.primary.main} />
                </View>
              )}
              
              {!category.isDefault && (
                <Pressable
                  style={styles.deleteCategoryButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDeleteCategory(category.id);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={14} color={APP_COLORS.text.light} />
                </Pressable>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: APP_COLORS.background.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: APP_COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: APP_COLORS.border.light,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
    backgroundColor: 'transparent',
  },
  filterDropdownMenuFloating: {
    position: 'absolute',
    width: 220,
    backgroundColor: APP_COLORS.background.white,
    borderRadius: 16,
    padding: 8,
    shadowColor: APP_COLORS.shadow.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
    borderWidth: 1,
    borderColor: APP_COLORS.border.light,
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  filterDropdownItemActive: {
    backgroundColor: APP_COLORS.background.lightGray,
  },
  filterDropdownItemText: {
    flex: 1,
    fontSize: 14,
    color: APP_COLORS.text.secondary,
    marginLeft: 12,
    fontWeight: '500',
  },
  filterDropdownItemTextActive: {
    color: APP_COLORS.primary.main,
    fontWeight: '600',
  },
  deleteCategoryButton: {
    padding: 4,
    marginLeft: 4,
  },
});
