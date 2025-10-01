"use client";

import React from 'react';
import { AuthProvider } from './AuthContext';

// Simple client-side wrapper to ensure server bundles don't try to resolve
// client-only dependencies during SSR/build.
export default function ClientAuthProvider({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}
