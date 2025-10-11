// Teste de integração (mocked) para fluxo offline->online do SyncService
// Mock config/firebase para evitar inicializar SDK em Node
jest.mock('../config/firebase', () => ({
  firebaseFirestore: {},
  firebaseAuth: {},
  firebaseStorage: {}
}));
jest.mock('../services/LocalStorageService');
jest.mock('../services/ConnectivityService');
jest.mock('../services/LocalAuthService');
jest.mock('../services/FirestoreService');

// We'll require modules inside the test after jest.resetModules() to ensure mocks are applied

describe('SyncService integration (mocked) offline->online', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('processa operações pendentes e chama Firestore ao ficar online', async () => {
    // Provide explicit mock implementations before requiring modules to ensure SyncService receives them
    // Use shared mocks
    const shared = require('./mocks').default;

    jest.doMock('../services/ConnectivityService', () => (shared.mockConnectivityService));
    jest.doMock('../services/LocalStorageService', () => (shared.mockLocalStorageService));
    jest.doMock('../services/LocalAuthService', () => ({ getUserFromLocalStorage: jest.fn().mockResolvedValue({ id: 'user1', uid: 'user1' }) }));
    jest.doMock('../services/FirestoreService', () => ({
      saveTask: jest.fn().mockResolvedValue({ id: 'remote_t1' }),
      addHistoryItem: jest.fn().mockResolvedValue({ id: 'h1' }),
      getTasksByUser: jest.fn().mockResolvedValue([]),
      getTasksByFamily: jest.fn().mockResolvedValue([]),
      subscribeToUserAndFamilyTasks: jest.fn().mockReturnValue(() => {})
    }));

    // Mock firebase config to be compatible with lazy getters
    jest.mock('../config/firebase', () => ({ firebaseFirestore: () => ({}) }));
    jest.mock('firebase/firestore', () => require('./mocks').default.mockFirestoreSdk);

    const LocalStorageService = require('../services/LocalStorageService');
    const ConnectivityService = require('../services/ConnectivityService');
    const LocalAuthService = require('../services/LocalAuthService');
    const FirestoreService = require('../services/FirestoreService');
    const SyncService = require('../services/SyncService').default || require('../services/SyncService');

  // Preparar usuário - garantir que função exista como mock
  LocalAuthService.getUserFromLocalStorage = jest.fn().mockResolvedValue({ id: 'user1', uid: 'user1' });

    // Operação pendente: criar task
    const pendingOp = {
      id: 'pending_1',
      type: 'create',
      collection: 'tasks',
      data: { id: 't1', title: 'local task', userId: 'user1' },
      timestamp: Date.now(),
      retry: 0
    };

    LocalStorageService.getPendingOperations = jest.fn().mockResolvedValue([pendingOp]);
    LocalStorageService.getOfflineData = jest.fn().mockResolvedValue({ pendingOperations: [pendingOp], tasks: {}, users: {}, families: {}, approvals: {}, history: {}, lastSync: 0 });

    // Inicialmente offline -> depois online
    ConnectivityService.isConnected = jest.fn().mockReturnValue(false);
    ConnectivityService.getCurrentState = jest.fn().mockReturnValue({ isConnected: false });

    // Garantir que FirestoreService.saveTask é uma função mock
    FirestoreService.saveTask = jest.fn().mockResolvedValue({ id: 'remote_t1' });

    // Start SyncService.initialize (não irá processar ainda)
    await SyncService.initialize();

    // Agora simular retorno online
    ConnectivityService.isConnected = jest.fn().mockReturnValue(true);
    ConnectivityService.getCurrentState = jest.fn().mockReturnValue({ isConnected: true });

    // Simular chamada de handler de conectividade que triggers sync
    await SyncService['handleConnectivityChange']({ isConnected: true });

    // Verificar que FirestoreService.saveTask foi chamado
    expect(FirestoreService.saveTask).toHaveBeenCalled();
  });
});
