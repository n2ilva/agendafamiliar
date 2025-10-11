import LocalAuthService from './LocalAuthService';

// Simple adapter: re-export LocalAuthService under the old name for compatibility
export const FirebaseAuthService = LocalAuthService as unknown as any;
export default FirebaseAuthService;