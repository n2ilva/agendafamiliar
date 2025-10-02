import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getDb } from './firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

/* Category shape: { id, name, color, icon, createdAt } */

const CategoryContext = createContext(null);

export function CategoryProvider({ children }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setCategories([]); setLoading(false); return; }
    const db = getDb();
    const col = collection(db, 'categories');
    const unsub = onSnapshot(col, snap => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a,b)=>a.name.localeCompare(b.name));
      setCategories(list);
      setLoading(false);
      // seed se vazio
      if (list.length === 0) {
        seedDefaults();
      }
    });
    return () => unsub();
  }, [user]);

  const seedDefaults = useCallback(async () => {
    const presets = [
      { name: 'Trabalho', color: '#2563eb', icon: '💼' },
      { name: 'Saúde', color: '#16a34a', icon: '💊' },
      { name: 'Estudos', color: '#9333ea', icon: '📚' }
    ];
    for (const p of presets) {
      await addDoc(collection(getDb(), 'categories'), { ...p, createdAt: Date.now() });
    }
  }, []);

  const createCategory = useCallback(async (name, color, icon='⭐') => {
    if (!user) return;
    const db = getDb();
    await addDoc(collection(db, 'categories'), { name, color, icon, createdAt: Date.now() });
  }, [user]);

  const renameCategory = useCallback(async (categoryId, name) => {
    const db = getDb();
    await updateDoc(doc(db, 'categories', categoryId), { name });
  }, []);

  const value = { categories, loading, createCategory, renameCategory };
  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategories() { return useContext(CategoryContext); }
