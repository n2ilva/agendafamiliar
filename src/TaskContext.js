import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getDb } from './firebase';
import { collection, addDoc, onSnapshot, updateDoc, doc, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { useAuth } from './AuthContext';

/*
Task shape:
{
  id, title, description?, status: 'pending' | 'pending_approval' | 'completed',
  createdBy, completedBy?, createdAt, updatedAt, categoryId?, dueAt?
}
Rules:
- Kid ao marcar concluído => status: pending_approval
- Admin ao marcar concluído => status: completed
- Admin pode aprovar (pending_approval -> completed) ou devolver (pending_approval -> pending)
*/

const TaskContext = createContext(null);

export function TaskProvider({ children }) {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDocRef, setLastDocRef] = useState(null);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }
    const db = getDb();
    const baseQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(15));
    const unsub = onSnapshot(baseQuery, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setTasks(list);
      setLastDocRef(snap.docs[snap.docs.length -1] || null);
      setExhausted(snap.size < 15);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const createTask = useCallback(async (title, { categoryId=null, dueAt=null } = {}) => {
    if (!user) return;
    const db = getDb();
    await addDoc(collection(db, 'tasks'), {
      title,
      status: 'pending',
      createdBy: user.uid,
      categoryId,
      dueAt: dueAt ? (typeof dueAt === 'number' ? dueAt : new Date(dueAt).getTime()) : null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }, [user]);

  const toggleComplete = useCallback(async (task) => {
    if (!user || !profile) return;
    const db = getDb();
    const ref = doc(db, 'tasks', task.id);

    if (profile.role === 'admin') {
      // admin toggles between pending <-> completed (or approving)
      let nextStatus;
      if (task.status === 'completed') nextStatus = 'pending';
      else if (task.status === 'pending_approval') nextStatus = 'completed';
      else nextStatus = 'completed';
      await updateDoc(ref, { status: nextStatus, completedBy: nextStatus==='completed'? user.uid: null, updatedAt: Date.now() });
    } else {
      // kid attempting completion
      if (task.status === 'pending') {
        await updateDoc(ref, { status: 'pending_approval', updatedAt: Date.now() });
      } else if (task.status === 'pending_approval') {
        // kid cannot approve, maybe allow revert to pending
        await updateDoc(ref, { status: 'pending', updatedAt: Date.now() });
      }
    }
  }, [user, profile]);

  const approveTask = useCallback(async (task) => {
    if (!profile || profile.role !== 'admin') return;
    if (task.status !== 'pending_approval') return;
    const db = getDb();
    await updateDoc(doc(db, 'tasks', task.id), { status: 'completed', completedBy: user.uid, updatedAt: Date.now() });
  }, [profile, user]);

  const loadMore = useCallback(() => {
    if (!user || exhausted || !lastDocRef) return;
    const db = getDb();
    const moreQuery = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), startAfter(lastDocRef), limit(15));
    onSnapshot(moreQuery, (snap) => {
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      if (list.length === 0) { setExhausted(true); return; }
      setTasks(prev => [...prev, ...list]);
      setLastDocRef(snap.docs[snap.docs.length -1] || null);
      if (snap.size < 15) setExhausted(true);
    });
  }, [user, lastDocRef, exhausted]);

  const value = { tasks, loading, createTask, toggleComplete, approveTask, loadMore, exhausted };
  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() { return useContext(TaskContext); }
