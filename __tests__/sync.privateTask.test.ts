// Teste para garantir que tarefas privadas tenham familyId === null
jest.mock('../config/firebase', () => ({ firebaseFirestore: {}, firebaseAuth: {}, firebaseStorage: {} }));
jest.mock('../services/LocalStorageService');
jest.mock('../services/ConnectivityService');
jest.mock('../services/LocalAuthService');
jest.mock('../services/FirestoreService');

describe('SyncService private task handling', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('tarefas privadas são enfileiradas com familyId null e não salvam em familyService', async () => {
    const shared = require('./mocks').default;

    jest.doMock('../services/ConnectivityService', () => ({ ...shared.mockConnectivityService }));
    // LocalStorage mocked
    jest.doMock('../services/LocalStorageService', () => ({
      ...shared.mockLocalStorageService,
      addPendingOperation: jest.fn().mockResolvedValue(undefined),
      getOfflineData: jest.fn().mockResolvedValue({ pendingOperations: [], tasks: {}, users: {}, families: {}, approvals: {}, history: {}, lastSync: 0 })
    }));

    const familyServiceMock = {
      saveFamilyTask: jest.fn().mockResolvedValue(undefined),
      getUserFamily: jest.fn().mockResolvedValue(null)
    };
    jest.doMock('../services/LocalFamilyService', () => (familyServiceMock));

    const FirestoreServiceMock = {
      saveTask: jest.fn().mockResolvedValue({ id: 'remote_id' })
    };
    jest.doMock('../services/FirestoreService', () => (FirestoreServiceMock));

    const ConnectivityService = require('../services/ConnectivityService');
    ConnectivityService.isConnected = jest.fn().mockReturnValue(false);

    const SyncService = require('../services/SyncService').default || require('../services/SyncService');
    const LocalStorageService = require('../services/LocalStorageService');

    // Construir uma tarefa privada
    const privateTask = { id: 't-private', title: 'Privada', userId: 'u1', private: true };

    // Chamar addOfflineOperation enquanto offline -> deve enfileirar com familyId === null
    await SyncService.addOfflineOperation('create', 'tasks', privateTask);

    expect(LocalStorageService.addPendingOperation).toHaveBeenCalled();
    const addedArg = LocalStorageService.addPendingOperation.mock.calls[0][0];
    // The queued data should have familyId === null
    expect(addedArg.data.familyId).toBeNull();

    // Verificar que familyService.saveFamilyTask NÃO foi chamado
    expect(familyServiceMock.saveFamilyTask).not.toHaveBeenCalled();
  });
});
