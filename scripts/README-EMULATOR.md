# Testes de Regras Firestore (Emulator)

Passos para rodar os testes de regras localmente usando o Firebase Emulator e Jest:

1. Instalar dependências de desenvolvimento:

```bash
npm install --save-dev @firebase/rules-unit-testing jest ts-jest @types/jest
```

2. Iniciar o emulador do Firestore (a partir da raiz do projeto):

```bash
npx firebase-tools@latest emulators:start --only firestore
```

3. Em outra aba do terminal, rodar os testes:

```bash
npm run test:rules
```

Observações:
- O teste de exemplo `tests/firestore.rules.test.ts` usa um `projectId` de demo. Você pode ajustar conforme necessário.
- Se preferir, rode os testes com `npx jest --config ./jest.rules.config.cjs`.
