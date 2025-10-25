// Runner simples para executar os testes de regras com jest usando a config dedicada (TS)
const { spawnSync } = require('child_process');
const path = require('path');

(function run() {
  const root = path.resolve(__dirname, '..');
  const configPath = path.join(root, 'jest.rules.config.cjs');
  const jestCmd = `npx jest --config ${JSON.stringify(configPath)} --runInBand`;

  // Se a variável do emulador não estiver setada, usamos firebase emulators:exec para Firestore
  const hasEmulatorEnv = !!process.env.FIRESTORE_EMULATOR_HOST;
  const cmd = hasEmulatorEnv
    ? jestCmd
    : `npx firebase emulators:exec --only firestore --project demo-permissions "${jestCmd}"`;

  const res = spawnSync(cmd, { stdio: 'inherit', cwd: root, shell: true });
  process.exit(res.status ?? 0);
})();
