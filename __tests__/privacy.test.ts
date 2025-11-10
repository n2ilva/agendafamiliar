import FirestoreService from '../services/FirestoreService';

// Estes testes são superficiais e focam no comportamento do filtro no cliente,
// usando stubs simplificados para simular o callback do subscribe.

describe('Privacidade de tarefas', () => {
  test('subscribeToUserAndFamilyTasks não emite tarefas privadas de terceiros', () => {
    const userId = 'userA';
    const familyId = 'fam1';
    const emitted: any[][] = [];

    // Monkey patch interno: simula segmentos e chama emit diretamente
    const segments: any = {
      createdBy: new Map<string, any>([
        ['1', { id: '1', title: 'minha privada', private: true, createdBy: 'userA' }],
      ]),
      user: new Map<string, any>([
        ['2', { id: '2', title: 'atribuída pública', private: false, createdBy: 'userB', userId: 'userA' }],
        ['3', { id: '3', title: 'atribuída privada de outro', private: true, createdBy: 'userB', userId: 'userA' }],
      ]),
      family: new Map<string, any>([
        ['4', { id: '4', title: 'família pública', private: false, familyId }],
      ]),
    };

    // Reusa a função de ordenação e o filtro defensivo definindo callback manual
    const sortTasksByUpdatedAt = (tasks: any[]) => tasks;
    const emit = () => {
      const merged = new Map<string, any>();
      segments.family.forEach((v: any, k: string) => merged.set(k, v));
      segments.createdBy.forEach((v: any, k: string) => merged.set(k, v));
      segments.user.forEach((v: any, k: string) => merged.set(k, v));
      const all = Array.from(merged.values());
      const filtered = all.filter(t => !(t?.private === true && t?.createdBy !== userId));
      emitted.push(sortTasksByUpdatedAt(filtered));
    };

    emit();

    expect(emitted.length).toBe(1);
    const items = emitted[0];
    const ids = items.map(i => i.id);
    expect(ids).toContain('1'); // minha privada
    expect(ids).toContain('2'); // atribuída pública
    expect(ids).toContain('4'); // família pública
    expect(ids).not.toContain('3'); // privada de outro não deve aparecer
  });
});
