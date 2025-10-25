// Mock config/firebase antes de importar LocalFamilyService
jest.mock('../config/firebase', () => {
  const mockTimestamp = {
    fromDate: jest.fn((date: Date) => ({ toDate: () => date, seconds: Math.floor(date.getTime() / 1000) })),
    now: jest.fn(() => ({ toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000) }))
  };

  const mockDb: any = {
    collection: jest.fn(() => mockDb),
    doc: jest.fn(() => mockDb),
    id: 'mock_family_id_123'
  };

  return {
    firebaseFirestore: () => mockDb,
    firebaseAuth: () => ({ currentUser: { uid: 'test_user' } })
  };
});

// Mock firebase/firestore com Timestamp e storage em memória
jest.mock('firebase/firestore', () => {
  const mockTimestamp = {
    fromDate: jest.fn((date: Date) => ({ 
      toDate: () => date, 
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0 
    })),
    now: jest.fn(() => ({ 
      toDate: () => new Date(), 
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0 
    }))
  };

  let familyStore: Record<string, any> = {};
  let inviteStore: Record<string, any> = {};
  let memberStore: Record<string, Record<string, any>> = {};

  return {
    collection: jest.fn((db: any, path?: string) => ({ _path: path || 'root', _db: db })),
    doc: jest.fn((dbOrCol: any, ...parts: string[]) => {
      const id = parts[parts.length - 1] || `generated_${Date.now()}_${Math.random()}`;
      const pathParts = dbOrCol._path ? [dbOrCol._path, ...parts] : parts;
      return { 
        id, 
        _path: pathParts.join('/'),
        _parts: pathParts
      };
    }),
    setDoc: jest.fn(async (ref: any, data: any) => {
      const path = ref._path || ref.id;
      console.log('🔧 [Mock setDoc]', path, Object.keys(data));
      
      if (path.includes('/members/')) {
        const parts = path.split('/');
        const familyIdx = parts.indexOf('families');
        if (familyIdx >= 0 && familyIdx + 1 < parts.length) {
          const familyId = parts[familyIdx + 1];
          const memberId = parts[parts.length - 1];
          if (!memberStore[familyId]) memberStore[familyId] = {};
          memberStore[familyId][memberId] = data;
          console.log('✅ [Mock] Membro salvo:', familyId, memberId);
        }
      } else if (path.startsWith('inviteCodes/')) {
        const code = path.split('/')[1];
        inviteStore[code] = data;
        console.log('✅ [Mock] Código salvo:', code);
      } else if (path.startsWith('families/') || path === 'families') {
        // Captura o ID do ref para salvar corretamente
        const familyId = ref.id;
        familyStore[familyId] = data;
        console.log('✅ [Mock] Família salva:', familyId);
      }
    }),
    getDoc: jest.fn(async (ref: any) => {
      const path = ref._path || ref.id;
      console.log('🔍 [Mock getDoc]', path);
      
      if (path.startsWith('inviteCodes/')) {
        const code = path.split('/')[1];
        const data = inviteStore[code];
        console.log('📋 [Mock] Código encontrado:', code, !!data);
        return {
          exists: () => !!data,
          data: () => data
        };
      } else if (path.includes('/members/')) {
        const parts = path.split('/');
        const familyIdx = parts.indexOf('families');
        if (familyIdx >= 0 && familyIdx + 1 < parts.length) {
          const familyId = parts[familyIdx + 1];
          const memberId = parts[parts.length - 1];
          const member = memberStore[familyId]?.[memberId];
          console.log('👤 [Mock] Membro:', familyId, memberId, !!member);
          return {
            exists: () => !!member,
            data: () => member
          };
        }
      } else if (path.startsWith('families/')) {
        const familyId = ref.id;
        const data = familyStore[familyId];
        console.log('🏠 [Mock] Família:', familyId, !!data);
        return {
          exists: () => !!data,
          data: () => data,
          id: familyId
        };
      }
      
      return { exists: () => false, data: () => undefined };
    }),
    getDocs: jest.fn(async (q: any) => {
      console.log('📚 [Mock getDocs]');
      // Simula query de membros - retorna membros de todas as famílias para simplificar
      const allMembers: any[] = [];
      Object.entries(memberStore).forEach(([familyId, members]) => {
        Object.entries(members).forEach(([memberId, data]) => {
          allMembers.push({
            id: memberId,
            data: () => data
          });
        });
      });
      console.log('📋 [Mock] Membros encontrados:', allMembers.length);
      return { docs: allMembers };
    }),
    query: jest.fn((col: any) => col),
    where: jest.fn(() => ({})),
    Timestamp: mockTimestamp,
    collectionGroup: jest.fn(() => ({}))
  };
});

import { familyService } from '../services/LocalFamilyService';

describe('LocalFamilyService - inviteCode & joinFamily', () => {
  test('createFamily generates inviteCode and expiry', async () => {
    const admin = { id: 'u1', name: 'Admin', email: 'admin@test.com' } as any;
    const f = await familyService.createFamily('MinhaFam', admin);
    
    expect(f).toBeDefined();
    expect(typeof f.inviteCode).toBe('string');
    expect(f.inviteCode).toBeTruthy();
    expect(f.inviteCode!.length).toBe(6);
    expect(f.inviteCodeExpiry).toBeDefined();
    
    const expiryDate = f.inviteCodeExpiry ? new Date(f.inviteCodeExpiry) : null;
    expect(expiryDate).not.toBeNull();
    if (expiryDate) expect(expiryDate.getTime()).toBeGreaterThan(Date.now());
  });

  test('joinFamily accepts valid inviteCode', async () => {
    const admin = { id: 'u2', name: 'Admin2', email: 'admin2@test.com' } as any;
    const f = await familyService.createFamily('Fam2', admin);

    expect(f.inviteCode).toBeTruthy();
    
    const child = { id: 'u3', name: 'Child', email: 'child@test.com' } as any;
    const joined = await familyService.joinFamily(f.inviteCode!, child);
    
    expect(joined).toBeDefined();
    expect(joined.members.some((m: any) => m.id === 'u3')).toBe(true);
  });
});
