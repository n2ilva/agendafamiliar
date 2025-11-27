import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryConfig } from '../../../types/family.types';
import { APP_COLORS } from '../../../constants/colors';

interface CategorySelectorProps {
  categories: CategoryConfig[];
  selectedCategory: string;
  onSelect: (categoryId: string) => void;
  onAddCategory: () => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategory,
  onSelect,
  onAddCategory
}) => {
  return (
    <View style={styles.categorySelectorContainer}>
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categorySelectorScroll}
        style={styles.categorySelectorScrollView}
        decelerationRate="fast"
      >
        {categories.filter(cat => cat.id !== 'all').map((category) => (
          <Pressable
            key={category.id}
            style={[
              styles.categorySelector,
              selectedCategory === category.id && styles.categorySelectorActive,
              { 
                borderColor: category.color,
                backgroundColor: selectedCategory === category.id ? category.color : category.bgColor
              }
            ]}
            onPress={() => onSelect(category.id)}
          >
            <Ionicons 
              name={category.icon as any} 
              size={16} 
              color={selectedCategory === category.id ? APP_COLORS.text.white : category.color} 
            />
            <Text style={[
              styles.categorySelectorText,
              { color: selectedCategory === category.id ? APP_COLORS.text.white : category.color }
            ]}>
              {category.name}
            </Text>
          </Pressable>
        ))}
        
        {/* Botão Nova Categoria no final da lista */}
        <Pressable
          style={styles.addCategoryButton}
          onPress={onAddCategory}
        >
          <Ionicons name="add-circle" size={16} color={APP_COLORS.primary.main} />
          <Text style={styles.addCategoryText}>Nova</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  categorySelectorContainer: {
    marginBottom: 16,
  },
  categorySelectorScrollView: {
    maxHeight: 40,
  },
  categorySelectorScroll: {
    paddingRight: 16,
    gap: 8,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    height: 32,
  },
  categorySelectorActive: {
    borderWidth: 0,
  },
  categorySelectorText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: APP_COLORS.background.gray,
    height: 32,
  },
  addCategoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: APP_COLORS.primary.main,
    marginLeft: 6,
  },
});
