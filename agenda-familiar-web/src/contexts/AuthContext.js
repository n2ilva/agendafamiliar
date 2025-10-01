'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import firebaseService from '../services/firebase';

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
  const [userType, setUserType] = useState('member');
  const [familyId, setFamilyId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only run Firebase auth listener on client side
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    let unsubscribe = () => {};
    
    const setupAuthListener = async () => {
      try {
        const service = await firebaseService();
        unsubscribe = service.onAuthStateChange(async (firebaseUser) => {
          if (firebaseUser) {
            // Load user data from localStorage
            const savedUserType = localStorage.getItem('userType') || 'member';
            const savedFamilyId = localStorage.getItem('familyId');

            setUser(firebaseUser);
            setUserType(savedUserType);
            setFamilyId(savedFamilyId);
          } else {
            setUser(null);
            setUserType('member');
            setFamilyId(null);
          }
          setLoading(false);
        });
      } catch (error) {
        console.error('Error setting up auth listener:', error);
        setLoading(false);
      }
    };

    setupAuthListener();

    return () => unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Cannot sign in on server side' };
    }

    setLoading(true);
    try {
      const service = await firebaseService();
      const result = await service.signIn(email, password);
      if (result.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }

      // Load user preferences after successful login
      const savedUserType = localStorage.getItem('userType') || 'member';
      const savedFamilyId = localStorage.getItem('familyId');

      setUser(result.user);
      setUserType(savedUserType);
      setFamilyId(savedFamilyId);
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const signUp = async (email, password, selectedUserType = 'member') => {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Cannot sign up on server side' };
    }

    setLoading(true);
    try {
      const service = await firebaseService();
      const result = await service.signUp(email, password);
      if (result.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }

      // Save user type
      localStorage.setItem('userType', selectedUserType);
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
    if (typeof window === 'undefined') {
      return { success: false, error: 'Cannot sign in with Google on server side' };
    }

    setLoading(true);
    try {
      const service = await firebaseService();
      const result = await service.signInWithGoogle();
      if (result.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }

      // Load user preferences after successful login
      const savedUserType = localStorage.getItem('userType') || 'member';
      const savedFamilyId = localStorage.getItem('familyId');

      setUser(result.user);
      setUserType(savedUserType);
      setFamilyId(savedFamilyId);
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    if (typeof window === 'undefined') {
      return { success: false, error: 'Cannot logout on server side' };
    }

    setLoading(true);
    try {
      const service = await firebaseService();
      const result = await service.logout();
      if (result.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }

      // Clear local data
      localStorage.removeItem('userType');
      localStorage.removeItem('familyId');

      setUser(null);
      setUserType('member');
      setFamilyId(null);
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
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
    setUserType,
    setFamilyId
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};