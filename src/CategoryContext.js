import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getDb } from './firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

/* Category shape: { id, name, color, createdAt } */

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
    });
    return () => unsub();
  }, [user]);

  const createCategory = useCallback(async (name, color) => {
    if (!user) return;
    const db = getDb();
    await addDoc(collection(db, 'categories'), { name, color, createdAt: Date.now() });
  }, [user]);

  const renameCategory = useCallback(async (categoryId, name) => {
    const db = getDb();
    await updateDoc(doc(db, 'categories', categoryId), { name });
  }, []);

  const value = { categories, loading, createCategory, renameCategory };
  return <CategoryContext.Provider value={value}>{children}</CategoryContext.Provider>;
}

export function useCategories() { return useContext(CategoryContext); }
