'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import firebaseService, { getUserFamilies } from '../services/firebase';
import { Family, FamilyUser, UserRole } from '../types/family';

interface AuthContextType {
  user: User | null;
  families: Family[];
  currentFamily: Family | null;
  currentUserRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  setCurrentFamily: (family: Family | null) => void;
  addFamily: (family: Family) => void;
  updateFamily: (family: Family) => void;
  refreshFamilies: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [families, setFamilies] = useState<Family[]>([]);
  const [currentFamily, setCurrentFamilyState] = useState<Family | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Load families for user
  const loadFamilies = async (userId: string) => {
    try {
      const result = await getUserFamilies(userId);
      if (result.error) {
        console.error('Error loading families:', result.error);
        setFamilies([]);
        return;
      }

      setFamilies(result.families);

      // Restore current family from localStorage or set first family
      const savedFamilyId = localStorage.getItem('currentFamilyId');
      let familyToSet: Family | null = null;

      if (savedFamilyId) {
        familyToSet = result.families.find(f => f.id === savedFamilyId) || null;
      }

      if (!familyToSet && result.families.length > 0) {
        familyToSet = result.families[0];
      }

      if (familyToSet) {
        setCurrentFamily(familyToSet);
      }
    } catch (error) {
      console.error('Error loading families:', error);
      setFamilies([]);
    }
  };

  // Set current family and update user role
  const setCurrentFamily = (family: Family | null) => {
    setCurrentFamilyState(family);
    
    if (family && user) {
      // Find user's role in this family
      const userInFamily = family.members.find(member => member.id === user.uid);
      setCurrentUserRole(userInFamily?.role || null);
      
      // Save to localStorage
      localStorage.setItem('currentFamilyId', family.id);
    } else {
      // If user has no family, they are considered ADMIN (can create families)
      setCurrentUserRole(families.length === 0 ? UserRole.ADMIN : null);
      localStorage.removeItem('currentFamilyId');
    }
  };

  // Add new family to the list
  const addFamily = (family: Family) => {
    setFamilies(prev => [...prev, family]);
    // Set as current family if it's the first one
    if (families.length === 0) {
      setCurrentFamily(family);
    }
  };

  // Update existing family in the list
  const updateFamily = (updatedFamily: Family) => {
    setFamilies(prev => prev.map(family => 
      family.id === updatedFamily.id ? updatedFamily : family
    ));
    
    // Update current family if it's the one being updated
    if (currentFamily && currentFamily.id === updatedFamily.id) {
      setCurrentFamily(updatedFamily);
    }
  };

  // Refresh families from server
  const refreshFamilies = async () => {
    if (user) {
      await loadFamilies(user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = firebaseService.onAuthStateChange(async (firebaseUser: User | null) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Load user's families
        await loadFamilies(firebaseUser.uid);
      } else {
        // Clear family data when user logs out
        setFamilies([]);
        setCurrentFamily(null);
        localStorage.removeItem('currentFamilyId');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Monitor families changes and set user role
  useEffect(() => {
    if (user && families.length === 0 && !currentFamily) {
      // If user is logged in but has no families, they get ADMIN role to create families
      setCurrentUserRole(UserRole.ADMIN);
    }
  }, [user, families, currentFamily]);

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await firebaseService.signIn(email, password);
      if (result.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }
      
      // Families will be loaded by the auth state change listener
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: (error as Error).message };
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await firebaseService.signUp(email, password);
      if (result.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }
      
      // Families will be loaded by the auth state change listener
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: (error as Error).message };
    }
  };

  const handleSignInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await firebaseService.signInWithGoogle();
      if (result.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }
      
      // Families will be loaded by the auth state change listener
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: (error as Error).message };
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      const result = await firebaseService.logout();
      if (result.error) {
        setLoading(false);
        return { success: false, error: result.error };
      }
      
      // Clear all family data
      setFamilies([]);
      setCurrentFamily(null);
      localStorage.removeItem('currentFamilyId');
      
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      return { success: false, error: (error as Error).message };
    }
  };

  const value: AuthContextType = {
    user,
    families,
    currentFamily,
    currentUserRole,
    loading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signInWithGoogle: handleSignInWithGoogle,
    logout: handleLogout,
    setCurrentFamily,
    addFamily,
    updateFamily,
    refreshFamilies
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};