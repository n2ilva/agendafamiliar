// Mockar config/firebase para evitar importar 'react-native' durante testes (Node environment)
import sharedMocks from './mocks';

// Mock config/firebase para retornar factory compatível
jest.mock('../config/firebase', () => ({
  firebaseFirestore: () => ({}),
  firebaseAuth: () => ({ currentUser: { uid: 'u1' } })
}));

// Mock do SDK firestore usando mocks compartilhados
jest.mock('firebase/firestore', () => (sharedMocks.mockFirestoreSdk));

// Usar require para compatibilidade com Jest transform sem recursos TS no arquivo de teste
const FirestoreService = require('../services/FirestoreService').default || require('../services/FirestoreService');

describe('FirestoreService (unit)', () => {
  test('saveTask sets familyId to null when undefined and returns id', async () => {
    const task = {
      title: 'Test task',
      userId: 'user1'
      // familyId omitted -> should be converted to null
    };

    // Spy on addDoc
    const firestore = require('firebase/firestore');
    const addDocSpy = jest.spyOn(firestore, 'addDoc').mockImplementation(async (col, data) => {
      return { id: 'mocked-id' };
    });

    const res = await FirestoreService.saveTask(task);
    expect(res).toHaveProperty('id', 'mocked-id');
    expect(addDocSpy).toHaveBeenCalled();
  const calledWith = addDocSpy.mock.calls[0][1] as any;
  expect(calledWith.familyId).toBeNull();

    addDocSpy.mockRestore();
  });

  test('getTasksByUser returns array of docs', async () => {
    const firestore = require('firebase/firestore');
    const getDocsSpy = jest.spyOn(firestore, 'getDocs').mockImplementation(async (q) => {
      return {
        docs: [ { id: '1', data: () => ({ title: 'a' }) } ]
      };
    });

    const result = await FirestoreService.getTasksByUser('u1');
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('id', '1');

    getDocsSpy.mockRestore();
  });
});
