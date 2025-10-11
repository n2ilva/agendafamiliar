import AsyncStorage from '@react-native-async-storage/async-storage';
import { familyService } from '../services/LocalFamilyService';

describe('LocalFamilyService - inviteCode & joinFamily', () => {
  const FAMILIES_KEY = 'familyApp_families';

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('createFamily generates inviteCode and expiry', async () => {
    const admin = { id: 'u1', name: 'Admin' } as any;
    const f = await familyService.createFamily('MinhaFam', admin);
  expect(f).toBeDefined();
  expect(typeof f.inviteCode).toBe('string');
  expect(f.inviteCode).toBeTruthy();
  if (!f.inviteCode) throw new Error('inviteCode not set in test');
  expect(f.inviteCode.length).toBe(6);
  expect(f.inviteCodeExpiry).toBeDefined();
  const expiryDate = f.inviteCodeExpiry ? new Date(f.inviteCodeExpiry) : null;
  expect(expiryDate).not.toBeNull();
  if (expiryDate) expect(expiryDate.getTime()).toBeGreaterThan(Date.now());

    // also ensure it was persisted in AsyncStorage
    const raw = await AsyncStorage.getItem(FAMILIES_KEY);
    expect(raw).toBeTruthy();
    const families = JSON.parse(raw as string);
    expect(families[f.id]).toBeDefined();
    expect(families[f.id].inviteCode).toBe(f.inviteCode);
  });

  test('joinFamily accepts valid inviteCode and rejects expired', async () => {
    const admin = { id: 'u2', name: 'Admin2' } as any;
    const f = await familyService.createFamily('Fam2', admin);

    // join with correct code
  if (!f.inviteCode) throw new Error('inviteCode missing for join test');
  const joined = await familyService.joinFamily(f.inviteCode, { id: 'u3', name: 'Child' } as any);
  expect(joined.members.some((m:any) => m.id === 'u3')).toBe(true);

    // simulate expired code by directly writing families with past expiry
    const raw = await AsyncStorage.getItem(FAMILIES_KEY);
    const families = JSON.parse(raw as string);
    const fam = families[f.id];
    fam.inviteCodeExpiry = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h ago
    families[f.id] = fam;
    await AsyncStorage.setItem(FAMILIES_KEY, JSON.stringify(families));

  if (!f.inviteCode) throw new Error('inviteCode missing for expired test');
  await expect(familyService.joinFamily(f.inviteCode, { id: 'u4', name: 'Late' } as any)).rejects.toThrow('Código de convite inválido ou expirado');
  });
});
