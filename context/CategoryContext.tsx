import { addDoc, collection, deleteDoc, doc, getFirestore, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { app } from '../config/firebase';

let nativeFirestore: any = null;
try {
  if (Platform.OS !== 'web') {
    nativeFirestore = require('@react-native-firebase/firestore').default;
  }
} catch {}

export interface CategoryData {
  id: string;
  name: string;
  color: string;
  icon?: string; // opcional para futura expansão
  createdAt?: any;
}

interface CategoryContextData {
  categories: CategoryData[];
  addCategory: (name: string, color: string, icon?: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  loading: boolean;
}

const CategoryContext = createContext<CategoryContextData>({} as CategoryContextData);

export const useCategories = () => useContext(CategoryContext);

export const CategoryProvider = ({ children }: { children: React.ReactNode }) => {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  const colRef = useMemo(() => {
    if (nativeFirestore) return nativeFirestore().collection('categories');
    const db = getFirestore(app);
    return collection(db, 'categories');
  }, []);

  useEffect(() => {
    let unsub: any;
    if (nativeFirestore) {
      unsub = colRef.orderBy('createdAt', 'asc').onSnapshot((snap: any) => {
        const data: CategoryData[] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        setCategories(data);
        setLoading(false);
      }, () => setLoading(false));
    } else {
      const db = getFirestore(app);
      const q = query(colRef, orderBy('createdAt', 'asc'));
      unsub = onSnapshot(q, (snap) => {
        const data: CategoryData[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        setCategories(data);
        setLoading(false);
      }, () => setLoading(false));
    }
    return () => unsub && unsub();
  }, [colRef]);

  // Seed inicial de categorias padrão se não existirem (executa quando carregamento termina e lista vazia)
  useEffect(() => {
    if (!loading && categories.length === 0) {
      const seed = [
        { name: 'Família', color: '#1565c0', icon: 'home' },
        { name: 'Trabalho', color: '#c62828', icon: 'work' },
        { name: 'Escola', color: '#2e7d32', icon: 'school' },
        { name: 'Eventos', color: '#f9a825', icon: 'event' },
        { name: 'Compras', color: '#ff6d00', icon: 'shopping-cart' },
      ];
      (async () => {
        for (const s of seed) {
          try {
            await addCategory(s.name, s.color, s.icon);
          } catch {}
        }
      })();
    }
  }, [loading, categories]);

  const addCategory = async (name: string, color: string, icon?: string) => {
    const payload: any = { name, color, icon: icon || null, createdAt: nativeFirestore ? nativeFirestore.FieldValue.serverTimestamp() : new Date().toISOString() };
    if (nativeFirestore) {
      await colRef.add(payload);
    } else {
      await addDoc(colRef, payload);
    }
  };

  const deleteCategory = async (id: string) => {
    if (nativeFirestore) {
      await colRef.doc(id).delete();
    } else {
      const db = getFirestore(app);
      await deleteDoc(doc(db, 'categories', id));
    }
  };

  return (
    <CategoryContext.Provider value={{ categories, addCategory, deleteCategory, loading }}>
      {children}
    </CategoryContext.Provider>
  );
};
