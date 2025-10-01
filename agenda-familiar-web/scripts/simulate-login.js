#!/usr/bin/env node
/**
 * simulate-login.js
 * Simula login no Firebase Authentication via REST API
 * Uso:
 *   node scripts/simulate-login.js --email user@example.com --password secret
 *   ou colocar NEXT_PUBLIC_FIREBASE_API_KEY no .env.local e rodar sem args
 */

const { argv, env } = require('process');

// Use global fetch when available (Node 18+). If not, try to load node-fetch as a fallback.
let fetchFn;
if (typeof fetch !== 'undefined') {
  fetchFn = fetch;
} else {
  try {
    // node-fetch v2 supports CommonJS require
    // eslint-disable-next-line global-require
    fetchFn = require('node-fetch');
  } catch (e) {
    console.error('Fetch API não disponível no Node. Instale: npm install node-fetch@2');
    process.exit(2);
  }
}

function parseArgs() {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const email = args.email || env.NEXT_PUBLIC_FIREBASE_TEST_EMAIL || env.FIREBASE_TEST_EMAIL;
  const password = args.password || env.NEXT_PUBLIC_FIREBASE_TEST_PASSWORD || env.FIREBASE_TEST_PASSWORD;
  const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY || env.FIREBASE_API_KEY;

  if (!apiKey) {
    console.error('ERRO: é necessário fornecer a chave de API do Firebase em NEXT_PUBLIC_FIREBASE_API_KEY ou FIREBASE_API_KEY');
    process.exit(2);
  }

  if (!email || !password) {
    console.error('ERRO: forneça --email e --password ou defina FIREBASE_TEST_EMAIL/FIREBASE_TEST_PASSWORD no ambiente');
    process.exit(2);
  }

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const body = {
    email,
    password,
    returnSecureToken: true,
  };

  try {
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Login failed', data);
      process.exit(1);
    }

    console.log('Login successful');
    console.log('idToken:', data.idToken);
    console.log('refreshToken:', data.refreshToken);
    console.log('expiresIn:', data.expiresIn);
    process.exit(0);
  } catch (err) {
    console.error('Network or unexpected error:', err.message || err);
    process.exit(3);
  }
}

main();
