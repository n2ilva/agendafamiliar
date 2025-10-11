// Runner simples para executar os testes de regras com jest
const { spawnSync } = require('child_process');
const path = require('path');

function runJestViaNpx() {
  const root = path.resolve(__dirname, '..');
  const cmd = 'npx jest --runInBand --testPathPattern=tests/';
  const res = spawnSync(cmd, { stdio: 'inherit', cwd: root, shell: true });
  process.exit(res.status || 0);
}

try {
  // tentar usar API do jest se disponível
  const { runCLI } = require('jest');
  (async () => {
    const root = path.resolve(__dirname, '..');
    const config = {
      roots: [root],
      testMatch: ['**/tests/**/*.test.js'],
      runInBand: true
    };
    const { results } = await runCLI(config, [root]);
    if (!results || results.numFailedTests > 0) process.exit(1);
    process.exit(0);
  })().catch(err => {
    console.error(err);
    runJestViaNpx();
  });
} catch (e) {
  // jest não disponível via require -> usar npx jest
  runJestViaNpx();
}
