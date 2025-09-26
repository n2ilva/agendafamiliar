Como usar as Cloud Functions para enviar push notifications via Expo

1) Preparar o ambiente
 - Instale firebase-tools e faça login: `npm i -g firebase-tools` e `firebase login`
 - Dentro da pasta `functions` crie um package.json e instale dependências: `npm init -y && npm i node-fetch firebase-admin`

2) Adaptar `sendPushes.js` para Firebase Functions
 - Envolva a função `run` com `exports.sendPushes = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => { ... })`
 - Adicione `const functions = require('firebase-functions')` e ajuste inicialização do admin se necessário.

3) Deploy
 - No repositório raiz, execute `firebase init functions` e siga as instruções (escolha Node 18+)
 - Coloque o código adaptado em `functions/index.js` e rode `firebase deploy --only functions`

Exemplo de uso com a fila `pushQueue`:
 - Para enfileirar uma mensagem manualmente, adicione um documento em `pushQueue` com os campos `to`, `title`, `body`, `data`.
 - A Cloud Function agendada `processPushQueue` vai processar mensagens pendentes a cada 5 minutos.

Deploy rápido
 - No root: `firebase init functions` (escolha Node 18)
 - Substitua o arquivo `functions/index.js` com o conteúdo deste repo
 - `cd functions && npm install node-fetch firebase-admin firebase-functions`
 - `firebase deploy --only functions`

4) Segurança
 - Use regras de segurança no Firestore para proteger tokens.

Observação: Para receber notificações no dispositivo, o app precisa
registrar o token Expo e salvá-lo (já adicionamos `addPushTokenToUser` no FirebaseService
e o registro do token no `AuthContext` após login). Teste em builds reais.
