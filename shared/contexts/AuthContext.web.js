'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { USER_TYPES, hasPermission, canEditTask } from '../constants/userTypes';
import { saveData, loadData, saveFamilyData, loadFamilyData, saveGoogleCredential, loadGoogleCredential, removeGoogleCredential } from '../services/storage.web';
import firebaseService from '../services/firebase.web';
import { createFamily, addMemberToFamily, isFamilyMember, isFamilyAdmin } from '../constants/family';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(USER_TYPES.MEMBER);
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseService.onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Load user data from localStorage
        const savedUserType = await loadData('userType');
        const savedFamilyId = await loadData('familyId');

        setUser(firebaseUser);
        setUserType(savedUserType || USER_TYPES.MEMBER);
        setFamilyId(savedFamilyId);
      } else {
        setUser(null);
        setUserType(USER_TYPES.MEMBER);
        setFamilyId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const result = await firebaseService.signIn(email, password);
      if (result.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }

      // Load user preferences after successful login
      const savedUserType = await loadData('userType');
      const savedFamilyId = await loadData('familyId');

      setUser(result.user);
      setUserType(savedUserType || USER_TYPES.MEMBER);
      setFamilyId(savedFamilyId);
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const signUp = async (email, password, selectedUserType = USER_TYPES.MEMBER) => {
    setLoading(true);
    try {
      const result = await firebaseService.signUp(email, password);
      if (result.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }

      // Save user type
      await saveData('userType', selectedUserType);
      setUser(result.user);
      setUserType(selectedUserType);
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await firebaseService.signInWithGoogle();
      if (result.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }

      // Load user preferences after successful login
      const savedUserType = await loadData('userType');
      const savedFamilyId = await loadData('familyId');

      setUser(result.user);
      setUserType(savedUserType || USER_TYPES.MEMBER);
      setFamilyId(savedFamilyId);
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const result = await firebaseService.logout();
      if (result.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }

      // Clear local data
      await saveData('userType', null);
      await saveData('familyId', null);
      await removeGoogleCredential();

      setUser(null);
      setUserType(USER_TYPES.MEMBER);
      setFamilyId(null);
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const updateUserType = async (newUserType) => {
    try {
      await saveData('userType', newUserType);
      setUserType(newUserType);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const joinFamily = async (newFamilyId) => {
    try {
      // Verify family exists and user can join
      if (!isFamilyMember(newFamilyId, user.uid)) {
        return { success: false, error: 'Não autorizado a entrar nesta família' };
      }

      await saveData('familyId', newFamilyId);
      setFamilyId(newFamilyId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const createNewFamily = async (familyName) => {
    try {
      const newFamily = createFamily(familyName, user.uid);
      await saveFamilyData(newFamily.id, newFamily);
      await saveData('familyId', newFamily.id);
      setFamilyId(newFamily.id);
      return { success: true, family: newFamily };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const leaveFamily = async () => {
    try {
      await saveData('familyId', null);
      setFamilyId(null);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    userType,
    familyId,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    updateUserType,
    joinFamily,
    createNewFamily,
    leaveFamily,
    hasPermission: (permission) => hasPermission(userType, permission),
    canEditTask: (task) => canEditTask(userType, task, user?.uid),
    isFamilyAdmin: () => isFamilyAdmin(familyId, user?.uid)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};