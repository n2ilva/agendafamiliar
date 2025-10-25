// Mock global do SDK firebase/firestore usado em testes
const addDoc = jest.fn(async (col, data) => ({ id: 'mocked-id' }));
const getDocs = jest.fn(async (q) => ({ docs: [ { id: 'remote-1', data: () => ({ title: 'remote task', userId: 'user1', familyId: null, createdAt: new Date(), updatedAt: new Date() }) } ] }));
const onSnapshot = jest.fn((q, cb) => {
  // retorna função de unsubscribe
  return () => {};
});
module.exports = {
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  setDoc: jest.fn(async () => ({})),
  addDoc,
  getDoc: jest.fn(async () => ({})),
  getDocs,
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  onSnapshot,
  deleteDoc: jest.fn(async () => ({})),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  orderBy: jest.fn(() => ({})),
  // expose spies for tests
  __mocks: {
    addDoc,
    getDocs,
    onSnapshot
  }
};
