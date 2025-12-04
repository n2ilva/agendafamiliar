// Auth context (legado - mantido para compatibilidade)
export { AuthProvider, useAuth } from './auth.context';

// Contextos separados para otimização de re-renders
export { useUser, useCurrentUser, useIsLoggedIn, useUserFamily, useUserRole } from './user.context';
export { useAuthActions, useLogout, useUpdateProfile, useFamilySetup } from './auth-actions.context';
export { useAppState, useAppReady, useAuthReady, useDataReady, useIsFullyReady } from './app-state.context';
export type { UserUpdatePayload } from './auth-actions.context';

// Outros contextos
export { ThemeProvider, useTheme } from './theme.context';
export { DIProvider, useDI, useService } from './di.context';
export { TaskProvider, useTaskContext } from './task.context';
export { ToastProvider, useToast } from './toast.context';
export type { ToastType, ToastMessage } from './toast.context';
