(async () => {
  try {
    const svcModule = require('../services/LocalFamilyService');
    const svc = svcModule.familyService || svcModule.default;
    const fam = await svc.createFamily('TesteFam', {
      id: 'u1',
      name: 'User One',
      role: 'admin',
      isGuest: false,
      joinedAt: new Date()
    });
    console.log('CREATED:', fam.id, fam.inviteCode, fam.inviteCodeExpiry);

    const joined = await svc.joinFamily(fam.inviteCode, {
      id: 'u2',
      name: 'User Two',
      role: 'dependente',
      isGuest: false,
      joinedAt: new Date()
    });
    console.log('JOINED:', joined.id, joined.members.map(m => ({ id: m.id, role: m.role })));
  } catch (e) {
    console.error('ERR', e && e.message ? e.message : e);
    process.exit(1);
  }
})();
