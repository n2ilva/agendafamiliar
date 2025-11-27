// ============= TIPOS DO FAMILYSETUPSCREEN =============

export type SetupStep = 'choose' | 'create-family' | 'join-family';

export interface FamilySetupScreenProps {
  onFamilySetup: (familyId: string) => void;
  onLogout: () => void;
  userEmail: string;
  userName: string;
  userId: string;
}

export interface SetupState {
  currentStep: SetupStep;
  familyName: string;
  familyCode: string;
  isLoading: boolean;
  lastInviteCode: string | null;
}

// ============= VALIDAÇÃO =============
export const validateFamilyName = (name: string): string | null => {
  if (!name.trim()) {
    return 'Por favor, insira o nome da família';
  }
  return null;
};

export const validateFamilyCode = (code: string): string | null => {
  if (!code.trim()) {
    return 'Por favor, insira o código da família';
  }
  return null;
};
