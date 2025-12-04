/**
 * Implementação Firestore do Repositório de Categorias
 * 
 * Princípios SOLID aplicados:
 * - Single Responsibility: Responsável apenas pela persistência de categorias
 * - Dependency Inversion: Implementa a interface ICategoryRepository
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { firebaseFirestore } from '../../config/firebase.config';

const firestore = firebaseFirestore as any;
import { ICategoryRepository } from '../../core/interfaces/repositories/ICategoryRepository';
import { Category, CategoryProps } from '../../core/domain/entities/Category';

// Categorias padrão do sistema - inicializadas via getters
let _defaultCategories: Category[] | null = null;

function getDefaultCategories(): Category[] {
  if (!_defaultCategories) {
    _defaultCategories = Category.getDefaults();
  }
  return _defaultCategories;
}

export class FirestoreCategoryRepository implements ICategoryRepository {
  private readonly collectionName = 'categories';

  private mapFirestoreToCategory(id: string, data: any): Category {
    const props: CategoryProps = {
      id,
      name: data.name,
      color: data.color,
      icon: data.icon,
      isDefault: data.isDefault || false,
      order: data.order || 999,
      createdBy: data.createdBy,
      familyId: data.familyId,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
    return Category.fromPersistence(props);
  }

  private mapCategoryToFirestore(category: Category): any {
    const obj = category.toObject();
    return {
      name: obj.name,
      color: obj.color,
      icon: obj.icon,
      isDefault: obj.isDefault,
      order: obj.order,
      createdBy: obj.createdBy,
      familyId: obj.familyId,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
    };
  }

  async findById(id: string, familyId?: string): Promise<Category | null> {
    try {
      // Verifica se é uma categoria padrão
      const defaultCategory = getDefaultCategories().find(cat => cat.id === id);
      if (defaultCategory) return defaultCategory;

      // Se não é padrão, busca na família
      if (!familyId) return null;

      const docRef = doc(firestore, `families/${familyId}/${this.collectionName}`, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      return this.mapFirestoreToCategory(docSnap.id, docSnap.data());
    } catch (error) {
      console.error('Error finding category by ID:', error);
      throw new Error('Failed to find category');
    }
  }

  async findAll(familyId?: string): Promise<Category[]> {
    try {
      const categories = [...getDefaultCategories()];

      // Se tem familyId, adiciona categorias customizadas
      if (familyId) {
        const customCategories = await this.findByFamily(familyId);
        categories.push(...customCategories);
      }

      return categories;
    } catch (error) {
      console.error('Error finding all categories:', error);
      throw new Error('Failed to find categories');
    }
  }

  async findDefaults(): Promise<Category[]> {
    return [...getDefaultCategories()];
  }

  async findByFamily(familyId: string): Promise<Category[]> {
    try {
      const categoriesRef = collection(
        firestore,
        `families/${familyId}/${this.collectionName}`
      );
      const snapshot = await getDocs(categoriesRef);

      return snapshot.docs.map(doc =>
        this.mapFirestoreToCategory(doc.id, doc.data())
      );
    } catch (error) {
      console.error('Error finding categories by family:', error);
      throw new Error('Failed to find family categories');
    }
  }

  async create(category: Category, familyId: string): Promise<Category> {
    try {
      const docRef = doc(
        firestore,
        `families/${familyId}/${this.collectionName}`,
        category.id
      );
      const data = this.mapCategoryToFirestore(category);

      await setDoc(docRef, data);

      return category;
    } catch (error) {
      console.error('Error creating category:', error);
      throw new Error('Failed to create category');
    }
  }

  async update(
    id: string,
    data: Partial<Category>,
    familyId: string
  ): Promise<Category> {
    try {
      // Não permite editar categorias padrão
      if (await this.isDefault(id)) {
        throw new Error('Cannot update default category');
      }

      const docRef = doc(
        firestore,
        `families/${familyId}/${this.collectionName}`,
        id
      );

      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.color) updateData.color = data.color;
      if (data.icon) updateData.icon = data.icon;

      await updateDoc(docRef, updateData);

      const updated = await this.findById(id, familyId);
      if (!updated) throw new Error('Category not found after update');

      return updated;
    } catch (error) {
      console.error('Error updating category:', error);
      throw new Error('Failed to update category');
    }
  }

  async delete(id: string, familyId: string): Promise<void> {
    try {
      // Não permite deletar categorias padrão
      if (await this.isDefault(id)) {
        throw new Error('Cannot delete default category');
      }

      const docRef = doc(
        firestore,
        `families/${familyId}/${this.collectionName}`,
        id
      );
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw new Error('Failed to delete category');
    }
  }

  async exists(id: string, familyId?: string): Promise<boolean> {
    const category = await this.findById(id, familyId);
    return category !== null;
  }

  async isDefault(id: string): Promise<boolean> {
    return getDefaultCategories().some(cat => cat.id === id);
  }

  subscribeToChanges(
    familyId: string,
    callback: (categories: Category[]) => void
  ): () => void {
    const categoriesRef = collection(
      firestore,
      `families/${familyId}/${this.collectionName}`
    );

    const unsubscribe = onSnapshot(
      categoriesRef,
      (snapshot) => {
        const customCategories = snapshot.docs.map(doc =>
          this.mapFirestoreToCategory(doc.id, doc.data())
        );

        // Combina categorias padrão com customizadas
        const allCategories = [...getDefaultCategories(), ...customCategories];
        callback(allCategories);
      },
      (error) => {
        console.error('Error in category subscription:', error);
      }
    );

    return unsubscribe;
  }
}
