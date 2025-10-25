// Mocks compartilhados para os testes
export const mockFirebaseFirestore = () => ({
  // stub de coleções/docs usado pelos testes
});

export const mockFirebaseAuth = () => ({ });

export const mockFirestoreSdk = {
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  setDoc: jest.fn(async () => ({})),
  addDoc: jest.fn(async (col: any, data: any) => ({ id: 'mocked-id' })),
  getDoc: jest.fn(async () => ({})),
  getDocs: jest.fn(async () => ({ docs: [ { id: '1', data: () => ({ title: 'a' }) } ] })),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  onSnapshot: jest.fn((q: any, cb: any) => { return () => {}; }),
  deleteDoc: jest.fn(async () => ({})),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  orderBy: jest.fn(() => ({})),
};

export const mockConnectivityService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  addConnectivityListener: jest.fn((cb: any) => {}),
  getCurrentState: jest.fn(() => ({ isConnected: false })),
  isConnected: jest.fn(() => false),
  cleanup: jest.fn(() => {})
};

export const mockLocalStorageService = {
  cleanupOldOperations: jest.fn().mockResolvedValue(undefined),
  getOfflineData: jest.fn().mockResolvedValue({ pendingOperations: [], tasks: {}, users: {}, families: {}, approvals: {}, history: {}, lastSync: 0 }),
  getPendingOperations: jest.fn().mockResolvedValue([]),
  removePendingOperation: jest.fn().mockResolvedValue(undefined),
  incrementOperationRetry: jest.fn().mockResolvedValue(undefined),
  updateLastSync: jest.fn().mockResolvedValue(undefined),
  saveTask: jest.fn().mockResolvedValue(undefined),
  saveUser: jest.fn().mockResolvedValue(undefined)
};

// Minimal familyService mock to simulate invite code flows in tests
export const mockFamilyService = (() => {
  const families: Record<string, any> = {};

  return {
    createFamily: jest.fn(async (name: string, adminUser: any) => {
      const id = `mock_family_${Date.now()}`;
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      const family = {
        id,
        name,
        adminId: adminUser.id,
        members: [{ ...adminUser, role: 'admin', familyId: id, joinedAt: new Date() }],
        createdAt: new Date(),
        inviteCode: code,
        inviteCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
      families[id] = family;
      return family;
    }),
    joinFamily: jest.fn(async (inviteCode: string, user: any) => {
      const found = Object.values(families).find((f:any) => (f.inviteCode || '').toLowerCase() === (inviteCode||'').toLowerCase());
      if (!found) throw new Error('Código inválido');
      found.members.push({ ...user, role: 'dependente', familyId: found.id, joinedAt: new Date() });
      return found;
    }),
    getUserFamily: jest.fn(async (userId: string) => {
      return Object.values(families).find((f:any) => f.members.some((m:any)=> m.id === userId)) || null;
    }),
    saveFamilyTask: jest.fn(async () => undefined)
  };
})();

export default {
  mockFirebaseFirestore,
  mockFirebaseAuth,
  mockFirestoreSdk,
  mockConnectivityService,
  mockLocalStorageService
};
